import { Matrix } from "@babylonjs/core";

class PositionedElement {
    key: string;
    element: SVGElement | HTMLElement;
    matrix: Matrix;
    stackOffset = 0;

    constructor(key: string, element: SVGElement | HTMLElement, matrix: Matrix) {
        this.key = key;
        this.element = element;
        this.matrix = matrix;
    }

    static createKey(name: string, id: number): string {
        return `${name}#${id}`;
    }
}

export default class OverlayTracker {
    private items: PositionedElement[] = [];

    add(
        name: string,
        id: number,
        element: HTMLElement | SVGElement,
        matrix: Matrix
    ): void {
        const key = PositionedElement.createKey(name, id);
        this.items.push(new PositionedElement(key, element, matrix));
    }

    remove(name: string, id: number): boolean {
        const key = PositionedElement.createKey(name, id);
        const index = this.items.findIndex(i => i.key === key);
        if (index === -1) return false;
        this.items.splice(index, 1);
        return true;
    }

    forEach(cb: (item: PositionedElement) => void): void {
        for (const item of this.items) cb(item);
    }

    values(): PositionedElement[] {
        return this.items;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}
