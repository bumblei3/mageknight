import { TERRAIN_TYPES, TERRAIN_COSTS } from './constants.js';

export class Terrain {
    constructor() {
        this.terrainData = {
            [TERRAIN_TYPES.PLAINS]: {
                name: 'Ebenen',
                icon: '🌾',
                color: '#4ade80',
                description: 'Offenes Grasland'
            },
            [TERRAIN_TYPES.FOREST]: {
                name: 'Wald',
                icon: '🌲',
                color: '#22c55e',
                description: 'Dichter Wald'
            },
            [TERRAIN_TYPES.HILLS]: {
                name: 'Hügel',
                icon: '⛰️',
                color: '#a16207',
                description: 'Hügeliges Gelände'
            },
            [TERRAIN_TYPES.MOUNTAINS]: {
                name: 'Berge',
                icon: '🏔️',
                color: '#78716c',
                description: 'Hohe Berge'
            },
            [TERRAIN_TYPES.DESERT]: {
                name: 'Wüste',
                icon: '🏜️',
                color: '#fbbf24',
                description: 'Trockene Wüste'
            },
            [TERRAIN_TYPES.WASTELAND]: {
                name: 'Ödland',
                icon: '☠️',
                color: '#6b7280',
                description: 'Verfluchtes Ödland'
            },
            [TERRAIN_TYPES.WATER]: {
                name: 'Wasser',
                icon: '💧',
                color: '#3b82f6',
                description: 'Wasser (unpassierbar)'
            }
        };
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
