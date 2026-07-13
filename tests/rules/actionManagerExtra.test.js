/**
 * ActionManager EXTRA behavioral tests (foundation hardening, round 3).
 * Pushes ActionManager branch coverage above 80% by exercising the
 * remaining real branches: combat checkpoint save/restore with the
 * combatOrchestrator subset, movement-mode guards, explore side-effects
 * (statistics / particles / haptics / event modal), and visitSite.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionManager } from '../../js/game/ActionManager';

function makeMockGame(overrides = {}) {
    const hero = {
        movementPoints: 4,
        hasSkill: () => false,
        position: { q: 0, r: 0 },
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
            highlightHexes: vi.fn(),
            clearSelection: () => { },
            getScreenPos: () => ({ x: 0, y: 0 })
        },
        siteManager: { visitSite: vi.fn(() => ({})) },
        entityManager: { createEnemies: vi.fn() },
        animator: null,
        statisticsManager: null,
        ui: null,
        particleSystem: null,
        haptics: null,
        addLog: vi.fn(),
        showToast: vi.fn(),
        updateStats: vi.fn(),
        render: vi.fn(),
        renderHand: vi.fn(),
        renderMana: vi.fn(),
        updatePhaseIndicator: vi.fn(),
        checkAndShowAchievements: null,
        ...overrides
    };
    return game;
}

describe('ActionManager Extra — combat checkpoint save/restore', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame({
            combat: { getState: () => ({ phase: 'attack', round: 2 }), loadState: vi.fn() },
            combatOrchestrator: {
                combatAttackTotal: 5,
                combatBlockTotal: 3,
                activeBlocks: [{ id: 'b' }],
                combatRangedTotal: 2,
                combatSiegeTotal: 1,
                updateCombatInfo: vi.fn(),
                renderUnitsInCombat: vi.fn()
            }
        });
        // hero.loadState must reflect saved movement state
        game.hero.loadState = vi.fn((s) => { game.hero.movementPoints = s.movementPoints; game.hero.position = s.position; });
        am = new ActionManager(game);
    });

    it('saveCheckpoint captures combat + orchestrator subset when both present', () => {
        am.saveCheckpoint();
        expect(am.history.length).toBe(1);
        const cp = am.history[0];
        expect(cp.combat).toEqual({ phase: 'attack', round: 2 });
        expect(cp.orchestrator).toEqual({
            attackTotal: 5, blockTotal: 3, activeBlocks: [{ id: 'b' }],
            rangedTotal: 2, siegeTotal: 1
        });
    });

    it('undoLastAction restores combat and pushes orchestrator state + UI refresh', () => {
        am.saveCheckpoint();
        // mutate orchestrator state after checkpoint
        game.combatOrchestrator.combatAttackTotal = 99;
        game.combatOrchestrator.activeBlocks = [];
        am.undoLastAction();
        expect(game.combat.loadState).toHaveBeenCalledWith({ phase: 'attack', round: 2 });
        expect(game.combatOrchestrator.combatAttackTotal).toBe(5);
        expect(game.combatOrchestrator.activeBlocks).toEqual([{ id: 'b' }]);
        expect(game.combatOrchestrator.updateCombatInfo).toHaveBeenCalled();
        expect(game.combatOrchestrator.renderUnitsInCombat).toHaveBeenCalled();
    });

    it('saveCheckpoint with combat but WITHOUT orchestrator stores no orchestrator', () => {
        game.combatOrchestrator = null;
        am = new ActionManager(game);
        am.saveCheckpoint();
        expect(am.history[0].orchestrator).toBeUndefined();
    });
});

describe('ActionManager Extra — movement mode guards', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame();
        am = new ActionManager(game);
    });

    it('enterMovementMode is a no-op when gameState is not playing', () => {
        game.gameState = 'gameover';
        am.enterMovementMode();
        expect(game.movementMode).toBe(false);
    });

    it('enterMovementMode is a no-op during combat', () => {
        game.combat = { loadState: vi.fn() };
        am.enterMovementMode();
        expect(game.movementMode).toBe(false);
    });

    it('enterMovementMode activates mode + reachable hexes when playing & no combat', () => {
        am.enterMovementMode();
        expect(game.movementMode).toBe(true);
        expect(game.hexGrid.highlightHexes).toHaveBeenCalled();
        expect(game.updatePhaseIndicator).toHaveBeenCalled();
    });

    it('exitMovementMode skips hexGrid.clearSelection when hexGrid absent', () => {
        game.hexGrid = null;
        // Should not throw
        expect(() => am.exitMovementMode()).not.toThrow();
        expect(game.movementMode).toBe(false);
    });

    it('calculateReachableHexes is a no-op without hero or hexGrid', () => {
        game.hero = null;
        game.hexGrid = null;
        expect(() => am.calculateReachableHexes()).not.toThrow();
    });
});

describe('ActionManager Extra — explore side-effects', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame({
            statisticsManager: { increment: vi.fn() },
            particleSystem: {
                discoveryEffect: vi.fn(),
                triggerShake: vi.fn(),
                freeze: vi.fn()
            },
            haptics: vi.fn(),
            ui: { showEventModal: vi.fn() }
        });
        am = new ActionManager(game);
    });

    it('explore fires particles, haptics, stats increment, and event modal on success', () => {
        game.mapManager.explore = () => ({ success: true, event: { title: 'Storm' } });
        game.hexGrid.exploreAdjacent = () => [{ q: 1, r: 0 }];
        am.explore();
        expect(game.statisticsManager.increment).toHaveBeenCalledWith('tilesExplored', 8); // 7 + 1
        expect(game.particleSystem.discoveryEffect).toHaveBeenCalled();
        expect(game.particleSystem.triggerShake).toHaveBeenCalledWith(4, 0.4);
        expect(game.particleSystem.freeze).toHaveBeenCalledWith(0.05);
        expect(game.haptics).toHaveBeenCalledWith(30);
        expect(game.ui.showEventModal).toHaveBeenCalledWith({ title: 'Storm' });
    });

    it('explore toasts info when there is nothing to discover', () => {
        game.mapManager.explore = () => ({ success: false });
        game.hexGrid.exploreAdjacent = () => [];
        am.explore();
        expect(game.showToast).toHaveBeenCalledWith('Hier gibt es nichts mehr zu entdecken.', 'info');
        expect(game.entityManager.createEnemies).not.toHaveBeenCalled();
    });

    it('explore skips event modal when no event is returned', () => {
        game.mapManager.explore = () => ({ success: true });
        game.hexGrid.exploreAdjacent = () => [];
        am.explore();
        expect(game.ui.showEventModal).not.toHaveBeenCalled();
    });
});

describe('ActionManager Extra — combat card play + visitSite', () => {
    let game;
    let am;

    beforeEach(() => {
        game = makeMockGame();
        am = new ActionManager(game);
    });

    it('playCard delegates to combatOrchestrator during combat', () => {
        game.combat = { loadState: vi.fn() };
        game.combatOrchestrator = {
            playCardInCombat: vi.fn(),
            combatAttackTotal: 0, combatBlockTotal: 0, activeBlocks: [],
            combatRangedTotal: 0, combatSiegeTotal: 0,
            updateCombatInfo: vi.fn(), renderUnitsInCombat: vi.fn()
        };
        game.hero.hand = [{ id: 'c1' }];
        am.playCard(0, false, false);
        expect(game.combatOrchestrator.playCardInCombat).toHaveBeenCalledWith(0, { id: 'c1' });
    });

    it('playCardSideways returns null during combat (no checkpoint)', () => {
        game.combat = { loadState: vi.fn() };
        const before = am.history.length;
        const result = am.playCardSideways(0, 'fire');
        expect(result).toBeNull();
        expect(am.history.length).toBe(before);
    });

    it('visitSite is a no-op during combat', () => {
        game.combat = { loadState: vi.fn() };
        am.visitSite();
        expect(game.siteManager.visitSite).not.toHaveBeenCalled();
    });

    it('visitSite returns early when there is no site at the position', () => {
        game.hexGrid.getHex = () => ({ terrain: 'plains' }); // no .site
        am.visitSite();
        expect(game.siteManager.visitSite).not.toHaveBeenCalled();
    });

    it('visitSite shows modal via ui when a site is present', () => {
        const site = { getName: () => 'Mine' };
        game.hexGrid.getHex = () => ({ terrain: 'plains', site });
        game.ui = { showSiteModal: vi.fn() };
        am.visitSite();
        expect(game.siteManager.visitSite).toHaveBeenCalled();
        expect(game.ui.showSiteModal).toHaveBeenCalled();
    });
});
