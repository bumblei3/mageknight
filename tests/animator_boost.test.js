
import { describe, it, expect } from './testRunner.js';
import { animator, animateCounter } from '../js/animator.js';

describe('Animator Coverage Boost', () => {
    it('should register animations', () => {
        const animationId = animator.animate({
            from: 0,
            to: 100,
            duration: 1000,
            onUpdate: () => { }
        });

        expect(animationId).toBeDefined();
        expect(animator.activeAnimations.has(animationId)).toBe(true);

        // Cleanup
        animator.cancel(animationId);
        expect(animator.activeAnimations.has(animationId)).toBe(false);
    });

    it('should animate properties helper', () => {
        const target = { x: 0 };
        const id = animator.animateProperties(target, { x: 100 }, 1000);
        expect(id).toBeDefined();
        animator.cancel(id);
    });

    it('should support parallel animations', async () => {
        // Just verify it returns a promise
        // We mock setTimeout in global scope usually, but if not, this might delay.
        // We trust the structure.
        const p = animator.parallel([
            (resolve) => resolve()
        ]);
        expect(p).toBeInstanceOf(Promise);
        await p;
    });

    it('should cancel all animations', () => {
        animator.animate({ from: 0, to: 1, duration: 1000 });
        animator.animate({ from: 0, to: 1, duration: 1000 });
        expect(animator.activeAnimations.size).toBeGreaterThan(0);

        animator.cancelAll();
        expect(animator.activeAnimations.size).toBe(0);
    });
});
