import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateManager } from '../js/game/GameStateManager.js';
import { SaveManager } from '../js/persistence/SaveManager.js';
import { EnemyAI } from '../js/enemyAI.js';

/**
 * Focused tests for js/game/GameStateManager.ts (previously ~58% line coverage).
 * Exercises save/load/getState/loadState + the dialog openers.
 * SaveManager is the real persistence layer (localStorage is mocked in tests/setup.js);
 * the game subsystems are lightweight mocks.
 */

function makeGame(over = {}) {
    const fullHeroState = {
        name: 'Goldyx', level: 1, fame: 0, reputation: 0, armor: 2,
        movementPoints: 0, attackPoints: 0, blockPoints: 0, influencePoints: 0,
        healingPoints: 0, handLimit: 5, commandLimit: 1,
        position: { q: 0, r: 0 }, deck: [], hand: [], discard: [], wounds: [],
        crystals: {}, skills: [], tempMana: [], units: [], equippedArtifact: null,
    };
    return {
        isTestEnvironment: true,
        showToast: vi.fn(),
        addLog: vi.fn(),
        updateStats: vi.fn(),
        render: vi.fn(),
        hero: { getState: vi.fn(() => fullHeroState), loadState: vi.fn() },
        enemyAI: { reconstituteEnemy: vi.fn((d) => ({ ...d, reconstituted: true })) },
        entityManager: { enemies: [], loadState: vi.fn() },
        hexGrid: { getState: vi.fn(() => ({ hexes: {} })), loadState: vi.fn() },
        timeManager: { getState: vi.fn(() => ({ round: 1, timeOfDay: 'day' })), loadState: vi.fn() },
        statisticsManager: { getState: vi.fn(() => ({ wins: 0 })), loadState: vi.fn() },
        achievementManager: { getState: vi.fn(() => ({ unlocked: [] })), loadState: vi.fn() },
        turnManager: { getState: vi.fn(() => ({ turnNumber: 1 })), loadState: vi.fn() },
        phaseManager: { updateTimeUI: vi.fn(), updatePhaseIndicator: vi.fn() },
        combat: null,
        ui: null,
        ...over,
    };
}

describe('GameStateManager - save', () => {
    let game, mgr;
    beforeEach(() => { game = makeGame(); mgr = new GameStateManager(game); });

    it('saveGame persists and toasts success on number slot', () => {
        mgr.saveGame(0);
        expect(SaveManager.loadGame('slot_0')).toBeTruthy();
        expect(game.showToast).toHaveBeenCalledWith(expect.stringContaining('Slot 1'), 'success');
    });

    it('saveGame toasts error when persistence fails', () => {
        const spy = vi.spyOn(SaveManager, 'saveGame').mockReturnValue(false);
        mgr.saveGame('manual');
        expect(game.showToast).toHaveBeenCalledWith('Speichern fehlgeschlagen', 'error');
        spy.mockRestore();
    });

    it('saveGame toasts error when getGameState throws', () => {
        game.hero.getState.mockImplementation(() => { throw new Error('boom'); });
        mgr.saveGame(2);
        expect(game.showToast).toHaveBeenCalledWith('Speichern fehlgeschlagen', 'error');
    });
});

describe('GameStateManager - load', () => {
    let game, mgr;
    beforeEach(() => { localStorage.clear(); game = makeGame(); mgr = new GameStateManager(game); });

    it('loadGame returns false when no saved state', () => {
        expect(mgr.loadGame('nope')).toBe(false);
    });

    it('loadGame restores state when present', () => {
        const valid = mgr.getGameState();
        SaveManager.saveGame('slot_x', valid);
        const ok = mgr.loadGame('x');
        expect(ok).toBe(true);
        expect(game.hero.loadState).toHaveBeenCalled();
    });

    it('loadGameRaw returns the raw state object', () => {
        const valid = mgr.getGameState();
        SaveManager.saveGame('slot_raw', valid);
        const raw = mgr.loadGameRaw('raw');
        expect(raw.hero.name).toBe('Goldyx');
        expect(raw.hero.level).toBe(1);
        expect(raw.enemies).toEqual(valid.enemies);
    });

    it('loadGameRaw returns null when missing', () => {
        expect(mgr.loadGameRaw('missing')).toBeNull();
    });
});

