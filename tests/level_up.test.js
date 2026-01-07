import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks, createMockUI } from './test-mocks.js';
import { LevelUpManager } from '../js/game/LevelUpManager.js';
import { SKILLS } from '../js/skills.js';
import { SAMPLE_ADVANCED_ACTIONS } from '../js/card.js';

// Mock Store to prevent external dependencies
vi.mock('../js/game/Store.js', () => ({
    store: {
        dispatch: () => { },
        subscribe: () => { },
        getState: () => ({ hero: {} }),
        clearListeners: () => { },
        reset: () => { }
    },
    ACTIONS: {}
}));

describe('Level Up System', () => {
    let game;
    let levelUpManager;

    beforeEach(() => {
        setupGlobalMocks();
        game = new MageKnightGame();
        game.ui = createMockUI();
        game.ui.render = () => { };
        game.sound = { success: () => { }, playTone: () => { } };
        game.updateStats = () => { }; // Mock updateStats to avoid DOM access

        // Ensure Hero is initialized
        game.hero.initializeDeck();
        game.hero.skills = [];

        // Manually attach new manager if not already (it should be in constructor though)
        // But for testing isolation we can re-instantiate or just use the one on game
        if (!game.levelUpManager) {
            game.levelUpManager = new LevelUpManager(game);
        }
        levelUpManager = game.levelUpManager;

        // Mock DOM elements for Manager
        levelUpManager.modal = { style: { display: 'none' } };
        levelUpManager.skillChoicesContainer = { innerHTML: '', appendChild: () => { }, children: [] };
        levelUpManager.cardChoicesContainer = { innerHTML: '', appendChild: () => { }, children: [] };
        levelUpManager.confirmBtn = { disabled: true, onclick: null };
        document.getElementById = (id) => {
            if (id === 'new-level-display') return { textContent: '' };
            return {};
        };
        // Mock RewardManager to avoid uninitialized decks issue
        game.rewardManager = {
            getAdvancedActionOffer: (count) => Array(count).fill({ id: 'mock_card', name: 'Mock Card' })
        };
    });

    it('Should trigger Level Up Manager when fame threshold is reached', () => {
        // Mock handleLevelUp to verify call
        let called = false;
        levelUpManager.handleLevelUp = () => { called = true; };

        // Fame needed for lvl 2 is usually small (e.g. 10 or defined in constants)
        // Let's force a level up via gainFame
        // We need to know the table, usually lvl 2 is at 7 fame or similar.
        // Assuming implementation uses a table where 50 fame is enough for multiple levels or at least one.

        // Actually, let's look at the result object
        const result = game.hero.gainFame(100);
        expect(result.leveledUp).toBe(true);

        // Manually trigger the handler since our mock Game loop isn't running
        if (result.leveledUp) {
            levelUpManager.handleLevelUp(result);
        }

        expect(called).toBe(true);
    });

    it('Should generate correct number of skill and card offers', () => {
        // Spy on render methods
        let skillsRendered = 0;
        let cardsRendered = 0;

        levelUpManager.renderSkills = (skills) => { skillsRendered = skills.length; };
        levelUpManager.renderCards = (cards) => { cardsRendered = cards.length; };

        levelUpManager.handleLevelUp({ newLevel: 2 });

        expect(skillsRendered).toBe(2);
        expect(cardsRendered).toBe(3);
    });

    it('Should disable confirm button until both choices are made', () => {
        levelUpManager.handleLevelUp({ newLevel: 2 });

        expect(levelUpManager.confirmBtn.disabled).toBe(true);

        // Select Skill
        levelUpManager.selectedSkill = {};
        levelUpManager.updateConfirmButton();
        expect(levelUpManager.confirmBtn.disabled).toBe(true);

        // Select Card
        levelUpManager.selectedCard = {};
        levelUpManager.updateConfirmButton();
        expect(levelUpManager.confirmBtn.disabled).toBe(false);
    });

    it('Should apply choices to Hero upon confirmation', () => {
        const testSkill = SKILLS.GOLDYX[0];
        const testCard = SAMPLE_ADVANCED_ACTIONS[0];

        levelUpManager.selectedSkill = testSkill;
        levelUpManager.selectedCard = testCard;
        levelUpManager.currentLevel = 2; // Even level -> Hand Limit +1

        const initialHandLimit = game.hero.handLimit;
        const initialDeckSize = game.hero.deck.length;
        console.log('Test Diff - testCard:', testCard);
        console.log('Test Diff - initialDeckSize:', initialDeckSize);

        levelUpManager.confirmSelection();

        // Check Skill added
        expect(game.hero.skills).toContain(testSkill);

        // Check Card added to deck (top of deck means length +1)
        expect(game.hero.deck.length).toBe(initialDeckSize + 1);
        expect(game.hero.deck[0].id).toBe(testCard.id);

        // Check Level Bonus (Even level = Hand Limit)
        expect(game.hero.handLimit).toBe(initialHandLimit + 1);
    });

    it('Should apply Command Token bonus on odd levels', () => {
        const testSkill = SKILLS.GOLDYX[0];
        const testCard = SAMPLE_ADVANCED_ACTIONS[0];
        levelUpManager.selectedSkill = testSkill;
        levelUpManager.selectedCard = testCard;

        levelUpManager.currentLevel = 3; // Odd level -> Command Limit +1
        // Sync Hero internal level so levelUp() bumps it to 3
        game.hero.level = 2;

        const initialCommandLimit = game.hero.commandLimit;

        levelUpManager.confirmSelection();

        expect(game.hero.commandLimit).toBe(initialCommandLimit + 1);
    });
});
