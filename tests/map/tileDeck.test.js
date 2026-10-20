import { describe, it, expect, vi } from 'vitest';
import { HexGridLogic } from '../../js/hexgrid/HexGridLogic.js';
import { MapManager } from '../../js/mapManager.js';
import { buildScenarioDeck } from '../../js/map/tileDeck.js';
import { TERRAIN_TYPES } from '../../js/constants.js';
import { SITE_TYPES } from '../../js/sites.js';
import { ScenarioManager } from '../../js/game/ScenarioManager.js';

describe('scenario tile deck', () => {
    it('keeps every goal site from the scenario and shuffles by scenario id', () => {
        const scenario = new ScenarioManager({}).loadScenario('mines_freedom');
        const deck = buildScenarioDeck(scenario.mapConfig, scenario.id);

        expect(deck.length).toBeGreaterThanOrEqual(8);
        deck.forEach((tile) => expect(tile.terrains).toHaveLength(7));
        expect(deck.filter((tile) => tile.siteType === SITE_TYPES.MINE)).toHaveLength(2);
        expect(deck.some((tile) => tile.siteType === SITE_TYPES.KEEP)).toBe(true);
        expect(deck.find((tile) => tile.siteType === SITE_TYPES.MINE).enemyTypes).toEqual(['orc', 'crystal_golem']);
        expect(buildScenarioDeck(scenario.mapConfig, scenario.id)).toEqual(deck);
    });

    it('uses an explicit terrain deck and still includes the scenario sites', () => {
        const scenario = new ScenarioManager({}).loadScenario('druid_nights');
        const deck = buildScenarioDeck(scenario.mapConfig, scenario.id);
        const grounds = deck.filter((tile) => tile.siteType === SITE_TYPES.SPAWNING_GROUNDS);

        expect(deck.length).toBeGreaterThanOrEqual(scenario.mapConfig.deck.length);
        expect(grounds).toHaveLength(2);
        expect(grounds[0].enemyTypes).toContain('ice_elemental');
    });
});

describe('start tile', () => {
    it('offers a village and leaves the scenario goals in the deck', () => {
        const scenario = new ScenarioManager({}).loadScenario('mines_freedom');
        const hexGrid = new HexGridLogic();
        const mapManager = new MapManager({ hexGrid });
        mapManager.createStartingMap(scenario);

        const startHexes = [...hexGrid.hexes.values()].filter((hex) => hexGrid.distance(0, 0, hex.q, hex.r) <= 1);
        const sites = startHexes.filter((hex) => hex.site).map((hex) => hex.site.type);
        expect(sites).toEqual([SITE_TYPES.VILLAGE]);
        expect(hexGrid.getHex(0, 0).site).toBeUndefined();
        expect(mapManager.tilesDeck.filter((tile) => tile.siteType === SITE_TYPES.MINE)).toHaveLength(2);
        expect(mapManager.tilesDeck.some((tile) => tile.siteType === SITE_TYPES.KEEP)).toBe(true);
    });

    it('does not put spawning grounds on the druid start tile', () => {
        const scenario = new ScenarioManager({}).loadScenario('druid_nights');
        const hexGrid = new HexGridLogic();
        const mapManager = new MapManager({ hexGrid });
        mapManager.createStartingMap(scenario);

        const grounds = [...hexGrid.hexes.values()].filter((hex) => hex.site && hex.site.type === SITE_TYPES.SPAWNING_GROUNDS);
        expect(grounds).toHaveLength(0);
        expect([...hexGrid.hexes.values()].some((hex) => hex.site && hex.site.type === SITE_TYPES.VILLAGE)).toBe(true);
        expect(mapManager.tilesDeck.filter((tile) => tile.siteType === SITE_TYPES.SPAWNING_GROUNDS)).toHaveLength(2);
    });
});

