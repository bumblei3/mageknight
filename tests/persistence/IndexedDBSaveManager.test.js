// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBSaveManager } from '../../js/persistence/IndexedDBSaveManager';

describe('IndexedDBSaveManager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('saves and loads a state (round-trip)', async () => {
        const state = { hero: 'goldyx', score: 42, timestamp: 123 };
        const ok = await IndexedDBSaveManager.saveGame('slot1', state);
        expect(ok).toBe(true);

        const loaded = await IndexedDBSaveManager.loadGame('slot1');
        expect(loaded).toMatchObject({ hero: 'goldyx', score: 42 });
    });

    it('returns null for missing slot', async () => {
        const loaded = await IndexedDBSaveManager.loadGame('nope');
        expect(loaded).toBeNull();
    });

    it('deletes a save', async () => {
        await IndexedDBSaveManager.saveGame('slot2', { x: 1 });
        await IndexedDBSaveManager.deleteSave('slot2');
        const loaded = await IndexedDBSaveManager.loadGame('slot2');
        expect(loaded).toBeNull();
    });

    it('lists saves', async () => {
        await IndexedDBSaveManager.saveGame('a', { v: 1 });
        await IndexedDBSaveManager.saveGame('b', { v: 2 });
        const list = await IndexedDBSaveManager.listSaves();
        expect(list).toContain('a');
        expect(list).toContain('b');
    });
});
