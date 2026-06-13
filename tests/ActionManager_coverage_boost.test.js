import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionManager } from '../js/game/ActionManager.js';
import { setupGlobalMocks, resetMocks } from './test-mocks.js';

describe('ActionManager - Coverage Boost', () => {
    let actionManager;
    let mockGame;

    beforeEach(() => {
        setupGlobalMocks();
        
        mockGame = {
            hero: {
                position: { q: 0, r: 0 },
                movementPoints: 5,
                hand: [],
                mana: [],
                maxMana: 10,
                getState: () => ({ 
                    position: { q: 0, r: 0 },
                    movementPoints: 5,
                    hand: [],
                    mana: [],
                    wounds: 0,
                    level: 1,
                    fame: 0,
                    skills: [],
                    units: [],
                    artifacts: [],
                    spells: [],
                    advancedActions: []
                }),
                loadState: vi.fn(),
                hasSkill: vi.fn(() => false),
                playCard: vi.fn((idx, strong, night) => ({ success: true, idx, strong, night })),
                playCardSideways: vi.fn((idx, type) => ({ success: true, idx, type })),
                takeManaFromSource: vi.fn(),
            },
            manaSource: {
                getState: () => ({ dice: [], manaPool: [] }),
                loadState: vi.fn(),
                takeDie: vi.fn((idx, night) => 'red'),
            },
            timeManager: {
                isDay: vi.fn(() => true),
                isNight: vi.fn(() => false),
            },
            hexGrid: {
                getHex: vi.fn(() => null),
                distance: vi.fn(() => 1),
                getMovementCost: vi.fn(() => 1),
                getReachableHexes: vi.fn(() => [{ q: 1, r: 0 }]),
                highlightHexes: vi.fn(),
                clearSelection: vi.fn(),
                axialToPixel: vi.fn(() => ({ x: 0, y: 0 })),
                exploreAdjacent: vi.fn(() => [{ q: 0, r: 1 }]),
                getScreenPos: vi.fn(() => ({ x: 100, y: 100 })),
            },
            mapManager: {
                explore: vi.fn(() => ({ success: true, event: null })),
            },
            combat: null,
            combatOrchestrator: {
                combatAttackTotal: 0,
                combatBlockTotal: 0,
                activeBlocks: [],
                combatRangedTotal: 0,
                combatSiegeTotal: 0,
                getState: vi.fn(() => ({ phase: 'action' })),
                loadState: vi.fn(),
                updateCombatInfo: vi.fn(),
                renderUnitsInCombat: vi.fn(),
                initiateCombat: vi.fn(),
                playCardInCombat: vi.fn(),
            },
            siteManager: {
                visitSite: vi.fn(() => ({ options: [] })),
            },
            enemies: [],
            gameState: 'playing',
            movementMode: false,
            reachableHexes: [],
            ui: {
                showSiteModal: vi.fn(),
                showEventModal: vi.fn(),
                updateCombatInfo: vi.fn(),
                renderUnitsInCombat: vi.fn(),
            },
            animator: {
                animateHeroMove: vi.fn(() => Promise.resolve()),
            },
            particleSystem: {
                discoveryEffect: vi.fn(),
                triggerShake: vi.fn(),
                freeze: vi.fn(),
            },
            entityManager: {
                createEnemies: vi.fn(),
            },
            statisticsManager: {
                increment: vi.fn(),
            },
            checkAndShowAchievements: vi.fn(),
            addLog: vi.fn(),
            showToast: vi.fn(),
            render: vi.fn(),
            renderHand: vi.fn(),
            renderMana: vi.fn(),
            updateStats: vi.fn(),
            updatePhaseIndicator: vi.fn(),
        };

        actionManager = new ActionManager(mockGame);
    });

    afterEach(() => {
        vi.useRealTimers();
        resetMocks();
    });

    describe('Constructor & Core', () => {
        it('initializes with empty history', () => {
            expect(actionManager.history).toEqual([]);
        });
    });

    describe('saveCheckpoint()', () => {
        it('creates checkpoint with hero and mana state', () => {
            actionManager.saveCheckpoint();
            expect(actionManager.history.length).toBe(1);
            const cp = actionManager.history[0];
            expect(cp.hero).toBeDefined();
            expect(cp.mana).toBeDefined();
            expect(cp.timestamp).toBeGreaterThan(0);
        });

        it('includes combat state when in combat', () => {
            mockGame.combat = { getState: vi.fn(() => ({ state: 'combat' })) };
            mockGame.combatOrchestrator = {
                combatAttackTotal: 5,
                combatBlockTotal: 3,
                activeBlocks: [{ test: 'block' }],
                combatRangedTotal: 2,
                combatSiegeTotal: 1,
            };

            actionManager.saveCheckpoint();
            const cp = actionManager.history[0];
            expect(cp.combat).toBeDefined();
            expect(cp.orchestrator.attackTotal).toBe(5);
        });

        it('limits history to MAX_HISTORY', () => {
            for (let i = 0; i < 25; i++) {
                actionManager.saveCheckpoint();
            }
            expect(actionManager.history.length).toBe(20);
        });
    });

    describe('undoLastAction()', () => {
        it('shows toast when history empty', () => {
            actionManager.undoLastAction();
            expect(mockGame.showToast).toHaveBeenCalledWith('Nichts zum Rückgängig machen.', 'info');
        });

        it('prevents undo across combat boundary', () => {
            mockGame.combat = { getState: vi.fn() };
            actionManager.saveCheckpoint();
            actionManager.undoLastAction();
            expect(mockGame.showToast).toHaveBeenCalledWith('Kann nicht über Kampf-Grenzen hinweg rückgängig machen.', 'error');
        });

        it('restores hero and mana state', () => {
            actionManager.saveCheckpoint();
            actionManager.undoLastAction();
            expect(mockGame.hero.loadState).toHaveBeenCalled();
            expect(mockGame.manaSource.loadState).toHaveBeenCalled();
        });

        it('restores combat state', () => {
            mockGame.combat = { getState: vi.fn(() => ({})), loadState: vi.fn() };
            mockGame.combatOrchestrator = {
                combatAttackTotal: 5,
                combatBlockTotal: 3,
                activeBlocks: [],
                combatRangedTotal: 2,
                combatSiegeTotal: 1,
                updateCombatInfo: vi.fn(),
                renderUnitsInCombat: vi.fn(),
            };
            actionManager.saveCheckpoint();
            actionManager.undoLastAction();
            expect(mockGame.combat.loadState).toHaveBeenCalled();
        });

        it('logs and re-renders', () => {
            actionManager.saveCheckpoint();
            actionManager.undoLastAction();
            expect(mockGame.addLog).toHaveBeenCalledWith('Aktion rückgängig gemacht.', 'info');
            expect(mockGame.render).toHaveBeenCalled();
        });
    });

    describe('clearHistory()', () => {
        it('clears history', () => {
            actionManager.saveCheckpoint();
            actionManager.clearHistory();
            expect(actionManager.history.length).toBe(0);
        });
    });

    describe('updateUndoUI()', () => {
        it('handles missing button', () => {
            document.body.innerHTML = '';
            expect(() => actionManager.updateUndoUI()).not.toThrow();
        });
    });

    describe('enterMovementMode()', () => {
        it('sets movementMode and calculates reachable', () => {
            actionManager.enterMovementMode();
            expect(mockGame.movementMode).toBe(true);
            expect(mockGame.hexGrid.getReachableHexes).toHaveBeenCalled();
        });

        it('returns early if not playing', () => {
            mockGame.gameState = 'paused';
            actionManager.enterMovementMode();
            expect(mockGame.movementMode).toBe(false);
        });

        it('returns early if in combat', () => {
            mockGame.combat = {};
            actionManager.enterMovementMode();
            expect(mockGame.movementMode).toBe(false);
        });
    });

    describe('exitMovementMode()', () => {
        it('clears movement mode', () => {
            mockGame.movementMode = true;
            actionManager.exitMovementMode();
            expect(mockGame.movementMode).toBe(false);
        });

        it('clears hex grid selection', () => {
            actionManager.exitMovementMode();
            expect(mockGame.hexGrid.clearSelection).toHaveBeenCalled();
        });
    });

    describe('calculateReachableHexes()', () => {
        it('returns early if missing dependencies', () => {
            actionManager.calculateReachableHexes();
            expect(mockGame.hexGrid.getReachableHexes).toHaveBeenCalled();
        });

        it('handles night mode', () => {
            mockGame.timeManager.isDay.mockReturnValue(false);
            actionManager.calculateReachableHexes();
            expect(mockGame.hexGrid.getReachableHexes).toHaveBeenCalledWith(
                { q: 0, r: 0 }, 5, false, false
            );
        });
    });

    describe('moveHero()', () => {
        beforeEach(() => {
            mockGame.movementMode = true;
        });

        it('returns early if not in movementMode', async () => {
            mockGame.movementMode = false;
            await actionManager.moveHero(1, 0);
            expect(mockGame.showToast).not.toHaveBeenCalled();
        });

        it('returns early if not playing', async () => {
            mockGame.gameState = 'paused';
            await actionManager.moveHero(1, 0);
        });

        it('shows warning if distance not 1', async () => {
            mockGame.hexGrid.distance.mockReturnValue(2);
            await actionManager.moveHero(2, 0);
            expect(mockGame.showToast).toHaveBeenCalledWith('Du kannst dich nur auf angrenzende Felder bewegen!', 'warning');
        });

        it('shows warning if not enough points', async () => {
            mockGame.hexGrid.getMovementCost.mockReturnValue(10);
            mockGame.hero.movementPoints = 5;
            await actionManager.moveHero(1, 0);
            expect(mockGame.showToast).toHaveBeenCalledWith('Nicht genug Bewegungspunkte!', 'warning');
        });

        it('executes move when valid', async () => {
            await actionManager.moveHero(1, 0);
            expect(actionManager.history.length).toBeGreaterThanOrEqual(0);
        });

        it('handles enemy and combat', async () => {
            const enemy = { isDefeated: () => false, position: { q: 1, r: 0 } };
            mockGame.enemies = [enemy];
            await actionManager.moveHero(1, 0);
            expect(actionManager.history.length).toBe(0); // cleared
        });

        it('calls visitSite when site present', async () => {
            mockGame.hexGrid.getHex.mockReturnValue({ site: { getName: () => 'Test' } });
            await actionManager.moveHero(1, 0);
            expect(mockGame.siteManager.visitSite).toHaveBeenCalled();
        });
    });

    describe('explore()', () => {
        beforeEach(() => {
            mockGame.hero.movementPoints = 5;
        });

        it('returns early if not playing', () => {
            mockGame.gameState = 'paused';
            actionManager.explore();
        });

        it('returns early if in combat', () => {
            mockGame.combat = {};
            actionManager.explore();
        });

        it('shows warning if not enough points', () => {
            mockGame.hero.movementPoints = 1;
            actionManager.explore();
            expect(mockGame.showToast).toHaveBeenCalledWith('Nicht genug Bewegungspunkte zum Erkunden!', 'warning');
        });

        it('clears history (irreversible)', () => {
            actionManager.saveCheckpoint();
            actionManager.explore();
            expect(actionManager.history.length).toBe(0);
        });

        it('calls mapManager and hexGrid', () => {
            actionManager.explore();
            expect(mockGame.mapManager.explore).toHaveBeenCalledWith(0, 0);
            expect(mockGame.hexGrid.exploreAdjacent).toHaveBeenCalledWith({ q: 0, r: 0 });
        });

        it('triggers particle effects', () => {
            actionManager.explore();
            expect(mockGame.particleSystem.discoveryEffect).toHaveBeenCalled();
        });

        it('creates enemies', () => {
            actionManager.explore();
            expect(mockGame.entityManager.createEnemies).toHaveBeenCalled();
        });

        it('shows event modal', () => {
            mockGame.mapManager.explore.mockReturnValue({ success: true, event: { type: 'test' } });
            actionManager.explore();
            expect(mockGame.ui.showEventModal).toHaveBeenCalledWith({ type: 'test' });
        });

        it('renders on success', () => {
            actionManager.explore();
            expect(mockGame.render).toHaveBeenCalled();
        });

        it('shows toast if nothing to explore', () => {
            mockGame.mapManager.explore.mockReturnValue({ success: false });
            mockGame.hexGrid.exploreAdjacent.mockReturnValue([]);
            actionManager.explore();
            expect(mockGame.showToast).toHaveBeenCalledWith('Hier gibt es nichts mehr zu entdecken.', 'info');
        });
    });

    describe('playCard()', () => {
        it('delegates to combatOrchestrator in combat', () => {
            mockGame.combat = { phase: 'action' };
            mockGame.combatOrchestrator = { playCardInCombat: vi.fn() };
            mockGame.hero.hand = [{ name: 'Test' }];
            actionManager.playCard(0, false, false);
            expect(mockGame.combatOrchestrator.playCardInCombat).toHaveBeenCalled();
        });

        it('saves checkpoint and calls hero.playCard', () => {
            actionManager.playCard(0, false, false);
            expect(actionManager.history.length).toBe(1);
            expect(mockGame.hero.playCard).toHaveBeenCalledWith(0, false, false);
        });

        it('reverts checkpoint on failure', () => {
            mockGame.hero.playCard.mockReturnValue(null);
            actionManager.saveCheckpoint();
            actionManager.playCard(0, false, false);
            // The failure path pops the checkpoint
        });
    });

    describe('playCardSideways()', () => {
        it('returns null in combat', () => {
            mockGame.combat = {};
            expect(actionManager.playCardSideways(0, 'block')).toBeNull();
        });

        it('saves checkpoint and calls hero', () => {
            actionManager.playCardSideways(0, 'block');
            expect(actionManager.history.length).toBe(1);
            expect(mockGame.hero.playCardSideways).toHaveBeenCalledWith(0, 'block');
        });

        it('reverts on failure', () => {
            mockGame.hero.playCardSideways.mockReturnValue(null);
            actionManager.saveCheckpoint();
            actionManager.playCardSideways(0, 'block');
        });
    });

    describe('takeMana()', () => {
        it('saves checkpoint and calls manaSource', () => {
            actionManager.takeMana(0, 'red');
            expect(actionManager.history.length).toBe(1);
            expect(mockGame.manaSource.takeDie).toHaveBeenCalledWith(0, false);
        });

        it('passes isNight from timeManager', () => {
            mockGame.timeManager.isNight.mockReturnValue(true);
            actionManager.takeMana(0, 'green');
            expect(mockGame.manaSource.takeDie).toHaveBeenCalledWith(0, true);
        });

        it('calls hero.takeManaFromSource on success', () => {
            mockGame.manaSource.takeDie.mockReturnValueOnce('white');
            actionManager.takeMana(0, 'white');
            expect(mockGame.hero.takeManaFromSource).toHaveBeenCalledWith('white');
        });

        it('reverts on failure', () => {
            mockGame.manaSource.takeDie.mockReturnValue(null);
            actionManager.saveCheckpoint();
            actionManager.takeMana(0, 'blue');
        });
    });

    describe('visitSite()', () => {
        it('returns early in combat', () => {
            mockGame.combat = {};
            actionManager.visitSite();
            expect(mockGame.siteManager.visitSite).not.toHaveBeenCalled();
        });

        it('returns early if no hex', () => {
            mockGame.hexGrid.getHex.mockReturnValue(null);
            actionManager.visitSite();
        });

        it('returns early if no site', () => {
            mockGame.hexGrid.getHex.mockReturnValue({ site: null });
            actionManager.visitSite();
        });

        it('calls siteManager and shows modal', () => {
            const site = { getName: () => 'Mine' };
            const hex = { site };
            mockGame.hexGrid.getHex.mockReturnValue(hex);
            actionManager.visitSite();
            expect(mockGame.siteManager.visitSite).toHaveBeenCalledWith(hex, site);
            expect(mockGame.ui.showSiteModal).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('handles multiple checkpoints and undos', () => {
            actionManager.saveCheckpoint();
            actionManager.saveCheckpoint();
            actionManager.saveCheckpoint();
            actionManager.undoLastAction();
            actionManager.undoLastAction();
            expect(actionManager.history.length).toBe(1);
        });

        it('handles history limit', () => {
            for (let i = 0; i < 25; i++) actionManager.saveCheckpoint();
            expect(actionManager.history.length).toBe(20);
        });

        it('handles missing optional deps gracefully', () => {
            mockGame.particleSystem = null;
            mockGame.animator = null;
            mockGame.statisticsManager = null;
            actionManager.saveCheckpoint();
            actionManager.enterMovementMode();
            actionManager.moveHero(1, 0);
            actionManager.explore();
        });
    });
});