
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Animator, animator, animateCounter, shake } from '../js/animator.js';
import { setupGlobalMocks, resetMocks, createMockElement } from './test-mocks.js';

setupGlobalMocks();

describe('Animator Coverage', () => {
    let anim;
    let mockElement;

    beforeEach(() => {
        resetMocks();
        anim = new Animator();
        mockElement = createMockElement('div');
        mockElement.style = {
            transform: '',
            setProperty: (prop, val) => { mockElement.style[prop] = val; }
        };
        mockElement.textContent = '';

        // Mock requestAnimationFrame
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    });

    describe('easing functions', () => {
        it('should have linear easing', () => {
            expect(anim.easingFunctions.linear(0.5)).toBe(0.5);
        });

        it('should have easeInQuad', () => {
            expect(anim.easingFunctions.easeInQuad(0.5)).toBe(0.25);
        });

        it('should have easeOutQuad', () => {
            const result = anim.easingFunctions.easeOutQuad(0.5);
            expect(result).toBeGreaterThan(0.5);
        });

        it('should have easeOutElastic', () => {
            const result = anim.easingFunctions.easeOutElastic(0.5);
            expect(typeof result).toBe('number');
        });
    });

    describe('animate', () => {
        it('should animate from start to end', async () => {
            let lastValue = 0;
            const id = anim.animate({
                from: 0,
                to: 100,
                duration: 50,
                onUpdate: (value) => { lastValue = value; }
            });
            expect(id).toBeDefined();

            await new Promise(r => setTimeout(r, 100));
            expect(lastValue).toBeGreaterThan(0);
        });
    });

    describe('cancel', () => {
        it('should cancel active animation', () => {
            const id = anim.animate({
                from: 0,
                to: 100,
                duration: 1000,
                onUpdate: () => { }
            });

            anim.cancel(id);
            expect(anim.activeAnimations.has(id)).toBe(false);
        });
    });

    describe('cancelAll', () => {
        it('should cancel all animations', () => {
            anim.animate({ from: 0, to: 100, duration: 1000, onUpdate: () => { } });
            anim.animate({ from: 0, to: 50, duration: 1000, onUpdate: () => { } });

            anim.cancelAll();
            expect(anim.activeAnimations.size).toBe(0);
        });
    });

});
