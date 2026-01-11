import { Matrix } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

type SerializedMatrix = number[];

type PersistedData = Record<number, SerializedMatrix>;

export default class NPCRespawnTracker {
    private entityIdList = new Set<number>();
    private entityIdToLocation: Map<number, Matrix>;
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;

        const savedData = plugin.data.entityIdToLocation as
            | string
            | undefined;

        this.plugin.log(`Saved data: ${savedData}`);

        this.entityIdToLocation = savedData
            ? this.jsonToMap(savedData)
            : new Map<number, Matrix>();
    }

    public handleDeath(entityId: number): Matrix | undefined {
        this.plugin.log(
            `handleDeath - entity #${entityId} has been recorded for respawn timings`
        );

        this.entityIdList.add(entityId);
        return this.entityIdToLocation.get(entityId);
    }

    public handleRespawn(entityId: number, matrix: Matrix): void {
        if (!this.entityIdList.has(entityId)) return;

        this.entityIdToLocation.set(entityId, matrix);

        const json = this.mapToJson();
        this.plugin.log(`Updating saved data`);
        this.plugin.data.entityIdToLocation = json;

        this.plugin.log(`Entity #${entityId} respawned at: ${matrix}`);
    }

    private mapToJson(): string {
        const obj: PersistedData = {};

        for (const [key, matrix] of this.entityIdToLocation.entries()) {
            obj[key] = matrix.m.slice();
        }

        return JSON.stringify(obj);
    }

    private jsonToMap(json: string): Map<number, Matrix> {
        const parsed = JSON.parse(json) as PersistedData;
        const map = new Map<number, Matrix>();

        for (const key in parsed) {
            const mat = Matrix.FromArray(parsed[key]);
            map.set(Number(key), mat);
        }

        return map;
    }
}
