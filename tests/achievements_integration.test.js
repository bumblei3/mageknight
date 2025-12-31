
import { MageKnightGame } from '../js/game.js';
import { ACHIEVEMENTS } from '../js/achievements.js';
import { createMockWindow, createMockDocument, MockHTMLElement } from './test-mocks.js';
import { describe, it, expect, beforeEach } from './testRunner.js';
import { eventBus } from '../js/eventBus.js';
import { GAME_EVENTS } from '../js/constants.js';

describe('Achievements Integration', () => {
    let game;
    let mockWindow;
    let mockDocument;

    beforeEach(() => {
        // Setup global mocks
        mockWindow = createMockWindow();
        mockDocument = createMockDocument();
        global.window = mockWindow;
        global.document = mockDocument;
        global.HTMLElement = MockHTMLElement;
        global.AudioContext = mockWindow.AudioContext; // Ensure sound manager doesn't crash

        // Reset body
        document.body.innerHTML = '';
        const gameBoard = document.createElement('canvas');
        gameBoard.id = 'game-board';
        document.body.appendChild(gameBoard);

        // Init game
        game = new MageKnightGame();

        // Listen for notifications via event bus
        game.ui.lastNotification = null;
        eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, (data) => {
            game.ui.lastNotification = { msg: data.message, type: data.type };
        });

        // Reset achievements
        game.achievementManager.reset();

        // Mock Sound to prevent errors
        if (game.sound) {
            game.sound.success = () => { };
            game.sound.enabled = true;
        }
    });

    it('should unlock "FIRST_BLOOD" achievement upon first kill', () => {
        // Mock statistics
        game.statisticsManager.stats = {
            enemiesDefeated: 1, // Meets FIRST_BLOOD condition
            tilesExplored: 0,
            level: 1
        };

        // Run check
        game.checkAndShowAchievements();

        // Verify notification
        expect(game.ui.lastNotification).toBeDefined();
        expect(game.ui.lastNotification.msg).toContain('Erste Beute');

        // Verify unlocked in manager
        const unlocked = game.achievementManager.getUnlocked();
        const found = unlocked.find(a => a.id === ACHIEVEMENTS.FIRST_BLOOD.id);
        expect(found).toBeDefined();
    });

    it('should not notify if already unlocked', () => {
        // Unlock first
        game.achievementManager.unlock(ACHIEVEMENTS.FIRST_BLOOD.id);
        game.ui.lastNotification = null; // Reset

        game.statisticsManager.stats = {
            enemiesDefeated: 5
        };

        game.checkAndShowAchievements();

        // Should NOT notify again
        expect(game.ui.lastNotification).toBeNull();
    });

    it('should unlock multiple achievements', () => {
        game.statisticsManager.stats = {
            enemiesDefeated: 10, // SLAYER (and FIRST_BLOOD if not unlocked)
            tilesExplored: 10    // CARTOGRAPHER
        };

        // Capture all notifications via event bus
        const notifications = [];
        const listener = (data) => notifications.push(data.message);
        eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, listener);

        game.checkAndShowAchievements();

        expect(notifications.length).toBeGreaterThanOrEqual(4);

        // Clean up
        eventBus.off(GAME_EVENTS.NOTIFICATION_SHOW, listener);
        expect(notifications.some(n => n.includes('Schlächter'))).toBe(true);
        expect(notifications.some(n => n.includes('Kartograph'))).toBe(true);
    });
});
