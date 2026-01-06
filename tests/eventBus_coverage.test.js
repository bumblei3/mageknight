
import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '../js/eventBus.js';
import { createSpy } from './test-mocks.js';

describe('EventBus Coverage', () => {
    beforeEach(() => {
        eventBus.clear();
    });

    describe('on/emit', () => {
        it('should register and call listeners', () => {
            const callback = createSpy();
            eventBus.on('test-event', callback);

            eventBus.emit('test-event', { value: 42 });

            expect(callback.called).toBe(true);
            expect(callback.calls[0][0].value).toBe(42);
        });

        it('should handle multiple listeners', () => {
            const callback1 = createSpy();
            const callback2 = createSpy();

            eventBus.on('multi', callback1);
            eventBus.on('multi', callback2);

            eventBus.emit('multi', 'data');

            expect(callback1.called).toBe(true);
            expect(callback2.called).toBe(true);
        });

        it('should not crash on emit for unregistered event', () => {
            eventBus.emit('nonexistent', {});
            // Should not throw
        });
    });

    describe('off', () => {
        it('should remove listener', () => {
            const callback = createSpy();
            eventBus.on('removable', callback);
            eventBus.off('removable', callback);

            eventBus.emit('removable', {});

            expect(callback.called).toBe(false);
        });

        it('should not crash when removing from nonexistent event', () => {
            eventBus.off('nonexistent', () => { });
            // Should not throw
        });
    });

    describe('error handling', () => {
        it('should catch errors in listeners', () => {
            const badCallback = () => { throw new Error('Test error'); };
            const goodCallback = createSpy();

            // Suppress console.error for this test
            const originalError = console.error;
            console.error = () => { };

            eventBus.on('error-test', badCallback);
            eventBus.on('error-test', goodCallback);

            // Should not throw, and should continue to other listeners
            eventBus.emit('error-test', {});

            expect(goodCallback.called).toBe(true);

            // Restore console.error
            console.error = originalError;
        });
    });

    describe('clear', () => {
        it('should clear all listeners', () => {
            const callback = createSpy();
            eventBus.on('clearable', callback);

            eventBus.clear();
            eventBus.emit('clearable', {});

            expect(callback.called).toBe(false);
        });
    });
});
