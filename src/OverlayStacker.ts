import { Matrix, Vector3 } from "@babylonjs/core";

export type StackableOverlay = {
    element: HTMLElement | SVGElement;
    matrix: Matrix;
    stackOffset: number;
};

const STACK_DISTANCE_PX = 18;

export default class OverlayStacker {
    stack(items: StackableOverlay[]): StackableOverlay[] {
        const projected: {
            item: StackableOverlay;
            screenPos: Vector3;
        }[] = [];

        for (const item of items) {
            const pos = item.matrix.getTranslation();
            projected.push({
                item,
                screenPos: pos.clone()
            });
        }

        projected.sort(
            (a, b) => a.screenPos.y - b.screenPos.y
        );

        let lastY = -Infinity;
        let stackIndex = 0;

        for (const entry of projected) {
            if (Math.abs(entry.screenPos.y - lastY) < STACK_DISTANCE_PX) {
                stackIndex++;
            } else {
                stackIndex = 0;
            }

            entry.item.stackOffset = stackIndex * STACK_DISTANCE_PX;
            lastY = entry.screenPos.y;
        }

        return projected.map(p => p.item);
    }
}
