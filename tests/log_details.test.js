
import { describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { GAME_EVENTS } from '../js/constants.js';
import { eventBus } from '../js/eventBus.js';

describe('Extended Combat Log', () => {
    let game;
    let lastLogEvent = null;

    beforeEach(() => {
        game = new MageKnightGame();
        // Spy on event bus
        lastLogEvent = null;
        eventBus.on(GAME_EVENTS.LOG_ADDED, (data) => {
            lastLogEvent = data;
        });
    });

    it('should emit log event with details', () => {
        const details = {
            title: 'Test Details',
            items: ['Item 1', 'Item 2']
        };

        game.addLog('Test Message', 'info', details);

        expect(lastLogEvent).not.toBeNull();
        expect(lastLogEvent.message).toBe('Test Message');
        expect(lastLogEvent.type).toBe('info');
        expect(lastLogEvent.details).toBe(details);
        expect(lastLogEvent.timestamp).toBeDefined();
    });

    it('should emit log event without details', () => {
        game.addLog('Simple Message');

        expect(lastLogEvent).not.toBeNull();
        expect(lastLogEvent.message).toBe('Simple Message');
        expect(lastLogEvent.details).toBeNull();
    });
});
