import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { eventBus } from '../js/eventBus.js';
import { GAME_EVENTS } from '../js/constants.js';

describe('Logging & Initialization Robustness', () => {
    let game;
    let logSpy;

    beforeEach(() => {
        // Clear event bus before each test (simulating the fix)
        eventBus.clear();
        game = new MageKnightGame();

        // Mock logger/transports if needed, but we essentially check eventBus emission
        logSpy = [];
        eventBus.on(GAME_EVENTS.LOG_ADDED, (data) => {
            logSpy.push(data);
        });
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        eventBus.clear();
    });

    describe('addLog protection', () => {
        it('should ignore undefined messages', () => {
            game.addLog(undefined);
            expect(logSpy.length).toBe(0);
        });

        it('should ignore null messages', () => {
            game.addLog(null);
            expect(logSpy.length).toBe(0);
        });

        it('should ignore empty string messages', () => {
            game.addLog('');
            expect(logSpy.length).toBe(0);
        });

        it('should process valid messages', () => {
            game.addLog('Test Message', 'info');
            expect(logSpy.length).toBe(1);
            expect(logSpy[0].message).toBe('Test Message');
            expect(logSpy[0].type).toBe('info');
        });
    });

    describe('Initialization & EventBus', () => {
        it('should have a clean event bus on new game instance', () => {
            // Add a potentially lingering listener
            eventBus.on('LINGERING_EVENT', () => { });

            // Create NEW instance (simulating refresh/re-init)
            const newGame = new MageKnightGame();

            // Check if clear() was called. 
            // Since we can't easily spy on eventBus.clear without mocking the module,
            // we check if the listener is gone.
            // Note: Use internal property if needed or checking behavior.
            // eventBus.listeners is a Map.

            // Assuming we can access the exported eventBus listeners for testing
            expect(eventBus.listeners.has('LINGERING_EVENT')).toBe(false);
        });
    });
});
