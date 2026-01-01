
import { describe, it, expect, beforeEach } from './testRunner.js';
import { SoundManager } from '../js/soundManager.js';

describe('SoundManager Coverage', () => {
    let soundManager;

    beforeEach(() => {
        soundManager = new SoundManager();
        // Disable to prevent audio context init in Node.js tests
        soundManager.enabled = false;
    });

    describe('initialization', () => {
        it('should initialize with sound enabled by default', () => {
            const sm = new SoundManager();
            expect(sm.enabled).toBe(true);
            expect(sm.volume).toBe(0.3);
        });
    });

    describe('toggle', () => {
        it('should toggle and return new state', () => {
            const sm = new SoundManager();
            const result = sm.toggle();
            expect(result).toBe(false); // First toggle disables
        });
    });

    describe('setVolume', () => {
        it('should accept volume without error', () => {
            soundManager.setVolume(0.5);
            expect(soundManager.volume).toBe(0.5);
        });
    });

    describe('sound effects', () => {
        it('should call cardPlay without error', () => {
            soundManager.cardPlay();
        });

        it('should call cardPlayStrong without error', () => {
            soundManager.cardPlayStrong();
        });

        it('should call move without error', () => {
            soundManager.move();
        });

        it('should call attack without error', () => {
            soundManager.attack();
        });

        it('should call hit without error', () => {
            soundManager.hit();
        });

        it('should call block without error', () => {
            soundManager.block();
        });

        it('should call victory without error', () => {
            soundManager.victory();
        });

        it('should call defeat without error', () => {
            soundManager.defeat();
        });

        it('should call levelUp without error', () => {
            soundManager.levelUp();
        });

        it('should call error without error', () => {
            soundManager.error();
        });

        it('should call notification without error', () => {
            soundManager.notification();
        });

        it('should call cardDraw without error', () => {
            soundManager.cardDraw();
        });

        it('should call cardPlaySideways without error', () => {
            soundManager.cardPlaySideways();
        });

        it('should call manaUse without error', () => {
            soundManager.manaUse();
        });

        it('should call explore without error', () => {
            soundManager.explore();
        });

        it('should call achievement without error', () => {
            soundManager.achievement();
        });

        it('should call playTone without error', () => {
            soundManager.playTone(440, 100, 'sine');
        });
    });
});
