
import { Animator } from '../js/animator.js';
import { createSpy } from './test-mocks.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Animator Stress Tests', () => {
    let animator;
    let mockRAF;
    let mockCancelRAF;
    let time;

    beforeEach(() => {
        animator = new Animator();
        time = 1000;

        // Mock Performance and RAF
        global.performance = { now: () => time };

        // Manual RAF control
        mockRAF = (cb) => {
            // Store callback to call manually
            setTimeout(() => {
                time += 16;
                cb(time);
            }, 1);
            return 123; // Dummy ID
        };
        mockCancelRAF = createSpy('cancelAnimationFrame');

        global.requestAnimationFrame = mockRAF;
        global.cancelAnimationFrame = mockCancelRAF;
    });

    it('should animate value correctly', async () => {
        return new Promise(resolve => {
            let lastVal = 0;
            animator.animate({
                from: 0,
                to: 100,
                duration: 100,
                onUpdate: (val) => lastVal = val,
                onComplete: () => {
                    expect(lastVal).toBe(100);
                    resolve();
                }
            });

            // Fast forward time
            const step = () => {
                time += 50; // Halfway
                // Since mockRAF uses setTimeout, we wait
            };
            // In real test env with fake timers this is easier.
            // Here we rely on the implementation's RAF behavior.
            // Actually, my mock RAF above uses setTimeout(1ms).
            // So time must advance.
        });
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
        // Similar to first test but checking map size
        return new Promise(resolve => {
            const id = animator.animate({
                from: 0, to: 1, duration: 10,
                onComplete: () => {
                    expect(animator.activeAnimations.has(id)).toBe(false);
                    resolve();
                }
            });
        });
    });
});
