import {Plugin, UIManager, UIManagerScope} from "@ryelite/core";
import { Vector3 } from '@babylonjs/core/Maths/math.js';

// Unique numeric IDs for each entity of interest
export enum EntityId {
    Copper    = 25,
    Tin       = 26,
    Iron      = 24,
    Coal      = 27,
    Silver    = 34,
    Palladium = 28,
    Gold      = 35,
    Coronium  = 29,
    Caladium  = 133
}

// Respawn time in seconds, keyed by entity ID - found on highspell.wiki
export enum RespawnTimes {
    Copper    = 6,
    Tin       = 6,
    Iron      = 6,
    Coal      = 30,
    Silver    = 150,
    Palladium = 210,
    Gold      = 300,
    Coronium  = 810,
    Caladium  = 1800
}


export default class ResourceTimerPlugin extends Plugin {
    pluginName = "Resource Timers";
    author: string = "Grandy";
    radius: number = 24;
    uiManager = new UIManager();
    timersContainer: HTMLDivElement | null = null;

    constructor() {
        super()
    }

    private getRespawnMillis(type: number) {
        return RespawnTimes[EntityId[type] as keyof typeof RespawnTimes] * 1000;
    }

    private createPie(time: number, posX: number, posY: number): HTMLOrSVGElement {
        const strokeWidth = this.radius / 10;

        // Border thickness extends outward unless compensated for
        const borderRadius = this.radius - strokeWidth / 2;      // stays inside
        const wedgeRadius  = borderRadius - strokeWidth / 2;      // stays fully inside border

        const diameter = (this.radius * 2);
        const cx = diameter / 2;
        const cy = diameter / 2;

        const pie = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        pie.setAttribute("width", diameter.toString());
        pie.setAttribute("height", diameter.toString());
        pie.style.position = "absolute";
        pie.style.pointerEvents = "none";
        pie.style.left = posX - diameter / 2 + "px";
        pie.style.top = posY - diameter / 2 + "px";

        // Orange border circle fully inside the SVG
        const border = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        border.setAttribute("cx", cx.toString());
        border.setAttribute("cy", cy.toString());
        border.setAttribute("r", borderRadius.toString());
        border.setAttribute("fill", "transparent");
        border.setAttribute("stroke", "orange");
        border.setAttribute("stroke-width", strokeWidth.toString());
        pie.appendChild(border);

        // Yellow wedge inside the border
        const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        wedge.setAttribute("fill", "yellow");
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

            if (progress < 1) requestAnimationFrame(tick);
            else pie.remove();
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
            //this.radius = Math.floor(Math.random() * (100 - 20) + 20);
            //this.createPie(Math.floor(Math.random() * (20 - 5) + 5) * 1000, this.radius, this.radius);
        }
    }

    SocketManager_handleEntityExhaustedResourcesPacket(e: any) {
        const worldEntityManager = this.gameHooks?.WorldEntityManager?.Instance;
        let n = worldEntityManager.getWorldEntityById(e[0]);
        this.log(n);
        if (n._type) {
            let pie: HTMLOrSVGElement | null = null;
            try {
                pie = this.createPie(this.getRespawnMillis(n._type), this.radius, this.radius);
            } catch (error) {
                // do nothing
            }
            if (pie) {
                this.updateElementPosition(n._appearance._bjsMeshes[0], pie);
            }
        }
    }

    // Borrowed from Nameplates - https://github.com/RyeL1te/Plugins/blob/main/Nameplates/src/Nameplates.ts#L1286
    private pxToRem(px: number): number {
        return px / 16;
    }
    private updateElementPosition(entityMesh: any, domElement: any): void {
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

        this.log("Applying translation...");
        domElement.style.transform = `translate3d(calc(${this.pxToRem(translationCoordinates.x)}rem - 50%), calc(${this.pxToRem(translationCoordinates.y - 30)}rem - 50%), 0px)`;
    }

    stop(): void {
        this.log(this.pluginName + " stopped");
        if (this.timersContainer) {
            this.timersContainer.remove();
            this.timersContainer = null;
        }
    }
}
