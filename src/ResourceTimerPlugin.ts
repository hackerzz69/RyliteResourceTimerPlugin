import { Plugin, SettingsTypes, UIManager, UIManagerScope } from "@ryelite/core";
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.js';
import createPie from './Pie';
import createTimer from './RespawnTimer';
import NPCRespawnTracker from './NPCRespawnTracker'
import { Mesh } from "@babylonjs/core";

export default class ResourceTimerPlugin extends Plugin {
    pluginName = "Resource Timers";
    author: string = "Grandy";
    uiManager = new UIManager();
    timersContainer: HTMLDivElement | null = null;
    timer3DByEntityId = new Map<any, SVGElement>();
    timer2DByEntityId = new Map<any, HTMLElement>();
    respawnTracker = new NPCRespawnTracker(this);

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

    private removeEntityFrom3DTracked = (entityTypeId: any) => {
        this.timer3DByEntityId.delete(entityTypeId);
    }

    private removeEntityFrom2DTracked = (entityID: any) => {
        this.timer2DByEntityId.delete(entityID);
    }

    SocketManager_handleEntityExhaustedResourcesPacket(e: any) {
        const worldEntityManager = this.gameHooks?.WorldEntityManager?.Instance;
        let n = worldEntityManager.getWorldEntityById(e[0]);
        let time = this.getRespawnMillis(n);
        
        if (n?._type && time) {
            let pie: SVGElement | null = null;
            try {
                pie = createPie(this.settings, n._entityTypeId, time, this.radius, this.radius, this.removeEntityFrom3DTracked);
                this.timersContainer?.appendChild(pie);
            } catch (error) {
                this.log(error);
            }
            if (pie) {
                this.timer3DByEntityId.set(n._entityTypeId, pie as SVGElement);
                this.updateElementFromMesh(n, pie);
            }
        }
    }

    SocketManager_handleHitpointsCurrentLevelChangedPacket(e: any) {
        const entityManager = this.gameHooks?.EntityManager?.Instance;
        this.log(e);
        // entityType (NPC/Player), entityID, health
        let [ entityType, entityID, health ] = e;
        if (entityType === 2) { // NPC
            let entity = entityManager.getNPCByEntityId(entityID);
            this.log(entity);
            if (entity && health === 0) {
                let respawnInfo = this.respawnTracker.handleDeath(entityID);
                if (respawnInfo && respawnInfo.isComplete()) {
                    let timer = createTimer(this.settings, entityID, respawnInfo.respawnDuration!, this.removeEntityFrom2DTracked);
                    this.timersContainer?.appendChild(timer);
                    this.timer2DByEntityId.set(entityID, timer);
                }
            }
        }
    }

    SocketManager_handleNPCEnteredChunkPacket(e: any) {
        const entityManager = this.gameHooks?.EntityManager?.Instance;
        let entityID = e[0];
        let entity = entityManager.getNPCByEntityId(entityID);
        this.log(entity);
        this.respawnTracker.handleRespawn(entityID, entity._currentGamePosition);
    }

    // Borrowed from Nameplates - https://github.com/RyeL1te/Plugins/blob/main/Nameplates/src/Nameplates.ts#L1286
    private pxToRem(px: number): number {
        return px / 16;
    }
    private updateElementFromMesh(entity: any, domElement: any): void {
        let entityMesh = entity?._appearance?._bjsMeshes[0];
        if (!entityMesh) {
            this.timer3DByEntityId.delete(entity?._entityTypeId);
        } else {
            this.updateElementPosition(entity, entityMesh, domElement);
        }
    }
    private updateElementFromBillboard(entity: any, domElement: any) {
        let mesh: Mesh = entity?._appearance?._billboardMesh;
        if (!mesh) {
            this.log(`No billboard`);
            this.timer2DByEntityId.delete(entity?._entityId);
        } else {
            this.log(`updateFromBillboard`);
            this.updateElementPosition(entity, mesh, domElement);
        }
    }
    private updateElementPosition(entity: any, mesh: Mesh, domElement: any): void {
        const translationCoordinates = Vector3.Project(
            Vector3.ZeroReadOnly,
            mesh.getWorldMatrix(),
            this.gameHooks.GameEngine.Instance.Scene.getTransformMatrix(),
            this.gameHooks.GameCameraManager.Camera.viewport.toGlobal(
                this.gameHooks.GameEngine.Instance.Engine.getRenderWidth(1),
                this.gameHooks.GameEngine.Instance.Engine.getRenderHeight(1)
            )
        );
        // const camera = this.gameHooks.GameCameraManager.Camera;
        // // Apply frustum culling first - if not in frustum, hide regardless of stack limits
        // if (!camera.isInFrustrum(mesh)) {
        //     domElement.style.visibility = 'hidden';
        //     return;
        // }
        this.log(`Translation coords: ${translationCoordinates}`);

        domElement.style.transform = `translate3d(calc(${this.pxToRem(translationCoordinates.x)}rem - 50%), calc(${this.pxToRem(translationCoordinates.y - 30)}rem - 50%), 0px)`;
    }

    GameLoop_draw() {
        if (this.timer3DByEntityId.size !== 0) {
            const worldEntityManager = this.gameHooks?.WorldEntityManager?.Instance;

            for (const [entityTypeId, el] of this.timer3DByEntityId) {
                let entity = worldEntityManager.getWorldEntityById(entityTypeId);
                if (!entity) {
                    // mesh is gone when the npc is fully dead, so need to cache
                    el.remove();
                    this.timer3DByEntityId.delete(entityTypeId);
                    continue;
                }
                this.updateElementFromMesh(entity, el);
            }
        }

        if (this.timer2DByEntityId.size !== 0) {
            const entityManager = this.gameHooks?.EntityManager?.Instance;
            for (const [entityID, el] of this.timer2DByEntityId) {
                let entity = entityManager.getNPCByEntityId(entityID);
                if (!entity) {
                    el.remove();
                    this.timer2DByEntityId.delete(entityID);
                    continue;
                }
                this.updateElementFromBillboard(entity, el);
            }
        }
    }

    stop(): void {
        this.log(this.pluginName + " stopped");
        if (this.timersContainer) {
            this.timersContainer.remove();
            this.timersContainer = null;
        }
    }
}
