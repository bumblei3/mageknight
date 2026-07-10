import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventBus, { eventBus } from '../js/eventBus.js';

/**
 * Focused tests for js/eventBus.ts (previously 0% line coverage).
 * Exercises subscribe / unsubscribe / emit / clear and the error-isolation
 * branch (a throwing listener must not break the other listeners).
 */

describe('EventBus', () => {
    let bus;

    beforeEach(() => {
        bus = new EventBus();
    });

    it('delivers emitted data to subscribers', () => {
        const cb = vi.fn();
        bus.on('test', cb);
        bus.emit('test', { value: 42 });
        expect(cb).toHaveBeenCalledWith({ value: 42 });
    });

    it('supports multiple subscribers for the same event', () => {
        const a = vi.fn();
        const b = vi.fn();
        bus.on('evt', a);
        bus.on('evt', b);
        bus.emit('evt', 'payload');
        expect(a).toHaveBeenCalledWith('payload');
        expect(b).toHaveBeenCalledWith('payload');
    });

    it('does nothing when emitting an event with no listeners', () => {
        expect(() => bus.emit('nobody')).not.toThrow();
    });

    it('stops delivering after off() is called', () => {
        const cb = vi.fn();
        bus.on('evt', cb);
        bus.off('evt', cb);
        bus.emit('evt');
        expect(cb).not.toHaveBeenCalled();
    });

    it('only removes the matching callback', () => {
        const a = vi.fn();
        const b = vi.fn();
        bus.on('evt', a);
        bus.on('evt', b);
        bus.off('evt', a);
        bus.emit('evt');
        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('off() is a no-op for unknown events', () => {
        expect(() => bus.off('missing', vi.fn())).not.toThrow();
    });

    it('isolates listener errors and still calls remaining listeners', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const good = vi.fn();
        const bad = vi.fn(() => { throw new Error('boom'); });
        bus.on('evt', good);
        bus.on('evt', bad);
        bus.on('evt', good);

        expect(() => bus.emit('evt')).not.toThrow();

        // both good listeners still ran, bad threw once
        expect(good).toHaveBeenCalledTimes(2);
        expect(bad).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error in event listener for evt:'),
            expect.any(Error)
        );
        errorSpy.mockRestore();
    });

    it('clear() removes all listeners', () => {
        const cb = vi.fn();
        bus.on('a', cb);
        bus.on('b', cb);
        bus.clear();
        bus.emit('a');
        bus.emit('b');
        expect(cb).not.toHaveBeenCalled();
    });

    it('global eventBus singleton is an EventBus instance', () => {
        expect(eventBus).toBeInstanceOf(EventBus);
        const cb = vi.fn();
        eventBus.on('global-test', cb);
        eventBus.emit('global-test', 1);
        expect(cb).toHaveBeenCalledWith(1);
        eventBus.clear();
    });
});