describe('GameStateManager - getGameState', () => {
    let game, mgr;
    beforeEach(() => { game = makeGame(); mgr = new GameStateManager(game); });

    it('compiles a full state object', () => {
        const state = mgr.getGameState();
        expect(state.hero).toBeTruthy();
        expect(state.enemies).toEqual([]);
        expect(state.hexGrid).toBeTruthy();
        expect(state.time).toEqual({ round: 1, timeOfDay: 'day' });
        expect(state.statistics).toEqual({ wins: 0 });
        expect(state.achievements).toEqual({ unlocked: [] });
        expect(state.turn).toEqual({ turnNumber: 1 });
        expect(typeof state.timestamp).toBe('number');
    });

    it('serializes combat enemies with defaults', () => {
        const enemy = {
            id: 'e1', type: 'orc', name: 'Orc', position: { q: 1, r: 2 }, armor: 3,
            attack: 2, fame: 1, isBoss: false, getState: () => ({
                id: 'e1', type: 'orc', name: 'Orc', position: { q: 1, r: 2 }, armor: 3,
                attack: 2, fame: 1, isBoss: false,
            }),
        };
        game.combat = { enemies: [enemy], phase: 'attack', round: 3 };
        const state = mgr.getGameState();
        expect(state.combat).toBeTruthy();
        expect(state.combat.phase).toBe('attack');
        expect(state.combat.enemies).toHaveLength(1);
        expect(state.combat.enemies[0].armor).toBe(3);
        expect(state.combat.enemies[0].type).toBe('orc');
    });

    it('returns null combat when no combat active', () => {
        game.combat = null;
        const state = mgr.getGameState();
        expect(state.combat).toBeNull();
    });

    it('handles enemies without getState', () => {
        const plain = { id: 'p', type: 'ghost', name: 'Ghost' };
        game.combat = { enemies: [plain], phase: 'block', round: 1 };
        const state = mgr.getGameState();
        expect(state.combat.enemies[0].id).toBe('p');
        expect(state.combat.enemies[0].type).toBe('ghost');
    });
});

describe('GameStateManager - loadGameState', () => {
    let game, mgr;
    beforeEach(() => { game = makeGame(); mgr = new GameStateManager(game); });

    it('returns false for null state', () => {
        expect(mgr.loadGameState(null)).toBe(false);
    });

    it('reconstitutes enemies via enemyAI', () => {
        const state = { hero: { name: 'Goldyx' }, enemies: [{ id: 'e1' }] };
        const ok = mgr.loadGameState(state);
        expect(ok).toBe(true);
        expect(game.enemyAI.reconstituteEnemy).toHaveBeenCalledWith({ id: 'e1' });
        expect(game.enemies).toBe(game.entityManager.enemies);
        expect(game.hero.loadState).toHaveBeenCalledWith(state.hero);
    });

    it('drops null enemies produced by reconstituteEnemy (corrupt enemy type)', () => {
        // Simulate a corrupt save: reconstituteEnemy returns null for an unknown type
        game.enemyAI.reconstituteEnemy = vi.fn((d) => (d && d.type === 'known' ? { id: d.id } : null));
        const state = {
            hero: { name: 'Goldyx' },
            enemies: [{ id: 'e1', type: 'known' }, { id: 'e2', type: 'BOGUS' }]
        };
        const ok = mgr.loadGameState(state);
        expect(ok).toBe(true);
        // The null result for the corrupt enemy must NOT end up in the enemies list
        expect(game.entityManager.enemies).toEqual([{ id: 'e1' }]);
        expect(game.enemies).toEqual([{ id: 'e1' }]);
    });

    it('does not crash on a null entry inside enemies (corrupt save array)', () => {
        // A corrupt save can contain a literal null inside the enemies array.
        // The REAL EnemyAI.reconstituteEnemy reads eData.isBoss, so a null entry
        // throws on `null.isBoss` BEFORE .filter(Boolean) can drop it. loadGameState
        // must tolerate it and drop the bad entry instead of crashing the load.
        const ai = new EnemyAI({});
        game.enemyAI = ai;
        const state = { hero: { name: 'Goldyx' }, enemies: [null, { id: 'e1', type: 'orc' }] };
        const ok = mgr.loadGameState(state);
        expect(ok).toBe(true);
        // Only the single valid enemy survives; the null entry is dropped (no crash)
        expect(game.entityManager.enemies).toHaveLength(1);
        expect(game.entityManager.enemies[0]).toBeTruthy();
        expect(game.enemies).toHaveLength(1);
    });

    it('restores all subsystems and updates UI', () => {
        const state = {
            hero: { name: 'G' },
            enemies: [],
            hexGrid: { hexes: {} },
            time: { round: 2, timeOfDay: 'night' },
            statistics: { wins: 1 },
            achievements: { unlocked: ['a'] },
            turn: { turnNumber: 5 },
        };
        mgr.loadGameState(state);
        expect(game.hexGrid.loadState).toHaveBeenCalledWith(state.hexGrid);
        expect(game.timeManager.loadState).toHaveBeenCalledWith(state.time);
        expect(game.statisticsManager.loadState).toHaveBeenCalledWith(state.statistics);
        expect(game.achievementManager.loadState).toHaveBeenCalledWith(state.achievements);
        expect(game.turnManager.loadState).toHaveBeenCalledWith(state.turn);
        expect(game.updateStats).toHaveBeenCalled();
        expect(game.phaseManager.updateTimeUI).toHaveBeenCalled();
        expect(game.phaseManager.updatePhaseIndicator).toHaveBeenCalled();
    });

    it('skips render in test environment', () => {
        const state = { hero: { name: 'G' } };
        mgr.loadGameState(state);
        expect(game.render).not.toHaveBeenCalled();
    });

    it('renders outside test environment', () => {
        const orig = window.isTestEnvironment;
        window.isTestEnvironment = false;
        const g2 = makeGame({ isTestEnvironment: false });
        const m2 = new GameStateManager(g2);
        m2.loadGameState({ hero: { name: 'G' } });
        expect(g2.render).toHaveBeenCalled();
        window.isTestEnvironment = orig;
    });

    it('returns false when loadState throws', () => {
        game.hero.loadState.mockImplementation(() => { throw new Error('bad'); });
        const ok = mgr.loadGameState({ hero: { name: 'G' } });
        expect(ok).toBe(false);
    });
});

