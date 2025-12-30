
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import * as combatAnimations from '../js/combatAnimations.js';
import { animator } from '../js/animator.js';

describe('Combat Animations', () => {
    let mockContainer;

    beforeEach(() => {
        // Mock DOM manually because mock innerHTML doesn't parse
        document.body.innerHTML = ''; // clear

        const container = document.createElement('div');
        container.className = 'game-container';
        // MockHTMLElement classList sync needs help if assigned directly? 
        // My mock adds to classList on assignment if checking? 
        // No, current mock querySelector checks classList OR className. 
        // So className assignment is fine.
        document.body.appendChild(container);
        mockContainer = container;

        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        document.body.appendChild(canvas);

        // Mock requestAnimationFrame
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
        global.cancelAnimationFrame = (id) => clearTimeout(id);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        animator.cancelAll();
    });

    it('should trigger screen shake', async () => {
        const shakePromise = combatAnimations.triggerScreenShake(10, 50);

        // Container should have transform during shake
        // We wait a bit
        await new Promise(r => setTimeout(r, 20));
        expect(mockContainer.style.transform).toMatch(/translate|rotate/);

        await shakePromise;
        expect(mockContainer.style.transform).toBe('');
    });

    it('should animate health bar', async () => {
        const bar = document.createElement('div');
        bar.style.width = '100%';

        const animation = combatAnimations.animateHealthBar(bar, 100, 50, 100);

        await new Promise(r => setTimeout(r, 100));
        // Width should be between 100% and 50%
        const width = parseFloat(bar.style.width);
        expect(width).toBeLessThan(100);
        expect(width).toBeGreaterThan(40);

        await animation;
        expect(bar.style.width).toBe('50%');
    });

    it('should show victory splash', async () => {
        const splashPromise = combatAnimations.showVictorySplash();

        const splash = document.querySelector('.victory-splash');
        expect(splash).not.toBeNull();
        expect(splash.innerHTML).toContain('SIEG!');

        // It auto-removes after ~2.5s (2s timeout + 0.5s fade)
        // We skip waiting for full time in unit test, but we verify itexists
    });

    it('should show defeat overlay', async () => {
        const overlayPromise = combatAnimations.showDefeatOverlay();

        const overlay = document.querySelector('.defeat-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.innerHTML).toContain('VERLETZT');
    });

    it('should animate impact', () => {
        combatAnimations.animateImpact(100, 100, '#ff0000');

        const flash = document.querySelector('.combat-impact-flash');
        expect(flash).not.toBeNull();
        expect(flash.style.left).toBe('100px');
        expect(flash.style.top).toBe('100px');
    });

    it('should animate block', () => {
        combatAnimations.animateBlock(150, 150);

        const blockEffect = document.querySelector('.combat-block-effect');
        expect(blockEffect).not.toBeNull();
        expect(blockEffect.innerHTML).toBe('🛡️');
    });

    it('should pulse element', async () => {
        const el = document.createElement('div');
        combatAnimations.pulseElement(el, '#00ff00');

        expect(el.style.animation).toContain('elementPulse');
        expect(el.style.getPropertyValue('--pulse-color')).toBe('#00ff00');

        await new Promise(r => setTimeout(r, 600));
        expect(el.style.animation).toBe('');
    });

    it('should flash damage number', () => {
        combatAnimations.flashDamageNumber(200, 200, 5, '#ff0000');

        const num = document.querySelector('.damage-number');
        expect(num).not.toBeNull();
        expect(num.textContent).toBe('-5');
        // Accept either hex or rgb depending on environment
        expect(['#ff0000', 'rgb(255, 0, 0)']).toContain(num.style.color);
    });
});
