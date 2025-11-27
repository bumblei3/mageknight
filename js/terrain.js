// Terrain definitions and utilities

export const TERRAIN_TYPES = {
    PLAINS: 'plains',
    FOREST: 'forest',
    HILLS: 'hills',
    MOUNTAINS: 'mountains',
    DESERT: 'desert',
    WASTELAND: 'wasteland',
    WATER: 'water'
};

export class Terrain {
    constructor() {
        this.terrainData = {
            [TERRAIN_TYPES.PLAINS]: {
                name: 'Ebenen',
                movementCost: { day: 2, night: 2 },
                icon: '🌾',
                color: '#4ade80',
                description: 'Offenes Grasland'
            },
            [TERRAIN_TYPES.FOREST]: {
                name: 'Wald',
                movementCost: { day: 3, night: 2 },
                icon: '🌲',
                color: '#22c55e',
                description: 'Dichter Wald'
            },
            [TERRAIN_TYPES.HILLS]: {
                name: 'Hügel',
                movementCost: { day: 3, night: 3 },
                icon: '⛰️',
                color: '#a16207',
                description: 'Hügeliges Gelände'
            },
            [TERRAIN_TYPES.MOUNTAINS]: {
                name: 'Berge',
                movementCost: { day: 5, night: 5 },
                icon: '🏔️',
                color: '#78716c',
                description: 'Hohe Berge'
            },
            [TERRAIN_TYPES.DESERT]: {
                name: 'Wüste',
                movementCost: { day: 3, night: 2 },
                icon: '🏜️',
                color: '#fbbf24',
                description: 'Trockene Wüste'
            },
            [TERRAIN_TYPES.WASTELAND]: {
                name: 'Ödland',
                movementCost: { day: 3, night: 3 },
                icon: '☠️',
                color: '#6b7280',
                description: 'Verfluchtes Ödland'
            },
            [TERRAIN_TYPES.WATER]: {
                name: 'Wasser',
                movementCost: { day: 999, night: 999 }, // Impassable
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
        const terrain = this.terrainData[terrainType];
        if (!terrain) return 2;
        return isNight ? terrain.movementCost.night : terrain.movementCost.day;
    }

    isPassable(terrainType) {
        const terrain = this.terrainData[terrainType];
        if (!terrain) return true;
        return terrain.movementCost.day < 999;
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
