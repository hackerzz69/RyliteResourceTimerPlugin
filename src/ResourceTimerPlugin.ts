import { Plugin, SettingsTypes, UIManager, UIManagerScope } from "@ryelite/core";
import { Vector3 } from '@babylonjs/core/Maths/math.js';

export default class ResourceTimerPlugin extends Plugin {
    pluginName = "Resource Timers";
    author: string = "Grandy";
    uiManager = new UIManager();
    timersContainer: HTMLDivElement | null = null;
    tracked = new Map<any, SVGElement>();

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
            text: 'Fill color',
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
            description: 'How transparent the timer is. 0 = transparent, 1 = opaque',
            type: SettingsTypes.range,
            min: 0,
            max: 1,
            value: 0.7,
            callback: () => {}
        };
    }

    private getRespawnMillis(entity: any) {
        return Math.max(0, entity?._def?._respawnTicks - 1) * 600; // 600ms tickrate; using -1 from reported tickrate as this is what is seen in practise (??)
    }

    private createPie(entityTypeId: number, time: number, posX: number, posY: number): HTMLOrSVGElement {
        const radius = Number(this.settings.radius?.value);
        const strokeWidth = radius / Number(this.settings.borderRatio?.value);

        const borderRadius = radius - strokeWidth / 2;
        const wedgeRadius  = borderRadius - strokeWidth / 2;

        const diameter = (radius * 2);
        const cx = diameter / 2;
        const cy = diameter / 2;

        const pie = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        pie.setAttribute("width", diameter.toString());
        pie.setAttribute("height", diameter.toString());
        pie.style.position = "absolute";
        pie.style.pointerEvents = "none";
        pie.style.left = posX - diameter / 2 + "px";
        pie.style.top = posY - diameter / 2 + "px";
        pie.style.opacity = this.settings.opacity.value?.toString();

        const border = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        border.setAttribute("cx", cx.toString());
        border.setAttribute("cy", cy.toString());
        border.setAttribute("r", borderRadius.toString());
        border.setAttribute("fill", "transparent");
        border.setAttribute("stroke", this.settings.borderColor.value?.toString());
        border.setAttribute("stroke-width", strokeWidth.toString());
        pie.appendChild(border);

        const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        wedge.setAttribute("fill", this.settings.fillColor.value?.toString());
        pie.appendChild(wedge);

        const start = performance.now();

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / time, 1);

            const angle = -progress * 2 * Math.PI;
            const x = cx + wedgeRadius * Math.sin(angle);
            const y = cy - wedgeRadius * Math.cos(angle);
            const largeArc = progress > 0.5 ? 1 : 0;

            // Start from inner top point (noon), expand anti-clockwise
            const d = `M${cx},${cy} L${cx},${cy - wedgeRadius} A${wedgeRadius},${wedgeRadius} 0 ${largeArc} 0 ${x},${y} Z`;
            wedge.setAttribute("d", d);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                pie.remove();
                this.tracked.delete(entityTypeId);
            }
        };

        requestAnimationFrame(tick);
        this.timersContainer?.appendChild(pie);
        return pie;
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
        let n = worldEntityManager.getWorldEntityById(e[0]);
        let time = this.getRespawnMillis(n);
        
        if (n?._type && time) {
            let pie: HTMLOrSVGElement | null = null;
            try {
                pie = this.createPie(n._entityTypeId, time, this.radius, this.radius);
            } catch (error) {
                this.log(error);
            }
            if (pie) {
                this.tracked.set(n._entityTypeId, pie as SVGElement);
                this.updateElementPosition(n, pie);
            }
        }
    }

    // Borrowed from Nameplates - https://github.com/RyeL1te/Plugins/blob/main/Nameplates/src/Nameplates.ts#L1286
    private pxToRem(px: number): number {
        return px / 16;
    }
    private updateElementPosition(entity: any, domElement: any): void {
        const entityMesh = entity?._appearance?._bjsMeshes[0];
        if (!entityMesh) {
            this.tracked.delete(entity?._entityTypeId);
        }
        const translationCoordinates = Vector3.Project(
            Vector3.ZeroReadOnly,
            entityMesh.getWorldMatrix(),
            this.gameHooks.GameEngine.Instance.Scene.getTransformMatrix(),
            this.gameHooks.GameCameraManager.Camera.viewport.toGlobal(
                this.gameHooks.GameEngine.Instance.Engine.getRenderWidth(1),
                this.gameHooks.GameEngine.Instance.Engine.getRenderHeight(1)
            )
        );

        const camera = this.gameHooks.GameCameraManager.Camera;
        const isInFrustrum = camera.isInFrustum(entityMesh);

        // Apply frustum culling first - if not in frustum, hide regardless of stack limits
        if (!isInFrustrum) {
            domElement.style.visibility = 'hidden';
            return;
        }

        domElement.style.transform = `translate3d(calc(${this.pxToRem(translationCoordinates.x)}rem - 50%), calc(${this.pxToRem(translationCoordinates.y - 30)}rem - 50%), 0px)`;
    }

    GameLoop_draw() {
        if (this.tracked.size === 0) return;
        const worldEntityManager = this.gameHooks?.WorldEntityManager?.Instance;

        for (const [entityTypeId, el] of this.tracked) {
            let entity = worldEntityManager.getWorldEntityById(entityTypeId);
            if (!entity) {
                el.remove();
                this.tracked.delete(entityTypeId);
                continue;
            }
            this.updateElementPosition(entity, el);
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
