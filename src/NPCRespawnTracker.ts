import { Matrix, Vector3 } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

class RespawnInfo {
    matrix: Matrix | undefined;
    respawnDuration: number | null = null; // milliseconds
    deathTime: number; // milliseconds

    constructor(deathTime: number, matrix?: Matrix) {
        this.deathTime = deathTime;
        this.matrix = matrix;
    }

    public isComplete() : boolean {
        return this.matrix !== undefined && this.respawnDuration != null;
    }
}

export default class NPCRespawnTracker {
    // entityID to time/position
    tracker = new Map<any, RespawnInfo>;
    plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    public hasEntity(entityID: any) {
        return this.tracker.has(entityID);
    }

    public handleDeath(entityID: any) : RespawnInfo | null {
        if (!this.tracker.has(entityID)) {
            this.tracker.set(entityID, new RespawnInfo(Date.now()));
            this.plugin.log(`handleDeath - entity #${entityID} has been recorded for respawn timings`);
            return null;
        } else {
            let info : RespawnInfo = this.tracker.get(entityID)!;
            info.deathTime = Date.now();
            this.plugin.log(`handleDeath - returning #${entityID}'s RespawnInfo data - respawnDuration: ${info.respawnDuration} / position: ${info.matrix}`);
            return info;
        }
    }

    public handleRespawn(entityID: any, matrix: Matrix) {
        if (this.tracker.has(entityID)) {
            let info = this.tracker.get(entityID)!;
            info.matrix = matrix;
            info.respawnDuration = Date.now() - info.deathTime;
            this.plugin.log(`Entity #${entityID} complete - respawnDuration: ${info.respawnDuration} / position: ${info.matrix}`);
        }
    }
}