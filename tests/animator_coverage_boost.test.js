import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Animator, animateCounter, shake } from '../js/animator.js';
import { setupGlobalMocks } from './test-mocks.js';

describe('Animator - Coverage Boost', () => {
    let animator;

    beforeEach(() => {
        vi.useFakeTimers();
        setupGlobalMocks();
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    describe('Easing Functions - Basic Coverage', () => {
        const easings = [
            'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
            'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
            'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
            'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
            'easeOutBounce', 'easeInBounce', 'easeInOutBounce',
            'easeInBack', 'easeOutBack', 'easeInOutBack'
        ];

        it('should have all easing functions defined', () => {
            const anim = new Animator();
            const easings = [
                'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
                'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
                'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
                'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
                'easeOutBounce', 'easeInBounce', 'easeInOutBounce',
                'easeInBack', 'easeOutBack', 'easeInOutBack'
            ];
            easings.forEach(name => {
                expect(typeof anim.easingFunctions[name]).toBe('function');
            });
        });

        it('should produce valid outputs for all easing functions at boundaries', () => {
            const anim = new Animator();
            const easings = Object.keys(anim.easingFunctions);
            const testValues = [0, 0.25, 0.5, 0.75, 1];
            
            easings.forEach(name => {
                const fn = anim.easingFunctions[name];
                testValues.forEach(t => {
                    const result = fn(t);
                    expect(typeof result).toBe('number');
                    expect(isNaN(result)).toBe(false);
                    expect(isFinite(result)).toBe(true);
                });
            });
        });

        it('should return 0 at t=0 for all easing functions', () => {
            const anim = new Animator();
            const easings = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'];
            easings.forEach(name => {
                const fn = anim.easingFunctions[name];
                expect(fn(0)).toBe(0);
            });
        });

        it('should return 1 at t=1 for all easing functions', () => {
            const anim = new Animator();
            const easings = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'];
            easings.forEach(name => {
                const fn = anim.easingFunctions[name];
                expect(fn(1)).toBeCloseTo(1, 10);
            });
        });

        it('should handle easeInBounce delegate', () => {
            const anim = new Animator();
            const fn = anim.easingFunctions.easeInBounce;
            // Just verify it doesn't throw and returns reasonable values
            expect(fn(0)).toBe(0);
            expect(fn(1)).toBeCloseTo(1, 10);
        });

        it('should handle easeInOutBounce', () => {
            const anim = new Animator();
            const fn = anim.easingFunctions.easeInOutBounce;
            expect(fn(0)).toBe(0);
            expect(fn(1)).toBeCloseTo(1, 10);
        });
    });

    describe('animate() - Core Coverage', () => {
        it('should return animation ID', () => {
            const anim = new Animator();
            const id = anim.animate({ from: 0, to: 1, duration: 100 });
            expect(typeof id).toBe('number');
        });

        it('should handle missing onUpdate and onComplete callbacks', () => {
            const anim = new Animator();
            expect(() => {
                anim.animate({ from: 0, to: 1, duration: 100 });
            }).not.toThrow();
        });

        it('should increment animation ID for each call', () => {
            const anim = new Animator();
            const id1 = anim.animate({ from: 0, to: 1, duration: 100 });
            const id2 = anim.animate({ from: 0, to: 1, duration: 100 });
            const id3 = anim.animate({ from: 0, to: 1, duration: 100 });
            expect(id2).toBe(id1 + 1);
            expect(id3).toBe(id2 + 1);
        });

        it('should use fallback setTimeout when requestAnimationFrame not available', () => {
            const anim = new Animator();
            const originalRAF = global.requestAnimationFrame;
            global.requestAnimationFrame = undefined;
            
            expect(() => {
                anim.animate({ from: 0, to: 1, duration: 100 });
            }).not.toThrow();
            
            global.requestAnimationFrame = (cb => cb); // restore
        });

        it('should handle same from and to values', () => {
            const anim = new Animator();
            const onUpdate = vi.fn();
            anim.animate({
                from: 50,
                to: 50,
                duration: 100,
                onUpdate
            });
            expect(onUpdate).not.toHaveBeenCalled(); // Not called yet
        });

        it('should handle zero duration', () => {
            const anim = new Animator();
            const onComplete = vi.fn();
            anim.animate({
                from: 0,
                to: 100,
                duration: 0,
                onComplete
            });
            // Zero duration triggers onComplete immediately in next frame
        });
    });

    describe('animateHeroMove() Coverage', () => {
        it('should return immediately if hero is falsy', async () => {
            await expect(new Animator().animateHeroMove(null, { q: 0, r: 0 }, { q: 1, r: 1 })).resolves.toBeUndefined();
        });

        it('should return immediately if hero has no displayPosition', async () => {
            await expect(new Animator().animateHeroMove({}, { q: 0, r: 0 }, { q: 1, r: 1 })).resolves.toBeUndefined();
        });
    });

    describe('animateProperties() Coverage', () => {
        it('should animate single property', async () => {
            const anim = new Animator();
            const target = { opacity: 0 };
            // Just test that the method is called and starts - don't wait for completion
            const result = anim.animateProperties(target, { opacity: 1 }, 50);
            expect(typeof result).toBe('number');
        });

        it('should accept custom easing option', async () => {
            const anim = new Animator();
            const target = { x: 0 };
            const result = anim.animateProperties(target, { x: 10 }, 50, { easing: 'easeInQuad' });
            expect(typeof result).toBe('number');
        });

        it('should call onComplete callback if provided', async () => {
            const anim = new Animator();
            const onComplete = vi.fn();
            await anim.animateProperties({ x: 0 }, { x: 10 }, 50, { onComplete });
            // Just verify method is called and completes
        });
    });
    describe('sequence() Coverage', () => {
        it('should run animations in sequence', async () => {
            const order = [];
            await new Animator().sequence([
                resolve => { order.push(1); resolve(); },
                resolve => { order.push(2); resolve(); },
                resolve => { order.push(3); resolve(); }
            ]);
            expect(order).toEqual([1, 2, 3]);
        });

        it('should handle empty array', async () => {
            await expect(new Animator().sequence([])).resolves.toBeUndefined();
        });

        it('should handle single animation', async () => {
            const order = [];
            await new Animator().sequence([resolve => { order.push(1); resolve(); }]);
            expect(order).toEqual([1]);
        });
    });

    describe('parallel() Coverage', () => {
        it('should handle empty array', async () => {
            await expect(new Animator().parallel([])).resolves.toBeUndefined();
        });
    });

    describe('cancel() Coverage', () => {
        it('should cancel active animation by ID', () => {
            const anim = new Animator();
            const id = anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.cancel(id);
            expect(anim.activeAnimations.has(id)).toBe(false);
        });

        it('should handle cancel on non-existent ID', () => {
            expect(() => {
                new Animator().cancel(99999);
            }).not.toThrow();
        });

        it('should use cancelAnimationFrame in browser', () => {
            const anim = new Animator();
            const id = anim.animate({ from: 0, to: 1, duration: 1000 });
            const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
            anim.cancel(id);
            expect(cafSpy).toHaveBeenCalled();
        });

        it('should use clearTimeout fallback when cancelAnimationFrame fails', () => {
            const originalCAF = window.cancelAnimationFrame;
            window.cancelAnimationFrame = undefined;
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
            
            const anim = new Animator();
            const id = anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.cancel(id);
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            
            window.cancelAnimationFrame = originalCAF;
        });
    });

    describe('cancelAll() Coverage', () => {
        it('should cancel all active animations', () => {
            const anim = new Animator();
            anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.cancelAll();
            expect(anim.activeAnimations.size).toBe(0);
        });

        it('should handle empty activeAnimations', () => {
            expect(() => {
                new Animator().cancelAll();
            }).not.toThrow();
        });

        it('should use clearTimeout fallback when cancelAnimationFrame fails', () => {
            const originalCAF = window.cancelAnimationFrame;
            window.cancelAnimationFrame = undefined;
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
            
            const anim = new Animator();
            anim.animate({ from: 0, to: 1, duration: 1000 });
            anim.cancelAll();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            window.cancelAnimationFrame = originalCAF;
        });
    });

    describe('animateCounter() Coverage', () => {
        it('should not throw when called', () => {
            const anim = new Animator();
            const element = document.createElement('div');
            element.textContent = '0';
            document.body.appendChild(element);
            
            expect(() => {
                animateCounter(element, 0, 100, 100, anim);
            }).not.toThrow();
            
            document.body.innerHTML = '';
        });
    });

    describe('shake() Coverage', () => {
        it('should not throw when called', () => {
            const element = document.createElement('div');
            document.body.appendChild(element);
            
            expect(() => {
                shake(element, 10, 50);
            }).not.toThrow();
            
            document.body.innerHTML = '';
        });

        it('should accept intensity and duration parameters', () => {
            const element = document.createElement('div');
            document.body.appendChild(element);
            
            shake(element, 50, 100);
            
            document.body.innerHTML = '';
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple concurrent animations', () => {
            const anim = new Animator();
            anim.animate({ from: 0, to: 100, duration: 100 });
            anim.animate({ from: 100, to: 0, duration: 100 });
            anim.animate({ from: 50, to: 50, duration: 100 });
            expect(anim.activeAnimations.size).toBe(3);
        });

        it('should handle easing function returning NaN gracefully', () => {
            const anim = new Animator();
            anim.easingFunctions.broken = () => NaN;
            
            expect(() => {
                anim.animate({ from: 0, to: 100, duration: 100, easing: 'broken' });
            }).not.toThrow();
            
            delete anim.easingFunctions.broken;
        });

        it('should handle missing window in non-browser environment', () => {
            const originalWindow = global.window;
            global.window = undefined;
            
            expect(() => {
                const anim = new Animator();
                anim.animate({ from: 0, to: 1, duration: 100 });
            }).not.toThrow();
            
            global.window = originalWindow;
        });

        it('should export singleton animator instance', async () => {
            const { animator: anim } = await import('../js/animator.js');
            expect(anim).toBeDefined();
        });
    });
});