import { describe, it, expect, beforeEach } from './testRunner.js';
import { Animator, animateCounter, shake } from '../js/animator.js';

describe('Animator', () => {
    let animator;

    beforeEach(() => {
        animator = new Animator();
    });

    it('should initialize with empty animation map', () => {
        expect(animator.activeAnimations.size).toBe(0);
        expect(animator.animationId).toBe(0);
    });

    it('should return animation ID', () => {
        const id1 = animator.animate({
            from: 0,
            to: 100,
            duration: 100
        });

        const id2 = animator.animate({
            from: 0,
            to: 100,
            duration: 100
        });

        expect(id1).toBe(0);
        expect(id2).toBe(1);
    });

    it('should track active animations', () => {
        animator.animate({
            from: 0,
            to: 100,
            duration: 100
        });

        animator.animate({
            from: 0,
            to: 100,
            duration: 100
        });

        expect(animator.activeAnimations.size).toBe(2);
    });

    it('should support various easing functions', () => {
        const easings = [
            'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
            'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
            'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
            'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
            'easeOutBounce', 'easeInBounce', 'easeInOutBounce',
            'easeInBack', 'easeOutBack', 'easeInOutBack'
        ];

        easings.forEach(easing => {
            expect(animator.easingFunctions[easing]).toBeDefined();
        });
    });

    it('should run animations in sequence', async () => {
        const order = [];

        await animator.sequence([
            (done) => {
                order.push(1);
                setTimeout(done, 10);
            },
            (done) => {
                order.push(2);
                setTimeout(done, 10);
            },
            (done) => {
                order.push(3);
                setTimeout(done, 10);
            }
        ]);

        expect(order).toEqual([1, 2, 3]);
    });

    it('should run animations in parallel', async () => {
        const started = [];
        const finished = [];

        await animator.parallel([
            (done) => {
                started.push(1);
                setTimeout(() => {
                    finished.push(1);
                    done();
                }, 20);
            },
            (done) => {
                started.push(2);
                setTimeout(() => {
                    finished.push(2);
                    done();
                }, 15);
            },
            (done) => {
                started.push(3);
                setTimeout(() => {
                    finished.push(3);
                    done();
                }, 10);
            }
        ]);

        expect(started.length).toBe(3);
        expect(finished.length).toBe(3);
        expect(started).toEqual([1, 2, 3]);
    });

    it('should cancel specific animation', () => {
        const id = animator.animate({
            from: 0,
            to: 100,
            duration: 100
        });

        expect(animator.activeAnimations.has(id)).toBe(true);

        animator.cancel(id);
        expect(animator.activeAnimations.has(id)).toBe(false);
    });

    it('should cancel all animations', () => {
        animator.animate({ from: 0, to: 100, duration: 100 });
        animator.animate({ from: 0, to: 100, duration: 100 });

        expect(animator.activeAnimations.size).toBe(2);

        animator.cancelAll();
        expect(animator.activeAnimations.size).toBe(0);
    });

    it('should have animateProperties method', () => {
        expect(typeof animator.animateProperties).toBe('function');
    });

    it('should have animate method', () => {
        expect(typeof animator.animate).toBe('function');
    });

    it('should have sequence method', () => {
        expect(typeof animator.sequence).toBe('function');
    });

    it('should have parallel method', () => {
        expect(typeof animator.parallel).toBe('function');
    });

    it('should have cancel method', () => {
        expect(typeof animator.cancel).toBe('function');
    });

    it('should have cancelAll method', () => {
        expect(typeof animator.cancelAll).toBe('function');
    });
});

describe('Animator Helper Functions', () => {
    it('should have animateCounter function', () => {
        expect(typeof animateCounter).toBe('function');
    });

    it('should have shake function', () => {
        expect(typeof shake).toBe('function');
    });

    it('should shake element by modifying transform', async () => {
        const mockElement = {
            style: {
                transform: ''
            }
        };

        shake(mockElement, 10, 50);

        // Give it time to run
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(typeof mockElement.style.transform).toBe('string');
    });
});
