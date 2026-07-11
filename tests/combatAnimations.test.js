import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the heavy animation/particle dependencies so we test combatAnimations
// logic (DOM creation, branch selection) without a real canvas/RAF loop.
vi.mock('../js/animator', () => ({
    animator: {
        animate: vi.fn((opts) => {
            // Simulate completion synchronously
            if (opts.onUpdate) opts.onUpdate(opts.to ?? 0);
            if (opts.onComplete) opts.onComplete();
        }),
    },
}));

vi.mock('../js/particles', () => {
    class ParticleSystem {
        explosion = vi.fn();
        burst = vi.fn();
        impactEffect = vi.fn();
    }
    return { default: ParticleSystem };
});

import {
    triggerScreenShake, animateHealthBar, showVictorySplash, showDefeatOverlay,
    animateImpact, animateBlock, pulseElement, flashDamageNumber, enemyDefeatedExplosion,
} from '../js/combatAnimations.js';

const mockParticleSystem = { explosion: vi.fn(), burst: vi.fn(), impactEffect: vi.fn() };

describe('combatAnimations', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div class="game-container"></div><canvas id="game-board"></canvas>';
        // jsdom has no requestAnimationFrame by default; provide a no-op that resolves immediately
        vi.stubGlobal('requestAnimationFrame', (cb) => { cb(performance.now() + 1000); return 1; });
        vi.stubGlobal('cancelAnimationFrame', () => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllTimers();
    });

    describe('triggerScreenShake', () => {
        it('resolves and resets transform when container exists', async () => {
            await expect(triggerScreenShake(5, 100)).resolves.toBeUndefined();
            expect(document.querySelector('.game-container').style.transform).toBe('');
        });

        it('resolves immediately when no container', async () => {
            document.body.innerHTML = '';
            await expect(triggerScreenShake()).resolves.toBeUndefined();
        });

        it('resolves via fallback when requestAnimationFrame is unavailable', async () => {
            const raf = window.requestAnimationFrame;
            // @ts-ignore
            window.requestAnimationFrame = undefined;
            await expect(triggerScreenShake(5, 100)).resolves.toBeUndefined();
            window.requestAnimationFrame = raf;
        });
    });

    describe('animateHealthBar', () => {
        it('updates width and color for high health', async () => {
            const el = document.createElement('div');
            await animateHealthBar(el, 100, 80, 100);
            expect(el.style.width).toBe('80%');
            expect(el.style.background).toContain('rgb(16, 185, 129)');
        });

        it('uses mid color for medium health', async () => {
            const el = document.createElement('div');
            await animateHealthBar(el, 100, 40, 100);
            expect(el.style.background).toContain('rgb(251, 191, 36)');
        });

        it('uses low color for low health', async () => {
            const el = document.createElement('div');
            await animateHealthBar(el, 100, 10, 100);
            expect(el.style.background).toContain('rgb(239, 68, 68)');
        });

        it('resolves when element is null', async () => {
            await expect(animateHealthBar(null, 100, 50, 100)).resolves.toBeUndefined();
        });
    });

    describe('showVictorySplash', () => {
        it('appends a splash element and resolves', async () => {
            const p = showVictorySplash();
            // Element is created synchronously before any timer fires
            expect(document.querySelector('.victory-splash')).not.toBeNull();
            await p;
        });
    });

    describe('showDefeatOverlay', () => {
        it('appends a defeat overlay and resolves', async () => {
            const p = showDefeatOverlay();
            expect(document.querySelector('.defeat-overlay')).not.toBeNull();
            await p;
        });
    });

    describe('animateImpact', () => {
        it('creates a flash element and triggers particles', () => {
            animateImpact(10, 20, '#ef4444', mockParticleSystem);
            expect(document.querySelector('.combat-impact-flash')).not.toBeNull();
            expect(mockParticleSystem.impactEffect).toHaveBeenCalled();
        });

        it('works without a particle system', () => {
            expect(() => animateImpact(10, 20)).not.toThrow();
        });
    });

    describe('animateBlock', () => {
        it('creates a shield element and bursts particles', () => {
            animateBlock(30, 40, mockParticleSystem);
            expect(document.querySelector('.combat-block-effect')).not.toBeNull();
            expect(mockParticleSystem.burst).toHaveBeenCalled();
        });

        it('works without a particle system', () => {
            expect(() => animateBlock(30, 40)).not.toThrow();
        });
    });

    describe('pulseElement', () => {
        it('sets animation and pulse color', () => {
            const el = document.createElement('div');
            pulseElement(el, '#8b5cf6');
            expect(el.style.animation).toContain('elementPulse');
            expect(el.style.getPropertyValue('--pulse-color')).toBe('#8b5cf6');
        });

        it('is a no-op for null element', () => {
            expect(() => pulseElement(null)).not.toThrow();
        });
    });

    describe('flashDamageNumber', () => {
        it('creates a damage number element', () => {
            flashDamageNumber(5, 5, 12, '#ef4444');
            const el = document.querySelector('.damage-number');
            expect(el).not.toBeNull();
            expect(el.textContent).toBe('-12');
        });
    });

    describe('enemyDefeatedExplosion', () => {
        it('triggers explosions when particle system present', () => {
            enemyDefeatedExplosion(1, 2, mockParticleSystem);
            expect(mockParticleSystem.explosion).toHaveBeenCalled();
        });

        it('is safe without a particle system', () => {
            expect(() => enemyDefeatedExplosion(1, 2)).not.toThrow();
        });
    });
});