describe('MapManager tile placement', () => {
    function startMap() {
        const hexGrid = new HexGridLogic();
        const events = {
            onTileRevealed: vi.fn(),
            getRandomEvent: vi.fn(() => ({ type: 'storm', text: 'Sturm' }))
        };
        const mapManager = new MapManager({ hexGrid });
        mapManager.setWorldEventManager(events);
        mapManager.createMapFromStartTile([
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.MOUNTAINS,
            TERRAIN_TYPES.WASTELAND,
            TERRAIN_TYPES.DESERT,
            TERRAIN_TYPES.PLAINS
        ]);
        return { hexGrid, mapManager, events };
    }

    it('lays the next tile on the open edge without changing the start tile', () => {
        const { hexGrid, mapManager } = startMap();
        const startTerrain = hexGrid.getHex(1, 0).terrain;
        const startSize = hexGrid.hexes.size;
        mapManager.tilesDeck = [{
            terrains: [
                TERRAIN_TYPES.HILLS,
                TERRAIN_TYPES.MOUNTAINS,
                TERRAIN_TYPES.FOREST,
                TERRAIN_TYPES.PLAINS,
                TERRAIN_TYPES.WASTELAND,
                TERRAIN_TYPES.DESERT,
                TERRAIN_TYPES.HILLS
            ],
            siteType: SITE_TYPES.MINE,
            enemyTypes: ['orc', 'crystal_golem']
        }, {
            terrains: Array(7).fill(TERRAIN_TYPES.FOREST),
            siteType: SITE_TYPES.VILLAGE,
            enemyTypes: []
        }];

        const first = mapManager.explore(1, 0);

        expect(first.success).toBe(true);
        expect(first.siteType).toBe(SITE_TYPES.MINE);
        expect(first.siteName).toBe('Mine');
        expect(first.enemies).toHaveLength(2);
        expect(first.enemies[0].type).toBe('orc');
        expect(first.enemies[1].type).toBe('crystal_golem');
        expect(first.enemies[1]).toMatchObject({ q: first.enemies[0].q, r: first.enemies[0].r });
        expect(hexGrid.getHex(1, 0).terrain).toBe(startTerrain);
        expect(hexGrid.getHex(1, 0).site).toBeUndefined();
        expect(hexGrid.hexes.size).toBeGreaterThan(startSize);

        const mines = [...hexGrid.hexes.values()].filter((hex) => hex.site && hex.site.type === SITE_TYPES.MINE);
        expect(mines).toHaveLength(1);
        expect(mines[0].revealed).toBe(true);
        expect(first.enemies[0]).toMatchObject({ q: mines[0].q, r: mines[0].r });

        const afterFirst = hexGrid.hexes.size;
        const edge = first.placed.find((hex) => (
            hexGrid.getNeighbors(hex.q, hex.r).some((neighbor) => !hexGrid.hasHex(neighbor.q, neighbor.r))
        ));
        const second = mapManager.explore(edge.q, edge.r);
        expect(second.success).toBe(true);
        expect(second.siteType).toBe(SITE_TYPES.VILLAGE);
        expect(second.enemies).toEqual([]);
        expect(hexGrid.hexes.size).toBeGreaterThan(afterFirst);
        expect(hexGrid.getHex(1, 0).terrain).toBe(startTerrain);
    });

    it('round-trips the remaining deck through save state', () => {
        const { mapManager } = startMap();
        mapManager.tilesDeck = [{
            terrains: Array(7).fill(TERRAIN_TYPES.DESERT),
            siteType: SITE_TYPES.KEEP,
            enemyTypes: ['guard']
        }];

        const saved = mapManager.getDeckState();
        mapManager.tilesDeck = [];
        mapManager.loadDeckState(saved);

        expect(mapManager.tilesDeck).toEqual(saved);
        const placed = mapManager.explore(1, 0);
        expect(placed.siteType).toBe(SITE_TYPES.KEEP);
        expect(mapManager.tilesDeck).toEqual([]);
    });

    it('notifies spawning grounds and rolls a world event', () => {
        const { mapManager, events } = startMap();
        mapManager.tilesDeck = [{
            terrains: Array(7).fill(TERRAIN_TYPES.WASTELAND),
            siteType: SITE_TYPES.SPAWNING_GROUNDS,
            enemyTypes: ['orc']
        }];
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.95);

        const result = mapManager.explore(1, 0);

        expect(result.success).toBe(true);
        expect(result.event).toEqual({ type: 'storm', text: 'Sturm' });
        expect(events.onTileRevealed).toHaveBeenCalledTimes(1);
        const [q, r, hex] = events.onTileRevealed.mock.calls[0];
        expect(hex.site.type).toBe(SITE_TYPES.SPAWNING_GROUNDS);
        expect(hex.q).toBe(q);
        expect(hex.r).toBe(r);
        random.mockRestore();
    });

    it('skips the world event when the roll is quiet', () => {
        const { mapManager, events } = startMap();
        mapManager.tilesDeck = [{
            terrains: Array(7).fill(TERRAIN_TYPES.PLAINS),
            siteType: SITE_TYPES.RUINS,
            enemyTypes: ['robber']
        }];
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.2);

        const result = mapManager.explore(1, 0);

        expect(result.success).toBe(true);
        expect(result.event).toBeNull();
        expect(events.getRandomEvent).not.toHaveBeenCalled();
        random.mockRestore();
    });
});
