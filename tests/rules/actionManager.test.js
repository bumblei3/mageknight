/**
 * ActionManager behavioral tests (foundation hardening).
 * Covers undo boundary cases, card/mana failure checkpoint rollback,
 * movement guards, and combat-trigger-on-move.
 * Mirrors the mockGame wiring style of rules/movement_rules.test.js.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionManager } from '../../js/game/ActionManager';

// Build a fully-wired mock game mirroring ActionManager's real consumers.
function makeMockGame(overrides = {}) {
    const hero = {
        movementPoints: 4,
        hasSkill: () => false,
        position: { q: 0, r: 0 },
        // Snapshot / restore plumbing used by saveCheckpoint / undoLastAction
        getState: () => ({ movementPoints: hero.movementPoints, position: { ...hero.position } }),
        loadState: (s) => { hero.movementPoints = s.movementPoints; hero.position = { ...s.position }; },
        playCard: () => ({ ok: true }),
        playCardSideways: () => ({ ok: true }),
        takeManaFromSource: () => { }
    };

    const manaSource = {
        getState: () => ({ dice: 3 }),
        loadState: () => { },
        takeDie: () => 'red'
    };

    const game = {
        hero,
        manaSource,
        movementMode: false,
        gameState: 'playing',
        combat: null,
        combatOrchestrator: null,
        enemies: [],
        reachableHexes: [],
        timeManager: { isDay: () => true, isNight: () => false },
        mapManager: { explore: () => ({ success: true }) },
        hexGrid: {
            distance: () => 1,
            getMovementCost: () => 2,
            getReachableHexes: () => [],
            exploreAdjacent: () => [],
            getHex: () => null,
            highlightHexes: () => { },
            clearSelection: () => { },
            getScreenPos: () => ({ x: 0, y: 0 })
        },
        siteManager: { visitSite: () => ({}) },
        entityManager: { createEnemies: () => { } },
        animator: null,
        statisticsManager: { increment: () => { } },
        ui: null,
        particleSystem: null,
        haptics: null,
        addLog: () => { },
        showToast: vi.fn(),
        updateStats: () => { },
        render: () => { },
        renderHand: () => { },
        renderMana: () => { },
        updatePhaseIndicator: () => { },
        checkAndShowAchievements: null,
        // allow arbitrary extra wiring
        ...overrides
    };
    return game;
}

describe('ActionManager — Undo boundaries', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame();
        am = new ActionManager(game);
    });

    it('undoLastAction with empty history shows an info toast and does nothing', () => {
        expect(am.history.length).toBe(0);
        am.undoLastAction();
        expect(game.showToast).toHaveBeenCalledWith('Nichts zum Rückgängig machen.', 'info');
    });

    it('undoLastAction refuses to cross combat boundaries and clears history', () => {
        // Simulate a non-combat checkpoint already on the stack
        am.history.push({ hero: game.hero.getState(), mana: game.manaSource.getState(), timestamp: Date.now() });
        // Now the game is in combat but the top checkpoint is non-combat
        game.combat = { loadState: vi.fn() };
        am.undoLastAction();
        expect(game.showToast).toHaveBeenCalledWith(
            'Kann nicht über Kampf-Grenzen hinweg rückgängig machen.', 'error'
        );
        expect(am.history.length).toBe(0);
    });

    it('saveCheckpoint caps history at MAX_HISTORY (20) via shift', () => {
        for (let i = 0; i < 25; i++) {
            am.saveCheckpoint();
        }
        expect(am.history.length).toBe(20);
        // Oldest items evicted: first pushed checkpoint is gone
        expect(am.history[0].timestamp).not.toBeUndefined();
    });

    it('undoLastAction restores hero movement points and position from checkpoint', () => {
        game.hero.movementPoints = 4;
        game.hero.position = { q: 0, r: 0 };
        am.saveCheckpoint();
        // Mutate after checkpoint
        game.hero.movementPoints = 1;
        game.hero.position = { q: 2, r: 0 };
        am.undoLastAction();
        expect(game.hero.movementPoints).toBe(4);
        expect(game.hero.position).toEqual({ q: 0, r: 0 });
    });
});

describe('ActionManager — Card / Mana checkpoint rollback on failure', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame();
        am = new ActionManager(game);
    });

    it('playCard(null) on failure pops the checkpoint (no dead history entry)', () => {
        game.hero.playCard = () => null; // simulate failed card play
        const before = am.history.length;
        const result = am.playCard(0, false, false);
        expect(result).toBeNull();
        expect(am.history.length).toBe(before); // checkpoint popped back
    });

    it('playCard success keeps the checkpoint and returns the result', () => {
        game.hero.playCard = () => ({ ok: true });
        const before = am.history.length;
        const result = am.playCard(0, false, false);
        expect(result).toEqual({ ok: true });
        expect(am.history.length).toBe(before + 1);
    });

    it('playCardSideways(null) on failure pops the checkpoint', () => {
        game.hero.playCardSideways = () => null;
        const before = am.history.length;
        const result = am.playCardSideways(0, 'fire');
        expect(result).toBeNull();
        expect(am.history.length).toBe(before);
    });

    it('takeMana failure (no die) pops the checkpoint', () => {
        game.manaSource.takeDie = () => null;
        const before = am.history.length;
        const result = am.takeMana(0, 'red');
        expect(result).toBeNull();
        expect(am.history.length).toBe(before);
    });

    it('takeMana success keeps the checkpoint and returns the die', () => {
        game.manaSource.takeDie = () => 'blue';
        const before = am.history.length;
        const result = am.takeMana(0, 'blue');
        expect(result).toBe('blue');
        expect(am.history.length).toBe(before + 1);
    });
});

describe('ActionManager — Movement guards', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame({ animator: null });
        am = new ActionManager(game);
    });

    it('moveHero ignored when not in movement mode', async () => {
        game.movementMode = false;
        const moved = await am.moveHero(1, 0);
        // moveHero is fire-and-forget; assert no state change via guard
        expect(game.hero.position).toEqual({ q: 0, r: 0 });
    });

    it('moveHero ignored when game state is not playing', async () => {
        game.movementMode = true;
        game.gameState = 'gameover';
        await am.moveHero(1, 0);
        expect(game.hero.position).toEqual({ q: 0, r: 0 });
    });

    it('moveHero rejects non-adjacent target (distance != 1) with a toast', async () => {
        game.movementMode = true;
        game.hexGrid.distance = () => 3; // not adjacent
        await am.moveHero(3, 0);
        expect(game.hero.position).toEqual({ q: 0, r: 0 });
        expect(game.showToast).toHaveBeenCalledWith(
            'Du kannst dich nur auf angrenzende Felder bewegen!', 'warning'
        );
    });

    it('moveHero rejects move when movement points are insufficient', async () => {
        game.movementMode = true;
        game.hero.movementPoints = 1;
        game.hexGrid.getMovementCost = () => 2; // cost exceeds available
        await am.moveHero(1, 0);
        expect(game.hero.position).toEqual({ q: 0, r: 0 });
        expect(game.showToast).toHaveBeenCalledWith('Nicht genug Bewegungspunkte!', 'warning');
    });

    it('moveHero consumes points on a valid adjacent move', async () => {
        game.movementMode = true;
        game.hero.movementPoints = 4;
        game.hexGrid.distance = () => 1;
        game.hexGrid.getMovementCost = () => 2;
        await am.moveHero(1, 0);
        expect(game.hero.position).toEqual({ q: 1, r: 0 });
        expect(game.hero.movementPoints).toBe(2);
    });

    it('valid move onto an enemy triggers combat and clears history', async () => {
        game.movementMode = true;
        game.hero.movementPoints = 4;
        game.hexGrid.distance = () => 1;
        game.hexGrid.getMovementCost = () => 2;
        const enemy = { isDefeated: () => false, position: { q: 1, r: 0 } };
        game.enemies = [enemy];
        game.combatOrchestrator = { initiateCombat: vi.fn() };
        // pre-seed a checkpoint so we can verify it gets cleared
        am.saveCheckpoint();
        await am.moveHero(1, 0);
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledWith(enemy);
        expect(am.history.length).toBe(0); // history cleared on combat start
    });
});

describe('ActionManager — explore guard', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame();
        am = new ActionManager(game);
    });

    it('explore is a no-op when not playing', () => {
        game.gameState = 'gameover';
        const explored = vi.fn(() => ({ success: true }));
        game.mapManager.explore = explored;
        am.explore();
        expect(explored).not.toHaveBeenCalled();
    });

    it('explore is a no-op during combat', () => {
        game.combat = { loadState: vi.fn() };
        const explored = vi.fn(() => ({ success: true }));
        game.mapManager.explore = explored;
        am.explore();
        expect(explored).not.toHaveBeenCalled();
    });
});
