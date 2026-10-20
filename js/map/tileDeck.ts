import { TERRAIN_TYPES, TerrainType } from '../constants';
import { SITE_TYPES } from '../sites';

/** One 7-hex tile: index 0 is the center, 1–6 follow HEX_DIRECTIONS. */
export interface ScenarioTile {
    terrains: TerrainType[];
    siteType: string | null;
    enemyTypes: string[];
}

const DECK_SIZE = 8;

const SITE_ENEMIES: Record<string, string[]> = {
    [SITE_TYPES.MINE]: ['orc', 'crystal_golem'],
    [SITE_TYPES.KEEP]: ['guard', 'orc_elite'],
    [SITE_TYPES.DUNGEON]: ['necromancer', 'phantom'],
    [SITE_TYPES.TOMB]: ['phantom', 'vampire'],
    [SITE_TYPES.RUINS]: ['robber'],
    [SITE_TYPES.LABYRINTH]: ['golem', 'mage'],
    [SITE_TYPES.SPAWNING_GROUNDS]: ['orc', 'ice_elemental'],
    [SITE_TYPES.MAGE_TOWER]: ['mage'],
    [SITE_TYPES.DEN]: ['orc_elite'],
    [SITE_TYPES.CITY]: ['dragon', 'guard'],
    [SITE_TYPES.MAGIC_GLADE]: ['elemental'],
    [SITE_TYPES.VILLAGE]: [],
    [SITE_TYPES.MONASTERY]: []
};

const COUNTRY_PATTERNS: TerrainType[][] = [
    [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.PLAINS],
    [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS]
];

const MINE_PATTERNS: TerrainType[][] = [
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.MOUNTAINS],
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WASTELAND],
    [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS],
    [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS],
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS]
];

const DUNGEON_PATTERNS: TerrainType[][] = [
    [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND],
    [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WATER],
    [TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS],
    [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.PLAINS],
    [TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.WATER, TERRAIN_TYPES.FOREST],
    [TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.MOUNTAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS],
    [TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.PLAINS, TERRAIN_TYPES.WASTELAND, TERRAIN_TYPES.HILLS, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.DESERT]
];

const FILLERS: Record<string, string[]> = {
    mines_focused: [SITE_TYPES.VILLAGE, SITE_TYPES.MONASTERY, SITE_TYPES.MAGE_TOWER, SITE_TYPES.MAGIC_GLADE, SITE_TYPES.DEN, SITE_TYPES.RUINS],
    dungeon_focused: [SITE_TYPES.DUNGEON, SITE_TYPES.TOMB, SITE_TYPES.RUINS, SITE_TYPES.LABYRINTH, SITE_TYPES.SPAWNING_GROUNDS, SITE_TYPES.DEN],
    countryside: [SITE_TYPES.VILLAGE, SITE_TYPES.MONASTERY, SITE_TYPES.MAGIC_GLADE, SITE_TYPES.DEN, SITE_TYPES.RUINS, SITE_TYPES.MINE]
};

export interface DeckPlacement {
    type: string;
    count?: number;
}

export interface DeckConfig {
    deck?: TerrainType[][];
    deckDistribution?: string;
    sitePlacements?: DeckPlacement[];
}

function patternsFor(distribution?: string): TerrainType[][] {
    if (distribution === 'mines_focused') return MINE_PATTERNS;
    if (distribution === 'dungeon_focused') return DUNGEON_PATTERNS;
    return COUNTRY_PATTERNS;
}

function fillerSite(distribution: string | undefined, index: number): string {
    const list = FILLERS[distribution || 'countryside'] || FILLERS.countryside;
    return list[index % list.length];
}

function sitesFromPlacements(placements: DeckPlacement[] | undefined): string[] {
    const sites: string[] = [];
    (placements || []).forEach((placement) => {
        const count = placement.count || 1;
        for (let i = 0; i < count; i++) sites.push(placement.type);
    });
    return sites;
}

export function normalizeTerrains(terrains: TerrainType[] | undefined): TerrainType[] {
    const source = terrains || [];
    const normalized: TerrainType[] = [];
    for (let i = 0; i < 7; i++) {
        normalized.push(source[i] || TERRAIN_TYPES.PLAINS);
    }
    return normalized;
}

export function makeTile(terrains: TerrainType[] | undefined, siteType: string | null): ScenarioTile {
    return {
        terrains: normalizeTerrains(terrains),
        siteType,
        enemyTypes: siteType ? (SITE_ENEMIES[siteType] ?? ['orc']) : []
    };
}

export function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
    const shuffled = items.slice();
    let state = seed >>> 0 || 1;
    for (let i = shuffled.length - 1; i > 0; i--) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const j = state % (i + 1);
        const current = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = current;
    }
    return shuffled;
}

/**
 * Builds a fixed 7-hex deck for a scenario, then shuffles it with a seed
 * taken from the scenario id so the same scenario always lays the same tiles.
 */
export function buildScenarioDeck(mapConfig: DeckConfig | null | undefined, scenarioId = 'default', count = DECK_SIZE): ScenarioTile[] {
    const config = mapConfig || {};
    const goalSites = sitesFromPlacements(config.sitePlacements);
    const distribution = config.deckDistribution;
    const patterns = patternsFor(distribution);
    const explicit = config.deck || [];
    const tiles: ScenarioTile[] = explicit.map((terrains, index) => (
        makeTile(terrains, goalSites[index] ?? fillerSite(distribution, index))
    ));

    let index = tiles.length;
    const target = Math.max(count, goalSites.length, explicit.length);
    while (tiles.length < target) {
        const site = goalSites[index] ?? fillerSite(distribution, index);
        tiles.push(makeTile(patterns[index % patterns.length], site));
        index++;
    }

    return seededShuffle(tiles, hashString(scenarioId || distribution || 'default'));
}
