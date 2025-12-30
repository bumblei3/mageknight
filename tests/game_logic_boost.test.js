import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockElement, createMockLocalStorage, createSpy, createMockContext } from './test-mocks.js';

describe('Game Coverage Boost Logic', () => {
    let game;

    let originalGetElementById, originalQuerySelector, originalQuerySelectorAll, originalCreateElement, originalPrompt;

    beforeEach(() => {
        originalGetElementById = global.document.getElementById;
        originalQuerySelector = global.document.querySelector;
        originalQuerySelectorAll = global.document.querySelectorAll;
        originalCreateElement = global.document.createElement;
        originalPrompt = global.prompt;
        const elementCache = {};
        global.document.getElementById = (id) => {
            if (elementCache[id]) return elementCache[id];
            const el = createMockElement('div');
            el.id = id;
            if (id === 'game-board') {
                el.getContext = () => createMockContext();
            }
            elementCache[id] = el;
            return el;
        };
        global.document.querySelectorAll = () => [];
        global.document.querySelector = (sel) => {
            if (sel === '.board-wrapper') return createMockElement('div');
            return createMockElement('div');
        };
        global.document.createElement = (tag) => createMockElement(tag);

        game = new MageKnightGame();
        // Mock heavy systems
        game.sound = { play: () => { }, toggle: () => { }, success: () => { } };
        game.ui.addLog = createSpy('addLog');
    });

    afterEach(() => {
        global.document.getElementById = originalGetElementById;
        global.document.querySelector = originalQuerySelector;
        global.document.querySelectorAll = originalQuerySelectorAll;
        global.document.createElement = originalCreateElement;
        global.prompt = originalPrompt;
    });

    it('should handle save dialog', () => {
        const originalPrompt = global.prompt;
        global.prompt = () => '1';

        game.openSaveDialog();
        expect(game.ui.addLog.calledWith('Spiel in Slot 1 gespeichert', 'info')).toBe(true);

        global.prompt = originalPrompt;
    });

    it('should handle load dialog', () => {
        const originalPrompt = global.prompt;
        global.prompt = () => '1';

        // Mock saveManager
        game.saveManager.loadGame = () => ({
            hero: {
                name: 'Test',
                position: { q: 0, r: 0 },
                hand: [],
                discard: [],
                deck: [],
                wounds: [],
                fame: 0,
                reputation: 0,
                level: 1,
                crystals: {},
                movementPoints: 0,
                attackPoints: 0,
                blockPoints: 0,
                influencePoints: 0,
                healingPoints: 0
            },
            enemies: [],
            hexes: [],
            turn: 1
        });

        game.openLoadDialog();
        expect(game.ui.addLog.calledWith('Spielstand geladen', 'info')).toBe(true);

        global.prompt = originalPrompt;
    });

    it('should check achievements', () => {
        game.statisticsManager.getAll = () => ({ enemiesKilled: 10 });
        game.achievementManager.checkAchievements = () => [{ name: 'Killer', description: 'Kill 10' }];

        const results = game.checkAndShowAchievements();
        expect(results.length).toBe(1);
        expect(game.ui.addLog.called).toBe(true);
    });

    it('should handle saveGame combat failure', () => {
        game.combat = { phase: 'attack' };
        game.saveGame();
        expect(game.ui.addLog.calledWith('Kann nicht im Kampf speichern!', 'warning')).toBe(true);
    });

    it('should handle loadGameState', () => {
        const state = {
            turn: 5,
            hero: {
                position: { q: 1, r: 2 },
                deck: [], hand: [], discard: [], wounds: [],
                fame: 100, reputation: 5, crystals: { red: 5 },
                movementPoints: 3, attackPoints: 2, blockPoints: 1
            },
            enemies: [],
            manaSource: {},
            terrain: {},
            selectedHex: null,
            movementMode: false
        };
        game.loadGameState(state);
        expect(game.hero.fame).toBe(100);
        expect(game.hero.movementPoints).toBe(3);
    });

    it('should render game', () => {
        game.render();
        expect(game.ui.addLog.called).toBe(false); // No log on render
    });
});
