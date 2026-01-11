import { Matrix } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

const STORAGE_KEY = "resourceTimers.respawnLocations";

type StoredRespawns = Record<string, unknown>;

export default class NPCRespawnTracker {
    private seenDeaths = new Set<number>();
    private respawnLocations = new Map<number, Matrix>();
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.load();
    }

    private load(): void {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return;
        }

        if (typeof parsed !== "object" || parsed === null) return;

        for (const [key, value] of Object.entries(parsed as StoredRespawns)) {
            const entityId = Number(key);
            if (!Number.isFinite(entityId)) continue;

            let arr: number[];

            if (Array.isArray(value)) {
                arr = value;
            } else if (typeof value === "object" && value !== null) {
                arr = Object.values(value as Record<string, number>);
            } else {
                continue;
            }

            if (arr.length !== 16 || !arr.every(n => typeof n === "number")) {
                continue;
            }

            try {
                this.respawnLocations.set(
                    entityId,
                    Matrix.FromArray(arr)
                );
            } catch {
                // ignore malformed entries
            }
        }
    }

    private save(): void {
        const data: Record<string, number[]> = {};

        for (const [id, matrix] of this.respawnLocations) {
            data[String(id)] = matrix.m.slice();
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // ignore storage failures
        }
    }

    public handleDeath(entityId: number): Matrix | undefined {
        this.seenDeaths.add(entityId);
        return this.respawnLocations.get(entityId);
    }

    public handleRespawn(entityId: number, matrix: Matrix): void {
        if (!this.seenDeaths.has(entityId)) return;

        this.respawnLocations.set(entityId, matrix);
        this.save();
    }

    public has(entityId: number): boolean {
        return this.respawnLocations.has(entityId);
    }

    public reset(): void {
        this.seenDeaths.clear();
        this.respawnLocations.clear();

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore storage failures
        }
    }
}
