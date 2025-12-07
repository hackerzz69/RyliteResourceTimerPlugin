import { Matrix } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

class PositionedElement {
    key: string;
    element: SVGElement | HTMLElement;
    matrix: Matrix;

    constructor(key: string, element: SVGElement | HTMLElement, matrix: Matrix) {
        this.key = key;
        this.element = element;
        this.matrix = matrix;
    }

    static createKey(name: string, id: number): string {
        return name + id;
    }
}

export default class OverlayTracker {
    private items = new Array<PositionedElement>();
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
        let key = PositionedElement.createKey(name, id);
        this.plugin.log(`OverlayTracker - adding ${key}`);
        let item = new PositionedElement(key, element, matrix);
        this.items.push(item);
    }

    private get(name: string, id: number): PositionedElement | null {
        let index = this.indexOf(name, id);
        if (index === -1) {
            return null;
        } else {
            return this.items[index];
        }
    }

    setMatrix(name: string, id: number, matrix: Matrix): void {
        let item = this.get(name, id);
        if (item) {
            item.matrix = matrix;
        }
    }

    indexOf(name: string, id: number): number {
        let key = PositionedElement.createKey(name, id);
        return this.items.findIndex(i => i.key === key);
    }

    remove(name: string, id: number): boolean {
        const index = this.indexOf(name, id);
        if (index === -1) {
            return false;
        };
        this.items.splice(index, 1);
        return true;
    }

    forEach(callback: (item: PositionedElement) => void): void {
        for (const item of this.items.values()) {
            callback(item);
        }
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}
