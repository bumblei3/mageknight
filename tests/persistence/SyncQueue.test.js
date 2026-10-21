// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { SyncQueue } from '../../js/persistence/SyncQueue';

describe('SyncQueue', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('enqueues and reports size', () => {
        SyncQueue.enqueue('slot1', { v: 1 });
        expect(SyncQueue.size()).toBe(1);
    });

    it('replaces pending save for same slot (latest wins)', () => {
        SyncQueue.enqueue('slot1', { v: 1 });
        SyncQueue.enqueue('slot1', { v: 2 });
        expect(SyncQueue.size()).toBe(1);
        const q = SyncQueue.load();
        expect(q[0].state).toEqual({ v: 2 });
    });

    it('flushes successfully and empties queue', async () => {
        SyncQueue.enqueue('a', { x: 1 });
        SyncQueue.enqueue('b', { x: 2 });
        const saver = async () => true;
        const flushed = await SyncQueue.flush(saver);
        expect(flushed).toBe(2);
        expect(SyncQueue.size()).toBe(0);
    });

    it('keeps failed saves in queue', async () => {
        SyncQueue.enqueue('a', { x: 1 });
        const saver = async (slot) => slot !== 'a';
        const flushed = await SyncQueue.flush(saver);
        expect(flushed).toBe(0);
        expect(SyncQueue.size()).toBe(1);
    });

    it('clear empties the queue', () => {
        SyncQueue.enqueue('a', { x: 1 });
        SyncQueue.clear();
        expect(SyncQueue.size()).toBe(0);
    });
});
