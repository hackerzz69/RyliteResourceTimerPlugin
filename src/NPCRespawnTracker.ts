import { Vector3 } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

class RespawnInfo {
    position: Vector3 | null = null;
    respawnDuration: number | null = null; // milliseconds
    deathTime: number; // milliseconds

    constructor(deathTime: number) {
        this.deathTime = deathTime;
    }

    public isComplete() : boolean {
        return this.position != null && this.respawnDuration != null;
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
            this.plugin.log(`Entity #${entityID} has been recorded for respawn timings`);
            return null;
        } else {
            let info : RespawnInfo = this.tracker.get(entityID)!
            info.deathTime = Date.now();
            this.plugin.log(`Returning #${entityID}'s RespawnInfo data - respawnDuration: ${info.respawnDuration} / position: ${info.position}`);
            return info;
        }
    }

    public handleRespawn(entityID: any, position: Vector3) {
        if (this.tracker.has(entityID)) {
            let info = this.tracker.get(entityID)!;
            info.position = position;
            info.respawnDuration = Date.now() - info.deathTime;
            this.plugin.log(`Entity #${entityID} complete - respawnDuration: ${info.respawnDuration} / position: ${info.position}`);
        }
    }
}