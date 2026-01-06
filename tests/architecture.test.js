import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '../js/eventBus.js';
import * as Constants from '../js/constants.js';

describe('Refactored Core: EventBus', () => {
    beforeEach(() => {
        eventBus.clear();
    });

    it('should register and trigger listeners', () => {
        let triggered = false;
        eventBus.on('test_event', () => triggered = true);
        eventBus.emit('test_event');
        expect(triggered).toBe(true);
    });

    it('should pass data to listeners', () => {
        let receivedData = null;
        eventBus.on('data_event', (data) => receivedData = data);
        eventBus.emit('data_event', { foo: 'bar' });
        expect(receivedData.foo).toBe('bar');
    });

    it('should remove listeners with off()', () => {
        let count = 0;
        const cb = () => count++;
        eventBus.on('multi', cb);
        eventBus.emit('multi');
        eventBus.off('multi', cb);
        eventBus.emit('multi');
        expect(count).toBe(1);
    });
});

describe('Refactored Core: Constants', () => {
    it('should have all required categories', () => {
        expect(Constants.MANA_COLORS).toBeDefined();
        expect(Constants.GAME_EVENTS).toBeDefined();
        expect(Constants.TERRAIN_COSTS).toBeDefined();
    });

    it('should have correct terrain costs', () => {
        expect(Constants.TERRAIN_COSTS[Constants.TERRAIN_TYPES.PLAINS].day).toBe(2);
        expect(Constants.TERRAIN_COSTS[Constants.TERRAIN_TYPES.MOUNTAINS].day).toBe(5);
    });
});
