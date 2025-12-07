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

const DATA_KEY = "entityIdToLocation";

export default class NPCRespawnTracker {
    entityIdList = new Set<number>();
    entityIdToLocation: Map<number, Matrix>;
    plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;

        // load values from the plugin data
        let savedData = plugin.data.entityIdToLocation;
        plugin.log(`Saved data: ${savedData}`);
        this.entityIdToLocation = savedData ? this.jsonToMap(savedData) : new Map<number, Matrix>();
    }

    public handleDeath(entityId: number) : Matrix | undefined {
        this.plugin.log(`handleDeath - entity #${entityId} has been recorded for respawn timings`);
        this.entityIdList.add(entityId);
        let location = this.entityIdToLocation.get(entityId);
        return location;
    }

    public handleRespawn(entityId: number, matrix: Matrix) {
        if (this.entityIdList.has(entityId)) { // we've seen it die
            this.entityIdToLocation.set(entityId, matrix);
            let json = this.mapToJson();
            this.plugin.log(`Updating saved data: ${JSON.stringify(json)}`);
            this.plugin.data.entityIdToLocation = json;
            this.plugin.log(`Entity #${entityId} respawned at: ${matrix}`);
        }
    }

    private mapToJson(): any {
        const obj: any = {};
        for (const [key, matrix] of this.entityIdToLocation.entries()) {
            // store matrix as its flat array
            obj[key] = matrix.m.slice(); // clone
        }
        return JSON.stringify(obj);
    }

    private jsonToMap(json: any): Map<number, Matrix> {
        const m = new Map<number, Matrix>();
        for (const key in JSON.parse(json)) {
            const arr = json[key] as number[];
            const mat = Matrix.FromArray(arr);
            m.set(Number(key), mat);
        }
        return m;
    }
}