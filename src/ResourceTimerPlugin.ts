import { Plugin, SettingsTypes, UIManager, UIManagerScope } from "@ryelite/core";
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.js';
import { Mesh, Nullable, Vector4 } from "@babylonjs/core";
import createPie from './Pie';
import createTimer from './RespawnTimer';
import NPCRespawnTracker from './NPCRespawnTracker'
import OverlayTracker from "./OverlayTracker";

export default class ResourceTimerPlugin extends Plugin {
    pluginName = "Resource Timers";
    author: string = "Grandy";
    uiManager = new UIManager();
    timersContainer: HTMLDivElement | null = null;
    respawnTracker = new NPCRespawnTracker(this);
    overlayTracker = new OverlayTracker(this);

    constructor() {
        super();

        this.settings.radius = {
            text: 'Radius',
            description: 'The radius of the timer circle',
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 18,
            callback: () => {}
        };

        this.settings.borderRatio = {
            text: 'Border ratio',
            description: 'The ratio between circle radius and the width of the border. Bigger number = smaller border proportionally',
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 8,
            callback: () => {}
        };

        this.settings.fillColor = {
            text: 'Timer/pie color',
            type: SettingsTypes.color,
            value: "#FFD800",
            callback: () => {}
        };

        this.settings.borderColor = {
            text: 'Border color',
            type: SettingsTypes.color,
            value: "#FF6A00",
            callback: () => {}
        };

        this.settings.opacity = {
            text: 'Opacity',
            description: 'How transparent the timers are. 0 = transparent, 1 = opaque',
            type: SettingsTypes.range,
            min: 0,
            max: 1,
            value: 0.7,
            callback: () => {}
        };

        this.settings.respawnTimerFontSize = {
            text: 'Respawn timer font size',
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 14,
            callback: () => {}
        };
    }

    private getRespawnMillis(entity: any) {
        return Math.max(0, entity?._def?._respawnTicks - 1) * 600; // 600ms tickrate; using -1 from reported tickrate as this is what is seen in practise (??)
    }

    init(): void {
    }

    start(): void {
        this.log(this.pluginName + " started");

        this.timersContainer = this.uiManager.createElement(UIManagerScope.ClientRelative) as HTMLDivElement;
        if (this.timersContainer) {
            this.timersContainer.id = 'resource-timers';
            this.timersContainer.style.position = 'absolute';
            this.timersContainer.style.pointerEvents = 'none';
            this.timersContainer.style.zIndex = '1';
            this.timersContainer.style.overflow = 'hidden';
            this.timersContainer.style.width = '100%';
            this.timersContainer.style.height =
                'calc(100% - var(--titlebar-height))'; // Account for titlebar height
            this.timersContainer.style.top = 'var(--titlebar-height)'; // Position below titlebar
        }
    }

    SocketManager_handleEntityExhaustedResourcesPacket(e: any) {
        const worldEntityManager = this.gameHooks?.WorldEntityManager?.Instance;
        let worldEntity = worldEntityManager.getWorldEntityById(e[0]);
        let respawnTime = this.getRespawnMillis(worldEntity);
        
        if (worldEntity?._type && respawnTime) {
            //this.log(`Resource exhausted:`);
            //this.log(worldEntity);

            let name = worldEntity._name;
            let id = worldEntity._entityTypeId;
            let entityMesh = worldEntity?._appearance?._bjsMeshes[0];
            
            if (!entityMesh) {
                this.error(`No mesh found for '${name+id}'; not adding overlay`);
                return;
            }

            let pie: SVGElement;
            try {
                pie = createPie(this.settings, respawnTime, () => this.overlayTracker.remove(name, id));
                this.timersContainer?.appendChild(pie);
            } catch (error) {
                this.error(error);
                return;
            }
            
            this.overlayTracker.add(name, id, pie, entityMesh.getWorldMatrix());
        }
    }

