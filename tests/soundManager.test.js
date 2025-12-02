import { describe, it, expect } from './testRunner.js';
import { SoundManager } from '../js/soundManager.js';
import { createSpy } from './test-mocks.js';

describe('SoundManager', () => {
    describe('Initialization', () => {
        it('should initialize with disabled state', () => {
            const sm = new SoundManager();

            expect(sm.enabled).toBe(false);
            expect(sm.volume).toBe(0);
            expect(sm.audioContext).toBeNull();
        });
    });

    describe('toggle', () => {
        it('should always return false and remain disabled', () => {
            const sm = new SoundManager();

            const result = sm.toggle();

            expect(result).toBe(false);
            expect(sm.enabled).toBe(false);
        });
    });

    describe('setVolume', () => {
        it('should not change volume', () => {
            const sm = new SoundManager();

            sm.setVolume(0.5);

            expect(sm.volume).toBe(0);
        });
    });

    describe('playTone', () => {
        it('should be a no-op', () => {
            const sm = new SoundManager();
            // Should not throw
            sm.playTone(440, 0.1, 'sine');
            expect(true).toBe(true);
        });
    });

    describe('Sound Effects', () => {
        it('should not call playTone for effects', () => {
            const sm = new SoundManager();
            const playToneSpy = createSpy();
            sm.playTone = playToneSpy;

            // Call various effects
            sm.cardPlay();
            sm.attack();
            sm.victory();
            sm.levelUp();
            sm.error();

            // Since methods are empty, they shouldn't call playTone
            expect(playToneSpy.callCount).toBe(0);
        });
    });

    describe('Integration', () => {
        it('should remain disabled regardless of interactions', () => {
            const sm = new SoundManager();
            sm.toggle();
            sm.setVolume(1);

            expect(sm.enabled).toBe(false);
            expect(sm.volume).toBe(0);
        });
    });
});
