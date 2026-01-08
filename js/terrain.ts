import { TERRAIN_COSTS, TERRAIN_VISUALS } from './constants';

export type TerrainType = string;

export class Terrain {
    private terrainData: any;

    constructor() {
        this.terrainData = TERRAIN_VISUALS;
    }

    public getTerrainInfo(terrainType: string): any {
        return (this.terrainData as any)[terrainType] || null;
    }

    public getMovementCost(terrainType: string, isNight: boolean = false, hero: any = null): number {
        const costs = (TERRAIN_COSTS as any)[terrainType];
        if (!costs) return 2;

        let cost = isNight ? costs.night : costs.day;

        // Flight skill: all terrain costs 2
        if (hero && typeof hero.hasSkill === 'function' && hero.hasSkill('flight')) {
            cost = 2;
        }

        // Forward March skill: movement costs -1 (min 1)
        if (hero && typeof hero.hasSkill === 'function' && hero.hasSkill('forward_march') && cost > 1) {
            cost -= 1;
        }

        return cost;
    }

    public isPassable(terrainType: string): boolean {
        const costs = (TERRAIN_COSTS as any)[terrainType];
        if (!costs) return true;
        return costs.day < 999;
    }

    public getName(terrainType: string): string {
        const terrain = (this.terrainData as any)[terrainType];
        return terrain ? terrain.name : 'Unknown';
    }

    public getIcon(terrainType: string): string {
        const terrain = (this.terrainData as any)[terrainType];
        return terrain ? terrain.icon : '';
    }

    public getColor(terrainType: string): string {
        const terrain = (this.terrainData as any)[terrainType];
        return terrain ? terrain.color : '#1a1a2e';
    }
}

export default Terrain;
