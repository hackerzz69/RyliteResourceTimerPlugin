import { Matrix } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

class PositionedElement {
    public readonly key: string;
    public readonly element: HTMLElement | SVGElement;
    public readonly matrix: Matrix;

    constructor(
        key: string,
        element: HTMLElement | SVGElement,
        matrix: Matrix
    ) {
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
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    add(
        name: string,
        id: number,
        element: HTMLElement | SVGElement,
        matrix: Matrix
    ): void {
        const key = PositionedElement.createKey(name, id);
        this.plugin.log(
            `OverlayTracker - adding ${key} / ${matrix.toString()}`
        );

        this.items.push(new PositionedElement(key, element, matrix));
    }

    indexOf(entityName: string, entityId: number): number {
        const key = PositionedElement.createKey(entityName, entityId);
        return this.items.findIndex(item => item.key === key);
    }

    remove(entityName: string, entityId: number): boolean {
        const index = this.indexOf(entityName, entityId);
        if (index === -1) return false;

        this.items.splice(index, 1);
        return true;
    }

    forEach(callback: (item: PositionedElement) => void): void {
        for (const item of this.items) {
            callback(item);
        }
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}