describe('GameStateManager - dialogs', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        game = makeGame({ ui: { showSaveLoad: vi.fn(), showScenarioSelection: vi.fn(), showHeroSelection: vi.fn() } });
        mgr = new GameStateManager(game);
    });

    it('openSaveDialog saves when a slot is chosen', async () => {
        game.ui.showSaveLoad.mockResolvedValue(3);
        await mgr.openSaveDialog();
        expect(game.ui.showSaveLoad).toHaveBeenCalledWith('save');
        expect(SaveManager.loadGame('slot_3')).toBeTruthy();
    });

    it('openSaveDialog does nothing when cancelled', async () => {
        game.ui.showSaveLoad.mockResolvedValue(null);
        await mgr.openSaveDialog();
        expect(SaveManager.loadGame('slot_cancel')).toBeNull();
    });

    it('openLoadDialog loads when a slot is chosen and state exists', async () => {
        const valid = mgr.getGameState();
        SaveManager.saveGame('slot_l', valid);
        game.ui.showSaveLoad.mockResolvedValue('l');
        await mgr.openLoadDialog();
        expect(game.hero.loadState).toHaveBeenCalled();
        expect(game.showToast).toHaveBeenCalledWith('Spiel geladen!', 'success');
    });

    it('openLoadDialog toasts error when state missing', async () => {
        game.ui.showSaveLoad.mockResolvedValue('empty');
        await mgr.openLoadDialog();
        expect(game.showToast).toHaveBeenCalledWith('Fehler beim Laden', 'error');
    });

    it('openScenarioSelection calls ui when available', async () => {
        await mgr.openScenarioSelection();
        expect(game.ui.showScenarioSelection).toHaveBeenCalled();
    });

    it('openHeroSelection calls ui with scenarioId', async () => {
        await mgr.openHeroSelection('s1');
        expect(game.ui.showHeroSelection).toHaveBeenCalledWith('s1');
    });

    it('dialog methods are no-ops without ui', async () => {
        const g2 = makeGame({ ui: null });
        const m2 = new GameStateManager(g2);
        await expect(m2.openSaveDialog()).resolves.toBeUndefined();
        await expect(m2.openLoadDialog()).resolves.toBeUndefined();
        await expect(m2.openScenarioSelection()).resolves.toBeUndefined();
        await expect(m2.openHeroSelection('s')).resolves.toBeUndefined();
    });
});