    SocketManager_handleHitpointsCurrentLevelChangedPacket(e: any) {
        const entityManager = this.gameHooks?.EntityManager?.Instance;
        // entityType (NPC/Player), entityID, health
        let [ entityType, entityId, health ] = e;
        if (entityType === 2) { // NPC
            let entity = entityManager.getNPCByEntityId(entityId);
            let name = entity._name;
            if (entity && health === 0) {
                let respawnTime = (entity?._def?._combat?._respawnLength * 600) + 1200; // 600ms ticks, 2 tick before despawn
                this.log(`Entity '${name}' #${entityId} died (${respawnTime}ms respawn):`);
                //this.log(entity);
                this.log(entity?._appearance?._billboardMesh?.getWorldMatrix().toString())
                let matrix = this.respawnTracker.handleDeath(entityId);
                if (matrix) {
                    let timer: HTMLElement;
                    try {
                        timer = createTimer(this.settings, respawnTime, () => this.overlayTracker.remove(name, entityId));
                    } catch (error) {
                        this.log(error);
                        return;
                    }
                    this.log("Adding to container");
                    this.timersContainer?.appendChild(timer);
                    this.overlayTracker.add(name, entityId, timer, matrix);
                }
            }
        }
    }

    SocketManager_handleNPCEnteredChunkPacket(e: any) {
        const entityManager = this.gameHooks?.EntityManager?.Instance;
        let entityId = e[0];
        setTimeout(() => {
            let entity = entityManager.getNPCByEntityId(entityId);
            let name = entity._name;

            this.log("NPC entered chunk:")
            this.log(entity);

            let billboardMesh: Mesh = entity?._appearance?._billboardMesh;
            if (!billboardMesh) {
                this.error(`No mesh found for '${name+entityId}'`);
                return;
            }
            let matrixCopy: Matrix = billboardMesh.getWorldMatrix().clone(); //this.copyMatrix(billboardMesh.getWorldMatrix());
            this.log(matrixCopy.toString());
            this.respawnTracker.handleRespawn(entityId, matrixCopy);
        }, 50);
    }

    private copyMatrix(original: Matrix) : Matrix {
        let copy: Matrix = Matrix.Zero();
        let row1: Nullable<Vector4> = original.getRow(0);
        let row2: Nullable<Vector4> = original.getRow(1);
        let row3: Nullable<Vector4> = original.getRow(2);
        let row4: Nullable<Vector4> = original.getRow(3);
        // copy.set(
        //     new Number(row1!._x), Number(row1!._y, Number(row1!._z, Number(row1!._w,
        //     Number(row2!._x, Number(row2!._y, Number(row2!._z, Number(row2!._w,
        //     Number(row3!._x, Number(row3!._y, Number(row3!._z, Number(row3!._w,
        //     Number(row4!._x, Number(row4!._y, Number(row4!._z, Number(row4!._w,
        // );
        return copy;
    }

    // Borrowed from Nameplates - https://github.com/RyeL1te/Plugins/blob/main/Nameplates/src/Nameplates.ts#L1286
    private pxToRem(px: number): number {
        return px / 16;
    }
    
    private updateElementPosition(matrix: Matrix, domElement: any): void {
        const translationCoordinates = Vector3.Project(
            Vector3.ZeroReadOnly,
            matrix,
            this.gameHooks.GameEngine.Instance.Scene.getTransformMatrix(),
            this.gameHooks.GameCameraManager.Camera.viewport.toGlobal(
                this.gameHooks.GameEngine.Instance.Engine.getRenderWidth(1),
                this.gameHooks.GameEngine.Instance.Engine.getRenderHeight(1)
            )
        );

        domElement.style.transform = `translate3d(calc(${this.pxToRem(translationCoordinates.x)}rem - 50%), calc(${this.pxToRem(translationCoordinates.y - 30)}rem - 50%), 0px)`;
    }

    GameLoop_draw() {
        if (this.overlayTracker.isEmpty()) return;

        this.overlayTracker.forEach((item) => {
            if (item.matrix) {
                this.updateElementPosition(item.matrix, item.element);
            }
        });
    }

    stop(): void {
        this.log(this.pluginName + " stopped");
        if (this.timersContainer) {
            this.timersContainer.remove();
            this.timersContainer = null;
        }
    }
}
