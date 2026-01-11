import { Matrix } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

const DATA_KEY = "entityIdToLocation";

export default class NPCRespawnTracker {
    private entityIdList = new Set<number>();
    private entityIdToLocation = new Map<number, Matrix>();
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;

        const raw = plugin.data?.[DATA_KEY];
        if (!raw || typeof raw !== "object") return;

        for (const [key, value] of Object.entries(raw)) {
            if (!Array.isArray(value) || value.length !== 16) continue;

            const entityId = Number(key);
            if (!Number.isFinite(entityId)) continue;

            try {
                this.entityIdToLocation.set(
                    entityId,
                    Matrix.FromArray(value)
                );
            } catch {
                // ignore invalid entries
            }
        }
    }

    public handleDeath(entityId: number): Matrix | undefined {
        this.entityIdList.add(entityId);
        return this.entityIdToLocation.get(entityId);
    }

    public handleRespawn(entityId: number, matrix: Matrix): void {
        if (!this.entityIdList.has(entityId)) return;

        this.entityIdToLocation.set(entityId, matrix);

        const data: Record<string, number[]> =
            typeof this.plugin.data?.[DATA_KEY] === "object"
                ? { ...this.plugin.data[DATA_KEY] }
                : {};

        data[String(entityId)] = matrix.m.slice();
        this.plugin.data[DATA_KEY] = data;
    }

    public has(entityId: number): boolean {
        return this.entityIdToLocation.has(entityId);
    }
}
