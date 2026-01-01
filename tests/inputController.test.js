import { describe, it, expect, beforeEach } from './testRunner.js';
import { UI } from '../js/ui.js';
import { InputController } from '../js/game/InputController.js';
import { createMockElement, createSpy, setupGlobalMocks } from './test-mocks.js';

describe('UI Healing & Input Blocking', () => {
    let ui;
    let mockGame;
    let mockElements;

    beforeEach(() => {
        setupGlobalMocks();

        mockElements = {
            heroName: createMockElement(),
            heroArmor: createMockElement(),
            heroHandLimit: createMockElement(),
            heroWounds: createMockElement(),
            fameValue: createMockElement(),
            reputationValue: createMockElement(),
            movementPoints: createMockElement(),
            handCards: createMockElement(),
            playedCards: createMockElement(),
            manaSource: createMockElement(),
            heroMana: createMockElement(),
            heroCrystals: createMockElement(),
            cardDetails: createMockElement(),
            logArea: createMockElement(),
            combatPanel: createMockElement(),
            combatInfo: createMockElement(),
            healBtn: createMockElement(),
            endTurnBtn: createMockElement(),
            restBtn: createMockElement(),
            exploreBtn: createMockElement(),
            newGameBtn: createMockElement(),
            phaseIndicator: createMockElement(),
            soundToggleBtn: createMockElement('button') // Added for InputController setup
        };

        // Some elements need parents for tooltip attachment
        // (Moved here so parents are set before UI constructor calls getElementById)
        mockElements.fameValue.parentNode = createMockElement();
        mockElements.reputationValue.parentNode = createMockElement();

        // document.getElementById should return these
        global.document.getElementById = (id) => {
            if (id === 'sound-toggle-btn') return mockElements.soundToggleBtn;
            if (id === 'achievements-btn') return createMockElement();
            if (id === 'statistics-btn') return createMockElement();
            const camelId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            return mockElements[id] || mockElements[camelId] || null;
        };
        global.document.querySelectorAll = createSpy(() => []);

        ui = new UI();
        // Manually assign elements since UI constructor calls getElementById
        ui.elements = mockElements;

        mockGame = {
            hero: { healingPoints: 0, wounds: [] },
            applyHealing: createSpy(),
            turnManager: { endTurn: createSpy() },
            rest: createSpy(),
            explore: createSpy(),
            ui: ui,
            canvas: createMockElement('canvas'),
            interactionController: {
                handleCanvasClick: createSpy(),
                handleCanvasMouseMove: createSpy()
            },
            setupSoundToggle: createSpy(),
            setupUIListeners: createSpy(),
            isUIBlocked: () => false,
            sound: { enabled: true, toggle: createSpy() },
            addLog: createSpy(), // Added for sound toggle
            renderController: { renderAchievements: createSpy(), renderStatistics: createSpy() } // Mock renderController
        };
    });

    describe('Healing Button Visibility', () => {
        it('should hide heal button when no wounds', () => {
            mockGame.hero.getStats = () => ({ wounds: 0, name: 'Hero' });
            mockGame.hero.healingPoints = 5;
            ui.updateHeroStats(mockGame.hero);
            expect(mockElements.healBtn.style.display).toBe('none');
        });

        it('should hide heal button when no healing points', () => {
            mockGame.hero.getStats = () => ({ wounds: 2, name: 'Hero' });
            mockGame.hero.healingPoints = 0;
            ui.updateHeroStats(mockGame.hero);
            expect(mockElements.healBtn.style.display).toBe('none');
        });

        it('should show heal button when wounds AND points exist', () => {
            mockGame.hero.getStats = () => ({ wounds: 1, name: 'Hero' });
            mockGame.hero.healingPoints = 1;
            ui.updateHeroStats(mockGame.hero);
            expect(mockElements.healBtn.style.display).toBe('block');
            expect(mockElements.healBtn.textContent).toContain('Heilen (1)');
        });
    });

    describe('InputController Blocking', () => {
        let handler;

        beforeEach(() => {
            handler = new InputController(mockGame);
            handler.setup();
        });

        it('should call applyHealing when healBtn is clicked and UI NOT blocked', () => {
            handler.isUIBlocked = () => false;
            mockElements.healBtn.click();
            expect(mockGame.applyHealing.called).toBe(true);
        });

        it('should NOT call applyHealing when UI IS blocked', () => {
            // Mock isUIBlocked to return true
            // In the actual class, it checks modal visibility
            // We can mock the function directly on the instance for this test
            handler.isUIBlocked = () => true;

            mockElements.healBtn.click();
            expect(mockGame.applyHealing.called).toBe(false);
        });

        it('should block endTurnBtn when UI is blocked', () => {
            handler.isUIBlocked = () => true;
            mockElements.endTurnBtn.click();
            expect(mockGame.turnManager.endTurn.called).toBe(false);
        });
    });
});
