import { TERRAIN_TYPES, TERRAIN_COSTS, TERRAIN_VISUALS } from './constants.js';

export class Terrain {
    constructor() {
        this.terrainData = TERRAIN_VISUALS;
    }

    getTerrainInfo(terrainType) {
        return this.terrainData[terrainType] || null;
    }

    getMovementCost(terrainType, isNight = false) {
        const costs = TERRAIN_COSTS[terrainType];
        if (!costs) return 2;
        return isNight ? costs.night : costs.day;
    }

    isPassable(terrainType) {
        const costs = TERRAIN_COSTS[terrainType];
        if (!costs) return true;
        return costs.day < 999;
    }

    getName(terrainType) {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.name : 'Unknown';
    }

    getIcon(terrainType) {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.icon : '';
    }

    getColor(terrainType) {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.color : '#1a1a2e';
    }
}

export default Terrain;
