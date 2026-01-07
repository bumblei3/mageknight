import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as combatAnimations from '../../js/combatAnimations.js';
import { createMockElement } from '../test-mocks.js';
import { animator } from '../../js/animator.js';

describe('Combat Animations', () => {
    let container;

    let originalQuerySelector, originalCreateElement, originalAppendChild;
    let originalPerformance, originalRAF, originalCAF;

    beforeEach(() => {
        vi.useFakeTimers();
        originalQuerySelector = global.document.querySelector;
        originalCreateElement = global.document.createElement;
        originalAppendChild = global.document.body.appendChild;
        originalPerformance = global.performance;
        originalRAF = global.requestAnimationFrame;
        originalCAF = global.cancelAnimationFrame;

        // Setup DOM mocks
        container = createMockElement('div');
        container.className = 'game-container';

        global.document.querySelector = (selector) => {
            if (selector === '.game-container') return container;
            return null;
        };

        global.document.createElement = (tag) => {
            const el = createMockElement(tag);
            el.className = '';
            el.remove = vi.fn(); // Mock remove
            return el;
        };

        global.document.body.appendChild = vi.fn();

        // Mock performance and requestAnimationFrame
        global.performance = { now: () => Date.now() };
        global.requestAnimationFrame = (cb) => {
            return setTimeout(() => cb(Date.now() + 16), 16);
        };
        global.cancelAnimationFrame = (id) => clearTimeout(id);
    });

    afterEach(() => {
        vi.useRealTimers();
        global.document.querySelector = originalQuerySelector;
        global.document.createElement = originalCreateElement;
        global.document.body.appendChild = originalAppendChild;
        global.performance = originalPerformance;
        global.requestAnimationFrame = originalRAF;
        global.cancelAnimationFrame = originalCAF;
        animator.cancelAll();
    });

    it('should trigger screen shake', async () => {
        const promise = combatAnimations.triggerScreenShake(5, 50);
        vi.advanceTimersByTime(100);
        await promise;
        expect(container.style.transform).toBe('');
    });

    it('should animate health bar', async () => {
        const bar = createMockElement('div');
        bar.style.width = '100%';

        const promise = combatAnimations.animateHealthBar(bar, 100, 50, 100);

        // Advance time in steps to ensure rAF loop triggers
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(400);

        await promise;
        expect(bar.style.width).toBe('50%');
    });

    it('should show victory splash', async () => {
        const promise = combatAnimations.showVictorySplash();
        vi.advanceTimersByTime(2500); // Wait for animations
        await promise;
        expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    it('should show defeat overlay', async () => {
        const promise = combatAnimations.showDefeatOverlay();
        vi.advanceTimersByTime(2000);
        await promise;
        expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    it('should animate impact', () => {
        const particleSystem = {
            impactEffect: vi.fn()
        };
        combatAnimations.animateImpact(100, 100, '#ff0000', particleSystem);
        expect(particleSystem.impactEffect).toHaveBeenCalled();
    });

    it('should animate block', () => {
        const particleSystem = {
            burst: vi.fn()
        };
        combatAnimations.animateBlock(100, 100, particleSystem);
        expect(particleSystem.burst).toHaveBeenCalled();
    });

    it('should pulse element', () => {
        const el = createMockElement('div');
        combatAnimations.pulseElement(el, '#ff0000');
        expect(el.style.animation).toBe('elementPulse 0.5s ease-in-out');
    });

    it('should flash damage number', () => {
        combatAnimations.flashDamageNumber(100, 100, 10, '#ff0000');
        expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    it('should trigger enemy defeated explosion', () => {
        const particleSystem = {
            explosion: vi.fn()
        };
        combatAnimations.enemyDefeatedExplosion(100, 100, particleSystem);
        expect(particleSystem.explosion).toHaveBeenCalled();
    });

    // Edge cases
    it('should handle screen shake with no container', async () => {
        global.document.querySelector = () => null;
        const promise = combatAnimations.triggerScreenShake(5, 50);
        vi.advanceTimersByTime(100);
        await promise;
    });

    it('should handle health bar with null element', async () => {
        await combatAnimations.animateHealthBar(null, 100, 50, 100);
    });

    it('should handle pulse element with null', () => {
        combatAnimations.pulseElement(null, '#ff0000');
    });

    it('should handle impact without particle system', () => {
        combatAnimations.animateImpact(100, 100, '#ff0000', null);
        expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    it('should handle block without particle system', () => {
        combatAnimations.animateBlock(100, 100, null);
        expect(global.document.body.appendChild).toHaveBeenCalled();
    });

    it('should handle enemy explosion without particle system', () => {
        combatAnimations.enemyDefeatedExplosion(100, 100, null);
        // Should not throw
    });

    it('should handle health bar healing (to > from)', async () => {
        const bar = createMockElement('div');
        bar.style.width = '50%';
        const promise = combatAnimations.animateHealthBar(bar, 50, 100, 100);

        await vi.advanceTimersByTimeAsync(600);
        await promise;

        expect(bar.style.width).toBe('100%');
    });

    it('should use default color for impact', () => {
        const particleSystem = { impactEffect: vi.fn() };
        combatAnimations.animateImpact(100, 100, undefined, particleSystem);
        expect(particleSystem.impactEffect).toHaveBeenCalled();
    });

    it('should use default color for pulse', () => {
        const el = createMockElement('div');
        combatAnimations.pulseElement(el);
        expect(el.style.animation).toBe('elementPulse 0.5s ease-in-out');
    });
});
