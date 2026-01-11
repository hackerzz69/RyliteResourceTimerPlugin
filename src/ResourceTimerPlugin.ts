import { Plugin, SettingsTypes, UIManager, UIManagerScope } from "@ryelite/core";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.js";
import { Mesh } from "@babylonjs/core";
import createPie from "./Pie";
import createTimer from "./RespawnTimer";
import NPCRespawnTracker from "./NPCRespawnTracker";
import OverlayTracker from "./OverlayTracker";

export default class ResourceTimerPlugin extends Plugin {
    pluginName = "Resource Timers";
    author: string = "Grandy";

    uiManager = new UIManager();
    timersContainer: HTMLDivElement | null = null;

    respawnTracker = new NPCRespawnTracker(this);
    overlayTracker = new OverlayTracker(this);

    private timeouts = new Set<number>();

    constructor() {
        super();

        this.settings.radius = {
            text: "Radius",
            description: "The radius of the timer circle",
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 18,
            callback: () => {}
        };

        this.settings.borderRatio = {
            text: "Border ratio",
            description:
                "The ratio between circle radius and the width of the border. Bigger number = smaller border proportionally",
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 8,
            callback: () => {}
        };

        this.settings.fillColor = {
            text: "Timer/pie color",
            type: SettingsTypes.color,
            value: "#FFD800",
            callback: () => {}
        };

        this.settings.borderColor = {
            text: "Border color",
            type: SettingsTypes.color,
            value: "#FF6A00",
            callback: () => {}
        };

        this.settings.opacity = {
            text: "Opacity",
            description:
                "How transparent the timers are. 0 = transparent, 1 = opaque",
            type: SettingsTypes.range,
            min: 0,
            max: 1,
            value: 0.7,
            callback: () => {}
        };

        this.settings.respawnTimerFontSize = {
            text: "Respawn timer font size",
            type: SettingsTypes.range,
            min: 0,
            max: 100,
            value: 14,
            callback: () => {}
        };
    }

    init(): void {}

    private getRespawnMillis(entity: any): number {
        return Math.max(0, entity?._def?._respawnTicks - 1) * 600;
    }

    private getPieSettings() {
        return {
            radius: { value: Number(this.settings.radius?.value) },
            borderRatio: { value: Number(this.settings.borderRatio?.value) },
            fillColor: { value: String(this.settings.fillColor?.value) },
            borderColor: { value: String(this.settings.borderColor?.value) },
            opacity: { value: Number(this.settings.opacity?.value) }
        };
    }

    private getTimerSettings() {
        return {
            fillColor: { value: String(this.settings.fillColor?.value) },
            borderColor: { value: String(this.settings.borderColor?.value) },
            respawnTimerFontSize: {
                value: Number(this.settings.respawnTimerFontSize?.value)
            }
        };
    }

    start(): void {
        this.log(this.pluginName + " started");

        this.timersContainer = this.uiManager.createElement(
            UIManagerScope.ClientRelative
        ) as HTMLDivElement;

        if (this.timersContainer) {
            this.timersContainer.id = "resource-timers";
            this.timersContainer.style.position = "absolute";
            this.timersContainer.style.pointerEvents = "none";
            this.timersContainer.style.zIndex = "1";
            this.timersContainer.style.overflow = "hidden";
            this.timersContainer.style.width = "100%";
            this.timersContainer.style.height =
                "calc(100% - var(--titlebar-height))";
            this.timersContainer.style.top = "var(--titlebar-height)";
        }
    }

    SocketManager_handleEntityExhaustedResourcesPacket(e: any) {
        const wem = this.gameHooks?.WorldEntityManager?.Instance;
        const entity = wem.getWorldEntityById(e[0]);
        const respawnTime = this.getRespawnMillis(entity);

        if (!entity?._type || !respawnTime) return;

        const name = entity._name;
        const id = entity._entityTypeId;
        const mesh = entity?._appearance?._bjsMeshes[0];
        if (!mesh) return;

        const pie = createPie(
            this.getPieSettings(),
            respawnTime,
            () => this.overlayTracker.remove(name, id)
        );

        this.timersContainer?.appendChild(pie);
        this.overlayTracker.add(name, id, pie, mesh.getWorldMatrix());
    }

    SocketManager_handleHitpointsCurrentLevelChangedPacket(e: any) {
        const [type, entityId, health] = e;
        if (type !== 2 || health !== 0) return;

        const em = this.gameHooks?.EntityManager?.Instance;
        const entity = em.getNPCByEntityId(entityId);
        if (!entity) return;

        const name = entity._name;

        const timeoutId = window.setTimeout(() => {
            this.timeouts.delete(timeoutId);

            const respawnTime =
                entity?._def?._combat?._respawnLength * 600;

            const matrix = this.respawnTracker.handleDeath(entityId);
            if (!matrix) return;

            const timer = createTimer(
                this.getTimerSettings(),
                respawnTime,
                () => this.overlayTracker.remove(name, entityId)
            );

            this.timersContainer?.appendChild(timer);
            this.overlayTracker.add(name, entityId, timer, matrix);
        }, 1200);

        this.timeouts.add(timeoutId);
    }

    SocketManager_handleNPCEnteredChunkPacket(e: any) {
        const entityId = e[0];
        const em = this.gameHooks?.EntityManager?.Instance;

        const timeoutId = window.setTimeout(() => {
            this.timeouts.delete(timeoutId);

            const entity = em.getNPCByEntityId(entityId);
            const mesh = entity?._appearance?._billboardMesh;
            if (!mesh) return;

            this.respawnTracker.handleRespawn(
                entityId,
                mesh.getWorldMatrix().clone()
            );
        }, 50);

        this.timeouts.add(timeoutId);
    }

    private pxToRem(px: number): number {
        return px / 16;
    }

    private updateElementPosition(matrix: Matrix, el: any): void {
        const screen = Vector3.Project(
            Vector3.ZeroReadOnly,
            matrix,
            this.gameHooks.GameEngine.Instance.Scene.getTransformMatrix(),
            this.gameHooks.GameCameraManager.Camera.viewport.toGlobal(
                this.gameHooks.GameEngine.Instance.Engine.getRenderWidth(1),
                this.gameHooks.GameEngine.Instance.Engine.getRenderHeight(1)
            )
        );

        el.style.transform = `translate3d(
            calc(${this.pxToRem(screen.x)}rem - 50%),
            calc(${this.pxToRem(screen.y - 30)}rem - 50%),
            0px
        )`;
    }

    GameLoop_draw() {
        if (this.overlayTracker.isEmpty()) return;

        this.overlayTracker.forEach(item => {
            if (item.matrix) {
                this.updateElementPosition(item.matrix, item.element);
            }
        });
    }

    stop(): void {
        this.log(this.pluginName + " stopped");

        for (const id of this.timeouts) {
            clearTimeout(id);
        }
        this.timeouts.clear();

        this.overlayTracker.forEach(item => {
            item.element.remove();
        });

        if (this.timersContainer) {
            this.timersContainer.remove();
            this.timersContainer = null;
        }
    }
}
