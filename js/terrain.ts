import { TERRAIN_COSTS, TERRAIN_VISUALS, TerrainType, TerrainCost, TerrainVisual } from './constants.js';

interface HeroLike {
    hasSkill?(skill: string): boolean;
}

export class Terrain {
    private terrainData: Record<TerrainType, TerrainVisual>;

    constructor() {
        this.terrainData = TERRAIN_VISUALS;
    }

    getTerrainInfo(terrainType: TerrainType): TerrainVisual | null {
        return this.terrainData[terrainType] || null;
    }

    getMovementCost(terrainType: TerrainType, isNight = false, hero: HeroLike | null = null): number {
        const costs = TERRAIN_COSTS[terrainType];
        if (!costs) return 2;

        let cost = isNight ? costs.night : costs.day;

        // Flight skill: all terrain costs 2
        if (hero?.hasSkill?.('flight')) {
            cost = Math.min(cost, 2);
        }

        // Forward March skill: movement costs -1 (min 1)
        if (hero?.hasSkill?.('forward_march') && cost > 1) {
            cost -= 1;
        }

        return cost;
    }

    isPassable(terrainType: TerrainType): boolean {
        const costs = TERRAIN_COSTS[terrainType];
        if (!costs) return true;
        return costs.day < 999;
    }

    getName(terrainType: TerrainType): string {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.name : 'Unknown';
    }

    getIcon(terrainType: TerrainType): string {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.icon : '';
    }

    getColor(terrainType: TerrainType): string {
        const terrain = this.terrainData[terrainType];
        return terrain ? terrain.color : '#1a1a2e';
    }
}

export default Terrain;
