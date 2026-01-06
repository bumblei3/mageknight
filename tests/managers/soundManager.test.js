import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundManager } from '../../js/soundManager.js';
import { setLanguage } from '../../js/i18n/index.js';
import { store } from '../../js/game/Store.js';

describe('SoundManager', () => {
    let soundManager;

    beforeEach(() => {
        setLanguage('de');
        soundManager = new SoundManager();
        soundManager.enabled = false;
    });

    afterEach(() => {
        if (soundManager) soundManager.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with enabled state', () => {
            const sm = new SoundManager();

            expect(sm.enabled).toBe(true);
            expect(sm.masterVolume).toBe(1.0);
        });
    });

    describe('toggle', () => {
        it('should toggle enabled state', () => {
            const sm = new SoundManager();

            const result1 = sm.toggle();
            expect(result1).toBe(false);
            expect(sm.enabled).toBe(false);

            const result2 = sm.toggle();
            expect(result2).toBe(true);
            expect(sm.enabled).toBe(true);
        });
    });

    describe('setVolume', () => {
        it('should clamp volume between 0 and 1', () => {
            const sm = new SoundManager();

            sm.setVolume(0.5);
            expect(sm.masterVolume).toBe(0.5);

            sm.setVolume(-1);
            expect(sm.masterVolume).toBe(0);

            sm.setVolume(2);
            expect(sm.masterVolume).toBe(1);
        });
    });

    describe('playTone', () => {
        it('should not throw when audio context not available', () => {
            const sm = new SoundManager();
            // Should not throw even without audio context
            sm.playTone(440, 0.1, 'sine');
            expect(true).toBe(true);
        });
    });

    describe('Sound Effects', () => {
        it('should have all effect methods defined', () => {
            const sm = new SoundManager();

            // Verify all methods exist
            expect(typeof sm.cardPlay).toBe('function');
            expect(typeof sm.cardPlayStrong).toBe('function');
            expect(typeof sm.attack).toBe('function');
            expect(typeof sm.hit).toBe('function');
            expect(typeof sm.block).toBe('function');
            expect(typeof sm.victory).toBe('function');
            expect(typeof sm.defeat).toBe('function');
            expect(typeof sm.levelUp).toBe('function');
            expect(typeof sm.error).toBe('function');
            expect(typeof sm.notification).toBe('function');
            expect(typeof sm.manaUse).toBe('function');
            expect(typeof sm.explore).toBe('function');
            expect(typeof sm.achievement).toBe('function');
            expect(typeof sm.click).toBe('function');
            expect(typeof sm.hover).toBe('function');
            expect(typeof sm.combatStart).toBe('function');
            expect(typeof sm.heal).toBe('function');
            expect(typeof sm.skillUse).toBe('function');
        });

        it('should not throw when calling effects without audio context', () => {
            const sm = new SoundManager();
            sm.enabled = false; // Disable to prevent init attempts

            // These should not throw
            sm.cardPlay();
            sm.attack();
            sm.victory();
            sm.levelUp();
            sm.error();

            expect(true).toBe(true);
        });
    });

    describe('Integration', () => {
        it('should allow toggling and volume changes', () => {
            const sm = new SoundManager();

            sm.toggle();
            sm.setVolume(0.8);

            expect(sm.enabled).toBe(false);
            expect(sm.masterVolume).toBe(0.8);
        });
    });
});
