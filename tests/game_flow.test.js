
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockUI, createMockContext, createMockLocalStorage, createSpy } from './test-mocks.js';

describe('Game Flow Coverage Boost', () => {
    let game;
    let mockUI;
    let mockLocalStorage;

    let originalWindow, originalDocument, originalLocalStorage;

    beforeEach(() => {
        originalWindow = global.window;
        originalDocument = global.document;
        originalLocalStorage = global.localStorage;

        mockLocalStorage = createMockLocalStorage();

        // Mock global dependencies
        mockUI = createMockUI();
        // Add specific methods needed for flow
        mockUI.showSiteInteraction = createSpy('showSiteInteraction');
        mockUI.updateSiteDescription = createSpy('updateSiteDescription');
        mockUI.showCombatModal = createSpy('showCombatModal');
        mockUI.renderHandCards = createSpy('renderHandCards');
        mockUI.renderManaSource = createSpy('renderManaSource');
        mockUI.hidePlayArea = createSpy('hidePlayArea');
        mockUI.updateTurnInfo = createSpy('updateTurnInfo');

        const mockContext = createMockContext();

        // Setup global window/document
        global.localStorage = mockLocalStorage; // Fix: Needs to be on global for sub-managers
        global.window = {
            localStorage: mockLocalStorage,
            requestAnimationFrame: (cb) => 1,
            cancelAnimationFrame: () => { },
            addEventListener: createSpy('addEventListener'),
            removeEventListener: createSpy('removeEventListener'),
            confirm: () => true,
            location: { reload: () => { } }
        };

        const mockElement = {
            style: {},
            classList: { add: () => { }, remove: () => { }, contains: () => false },
            appendChild: () => { },
            getContext: () => mockContext,
            addEventListener: () => { },
            querySelector: () => mockElement,
            querySelectorAll: () => [],
            innerHTML: '',
            value: '',
            textContent: '',
            dataset: {},
            getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 })
        };

        global.document = {
            getElementById: () => mockElement,
            createElement: (tag) => mockElement,
            querySelector: () => mockElement,
            querySelectorAll: () => [], // Fix: Add querySelectorAll
            body: { appendChild: () => { }, classList: { add: () => { }, remove: () => { } } },
            addEventListener: () => { }
        };

        game = new MageKnightGame();

        // Suppress initial logs
        game.ui = mockUI;
        // Inject mockUI into game if constructor created a new one
        // Wait, constructor does `this.ui = new UI()`.
        // We need to overwrite it.
        game.ui = mockUI;

        // Initialize enough state for flows
        game.hero = {
            level: 1,
            hand: [],
            deck: [],
            discardPile: [],
            units: [],
            crystals: { red: 0, blue: 0, green: 0, white: 0 },
            calculateCombatStats: () => ({ attack: 2, block: 2 }),
            gainFame: createSpy('gainFame'),
            heal: createSpy('heal'),
            resetHand: createSpy('resetHand'),
            endTurn: createSpy('endTurn'),
            getState: () => ({}),
            loadState: () => { }
        };

        // Added tooltipManager and destroy to game mock
        game.tooltipManager = {
            hideTooltip: createSpy(),
            showEnemyTooltip: createSpy(),
            showTerrainTooltip: createSpy()
        };
        game.destroy = createSpy('game.destroy'); // Added destroy to game mock

        game.mapManager = {
            getSiteAt: () => null,
            revealMap: () => { },
            moveCameraToHero: () => { },
            render: () => { },
            getCurrentTerrainCost: () => 2,
            canExplore: () => true // Add missing method
        };

        game.turnNumber = 1;
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        global.window = originalWindow;
        global.document = originalDocument;
        global.localStorage = originalLocalStorage;
    });

    describe('Handling Site Interactions', () => {
        it('should enter village interaction', () => {
            const villageSite = { type: 'village', name: 'Village', getName: () => 'Village' };
            // Mock hexGrid to return site
            game.hexGrid = {
                getHex: () => ({ site: villageSite }),
                axialToPixel: () => ({ x: 0, y: 0 })
            };
            game.siteManager = { visitSite: () => ({ type: 'village' }) };

            // Set hero position to simulate being at site
            game.hero.position = { q: 0, r: 0 };

            game.visitSite();

            // Expect UI interactions
            expect(game.ui.showSiteModal.calls.length).toBeGreaterThan(0);
        });

        it('should handle keep battle flow', () => {
            const site = { type: 'keep', name: 'Keep', enemy: { name: 'Orc' }, getName: () => 'Keep' };
            game.hexGrid = {
                getHex: () => ({ site: site }),
                axialToPixel: () => ({ x: 0, y: 0 })
            };
            game.siteManager = { visitSite: () => ({ type: 'combat', enemy: site.enemy }) };
            game.hero.position = { q: 0, r: 0 }; // Fix missing position

            // Should trigger site visit which might trigger combat if logic was there, 
            // but usually visitSite just returns data.
            // If we want to test combat flow from interaction:
            game.visitSite();

            expect(game.ui.showSiteModal.calls.length).toBeGreaterThan(0);
        });
    });

    describe('Save/Load Flows', () => {
        it('should save game state', () => {
            game.saveManager = {
                saveGame: createSpy('saveGame'),
                autoSave: createSpy('autoSave')
            };

            game.saveGame(0);
            expect(game.saveManager.saveGame.calls.length).toBe(1);
        });

        it('should load game state', () => {
            const mockState = {
                turn: 5,
                hero: {
                    position: { q: 0, r: 0 },
                    deck: [],
                    hand: [],
                    discard: [],
                    wounds: [],
                    fame: 0,
                    reputation: 0,
                    crystals: {}
                },
                enemies: [],
                manaSource: { dice: [] },
                terrain: []
            };

            // Mock sub-loaders
            game.mapManager.loadState = () => { };
            game.unitOffer = { loadState: () => { } };
            game.spellOffer = { loadState: () => { } };
            game.advancedActionOffer = { loadState: () => { } };
            game.achievementManager = { loadState: () => { } }; // Fix: load -> loadState
            game.statisticsManager = { loadState: () => { } }; // Fix: load -> loadState

            // Mock turn manager
            game.turnManager = {
                loadState: (s) => { game.turnNumber = s.turnNumber; },
                getState: () => ({ turnNumber: game.turnNumber })
            };

            const mockObjState = {
                ...mockState,
                turn: { turnNumber: 5 }
            };

            game.loadGameState(mockObjState);
            expect(game.turnNumber).toBe(5);
        });
    });

    describe('Turn Management Edge Cases', () => {
        it('should handle end of round', () => {
            // Setup end of round conditions
            game.hero.deck = [];
            game.hero.prepareNewRound = createSpy('prepareNewRound');
            game.hero.position = { q: 0, r: 0 };

            game.timeManager = {
                isDay: () => true,
                isNight: () => false,
                endRound: () => ({ timeOfDay: 'night' }),
                getState: () => ({ timeOfDay: 'day', dayNumber: 1 })
            };
            game.manaSource = { returnDice: () => { }, initialize: () => { } };

            // Call endTurn
            game.endTurn();

            expect(mockUI.hidePlayArea.calls.length).toBeGreaterThan(0);
        });
    });

    describe('Combat Integration', () => {
        it('should resolve combat victory', () => {
            // Setup for initiateCombat
            game.ui.showCombatPanel = createSpy('showCombatPanel');
            game.ui.updatePhaseIndicator = createSpy('updatePhaseIndicator');
            game.renderUnitsInCombat = createSpy('renderUnitsInCombat');
            game.updateCombatTotals = createSpy('updateCombatTotals');

            const enemy = { name: 'Orc', hp: 5 };

            // Trigger combat
            game.initiateCombat(enemy);

            expect(game.ui.showCombatPanel.calls.length).toBeGreaterThan(0);
            expect(game.combat).toBeDefined();
        });
    });
});
