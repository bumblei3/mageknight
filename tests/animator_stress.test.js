import { Animator } from '../js/animator.js';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSpy } from './test-mocks.js';

describe('Animator Stress Tests', () => {
    let animator;
    let mockCancelRAF;

    beforeEach(() => {
        vi.useFakeTimers();
        animator = new Animator();
        mockCancelRAF = createSpy('cancelAnimationFrame');
        global.cancelAnimationFrame = mockCancelRAF;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should animate value correctly', async () => {
        let lastVal = 0;
        let completed = false;

        animator.animate({
            from: 0,
            to: 100,
            duration: 100,
            onUpdate: (val) => lastVal = val,
            onComplete: () => {
                completed = true;
            }
        });

        // Advance 50ms
        await vi.advanceTimersByTimeAsync(50);
        expect(lastVal).toBeGreaterThan(0);
        expect(lastVal).toBeLessThan(100);
        expect(completed).toBe(false);

        // Advance enough to complete (total 100ms+, with 16ms step it might need slightly more)
        await vi.advanceTimersByTimeAsync(66);
        expect(lastVal).toBe(100);
        expect(completed).toBe(true);
    });

    it('should cancel active animation', () => {
        // Validation of cancel function presence
        expect(typeof animator.cancel).toBe('function');

        const id = animator.animate({
            from: 0,
            to: 100,
            duration: 1000
        });

        expect(animator.activeAnimations.has(id)).toBe(true);

        animator.cancel(id);

        expect(animator.activeAnimations.has(id)).toBe(false);
        expect(mockCancelRAF.called).toBe(true);
    });

    it('should clean up map after completion', async () => {
        let completed = false;
        const id = animator.animate({
            from: 0,
            to: 1,
            duration: 10,
            onComplete: () => {
                completed = true;
            }
        });

        expect(animator.activeAnimations.has(id)).toBe(true);

        // Advance enough time to trigger all RAF frames and completion
        await vi.advanceTimersByTimeAsync(20);

        expect(completed).toBe(true);
        expect(animator.activeAnimations.has(id)).toBe(false);
    });
});
