/**
 * Tests for ShortcutManager
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShortcutManager } from '../../js/game/ShortcutManager.js';

describe('ShortcutManager', () => {
    let shortcutManager;

    beforeEach(() => {
        // Mock localStorage
        global.localStorage = {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, value) { this.store[key] = value.toString(); },
            clear() { this.store = {}; }
        };
        shortcutManager = new ShortcutManager();
    });

    describe('Loading & Saving', () => {
        it('should load default bindings when no storage exists', () => {
            expect(shortcutManager.bindings['END_TURN'].key).toBe(' ');
            expect(shortcutManager.bindings['REST'].key).toBe('r');
        });

        it('should save custom bindings to localStorage', () => {
            shortcutManager.updateBinding('END_TURN', 'Enter');

            const saved = JSON.parse(global.localStorage.getItem('mk_shortcuts'));
            expect(saved['END_TURN']).toBe('Enter');
        });

        it('should load custom bindings from localStorage', () => {
            global.localStorage.setItem('mk_shortcuts', JSON.stringify({
                'END_TURN': 'Enter'
            }));

            const newManager = new ShortcutManager();
            expect(newManager.bindings['END_TURN'].key).toBe('Enter');
            // Should still have other defaults
            expect(newManager.bindings['REST'].key).toBe('r');
        });

        it('should handle corrupted localStorage gracefully', () => {
            global.localStorage.setItem('mk_shortcuts', 'INVALID JSON');

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const newManager = new ShortcutManager();

            // Should fall back to defaults
            expect(newManager.bindings['END_TURN'].key).toBe(' ');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Action Resolution', () => {
        it('should resolve actions from keys case-insensitively', () => {
            expect(shortcutManager.getAction({ key: 'r' })).toBe('REST');
            expect(shortcutManager.getAction({ key: 'R' })).toBe('REST');
        });

        it('should handle Space key variations', () => {
            expect(shortcutManager.getAction({ key: ' ' })).toBe('END_TURN');
            expect(shortcutManager.getAction({ key: 'Spacebar' })).toBe('END_TURN');
        });

        it('should return null for unbound keys', () => {
            expect(shortcutManager.getAction({ key: 'z' })).toBeNull();
        });

        it('should resolve updated keys', () => {
            shortcutManager.updateBinding('EXPLORE', 'x');
            expect(shortcutManager.getAction({ key: 'x' })).toBe('EXPLORE');
            expect(shortcutManager.getAction({ key: 'e' })).toBeNull();
        });
    });

    describe('Management', () => {
        it('should reset to defaults', () => {
            shortcutManager.updateBinding('REST', 'z');
            expect(shortcutManager.bindings['REST'].key).toBe('z');

            shortcutManager.resetDefaults();
            expect(shortcutManager.bindings['REST'].key).toBe('r');

            // Check persistence of reset
            const saved = JSON.parse(global.localStorage.getItem('mk_shortcuts'));
            expect(saved['REST']).toBe('r');
        });

        it('should return true when updating valid action', () => {
            expect(shortcutManager.updateBinding('REST', 'x')).toBe(true);
        });

        it('should return false when updating invalid action', () => {
            expect(shortcutManager.updateBinding('INVALID_ACTION', 'x')).toBe(false);
        });
    });
});
