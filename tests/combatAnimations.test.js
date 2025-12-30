import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import * as combatAnimations from '../js/combatAnimations.js';
import { createMockElement, createSpy } from './test-mocks.js';

describe('Combat Animations', () => {
    let container;

    let originalQuerySelector, originalCreateElement, originalAppendChild;
    let originalPerformance, originalRAF, originalCAF;

    beforeEach(() => {
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
            return el;
        };

        global.document.body.appendChild = createSpy('appendChild');

        // Mock performance and requestAnimationFrame
        global.performance = { now: () => Date.now() };
        global.requestAnimationFrame = (cb) => {
            setTimeout(() => cb(Date.now()), 16);
            return 1;
        };
        global.cancelAnimationFrame = createSpy('cancelAnimationFrame');
    });

    afterEach(() => {
        global.document.querySelector = originalQuerySelector;
        global.document.createElement = originalCreateElement;
        global.document.body.appendChild = originalAppendChild;
        global.performance = originalPerformance;
        global.requestAnimationFrame = originalRAF;
        global.cancelAnimationFrame = originalCAF;
    });

    it('should trigger screen shake', async () => {
        const promise = combatAnimations.triggerScreenShake(5, 50);
        await promise;
        expect(container.style.transform).toBe('');
    });

    it('should animate health bar', async () => {
        const bar = createMockElement('div');
        bar.style.width = '100%';

        await combatAnimations.animateHealthBar(bar, 100, 50, 100);
        expect(bar.style.width).toBe('50%');
    });

    it('should show victory splash', async () => {
        await combatAnimations.showVictorySplash();
        expect(global.document.body.appendChild.called).toBe(true);
    });

    it('should show defeat overlay', async () => {
        await combatAnimations.showDefeatOverlay();
        expect(global.document.body.appendChild.called).toBe(true);
    });

    it('should animate impact', () => {
        const particleSystem = {
            impactEffect: createSpy('impactEffect')
        };
        combatAnimations.animateImpact(100, 100, '#ff0000', particleSystem);
        expect(particleSystem.impactEffect.called).toBe(true);
    });

    it('should animate block', () => {
        const particleSystem = {
            burst: createSpy('burst')
        };
        combatAnimations.animateBlock(100, 100, particleSystem);
        expect(particleSystem.burst.called).toBe(true);
    });

    it('should pulse element', () => {
        const el = createMockElement('div');
        combatAnimations.pulseElement(el, '#ff0000');
        expect(el.style.animation).toBe('elementPulse 0.5s ease-in-out');
    });

    it('should flash damage number', () => {
        combatAnimations.flashDamageNumber(100, 100, 10, '#ff0000');
        expect(global.document.body.appendChild.called).toBe(true);
    });

    it('should trigger enemy defeated explosion', () => {
        const particleSystem = {
            explosion: createSpy('explosion')
        };
        combatAnimations.enemyDefeatedExplosion(100, 100, particleSystem);
        expect(particleSystem.explosion.called).toBe(true);
    });
});
