import { Matrix, Vector3 } from "@babylonjs/core";
import { Plugin } from "@ryelite/core";

// class EntityDeathTime {
//     entityTypeId: number;
//     deathTime: number;

//     constructor(entityTypeId: number, deathTime: number) {
//         this.entityTypeId = entityTypeId;
//         this.deathTime = deathTime;
//     }
// }

export default class NPCRespawnTracker {
    entityIdList = new Set<number>();
    entityIdToLocation = new Map<number, Matrix>();
    plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    // public hasEntity(entityId: any) {
    //     return this.tracker.has(entityID);
    // }

    public handleDeath(entityId: number) : Matrix | undefined {
        this.plugin.log(`handleDeath - entity #${entityId} has been recorded for respawn timings`);
        this.entityIdList.add(entityId);
        let location = this.entityIdToLocation.get(entityId);
        return location;
        // if (!this.tracker.has(entityID)) {
        //     this.tracker.set(entityID, new RespawnInfo(Date.now()));
        //     this.plugin.log(`handleDeath - entity #${entityID} has been recorded for respawn timings`);
        //     return null;
        // } else {
        //     let info : RespawnInfo = this.tracker.get(entityID)!;
        //     info.deathTime = Date.now();
        //     this.plugin.log(`handleDeath - returning #${entityID}'s RespawnInfo data - respawnDuration: ${info.respawnDuration} / position: ${info.matrix}`);
        //     return info;
        // }
    }

    public handleRespawn(entityId: number, matrix: Matrix) {
        // if (this.tracker.has(entityID)) {
        //     let info = this.tracker.get(entityID)!;
        //     info.matrix = matrix;
        //     info.respawnDuration = Date.now() - info.deathTime;
        //     this.plugin.log(`Entity #${entityID} complete - respawnDuration: ${info.respawnDuration} / position: ${info.matrix}`);
        // }
        if (this.entityIdList.has(entityId)) { // we've seen it die
            this.entityIdToLocation.set(entityId, matrix);
            this.plugin.log(`Entity #${entityId} respawned at: ${matrix}`);
        }
    }
}