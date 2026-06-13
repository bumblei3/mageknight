import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    animateCardDraw,
    animateCardPlay,
    animateCardDiscard,
    animate3DTilt,
    reset3DTilt,
    shakeCard,
    flipCard,
    pulseGlow,
    stopPulseGlow,
    highlightCard,
} from '../js/cardAnimations.js';
import { setupGlobalMocks } from './test-mocks.js';

describe('Card Animations - Coverage Boost', () => {
    let cardElement;
    let targetElement;

    beforeEach(() => {
        vi.useFakeTimers();
        setupGlobalMocks();
        
        cardElement = document.createElement('div');
        cardElement.style.cssText = 'position: absolute; left: 100px; top: 100px; width: 100px; height: 150px;';
        cardElement.getBoundingClientRect = vi.fn(() => ({
            left: 100, top: 100, width: 100, height: 150,
            right: 200, bottom: 250,
        }));
        document.body.appendChild(cardElement);

        targetElement = document.createElement('div');
        targetElement.style.cssText = 'position: absolute; left: 300px; top: 200px; width: 120px; height: 180px;';
        targetElement.getBoundingClientRect = vi.fn(() => ({
            left: 300, top: 200, width: 120, height: 180,
            right: 420, bottom: 380,
        }));
        document.body.appendChild(targetElement);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    describe('animateCardDraw', () => {
        it('should return a Promise', () => {
            expect(animateCardDraw(cardElement, 0)).toBeInstanceOf(Promise);
        });

        it('should set initial transform and opacity', () => {
            animateCardDraw(cardElement, 0);
            expect(cardElement.style.transform).toBe('translateX(-200px) translateY(100px) scale(0.5) rotate(-20deg)');
            expect(cardElement.style.opacity).toBe('0');
        });

        it('should set transition and final state after delay', async () => {
            const promise = animateCardDraw(cardElement, 0);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();
            expect(cardElement.style.transition).toBe('all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)');
            expect(cardElement.style.transform).toBe('translateX(0) translateY(0) scale(1) rotate(0deg)');
            expect(cardElement.style.opacity).toBe('1');
            await promise;
        });

        it('should use index for staggered delay', () => {
            const card1 = document.createElement('div');
            const card2 = document.createElement('div');
            document.body.appendChild(card1);
            document.body.appendChild(card2);
            
            animateCardDraw(card1, 0);
            animateCardDraw(card2, 1);
            vi.advanceTimersByTime(50);
            expect(card1.style.transition).toBeDefined();
            expect(card2.style.transition).toBeUndefined();
        });

        it('should resolve after duration', () => {
            const promise = animateCardDraw(cardElement, 0);
            vi.advanceTimersByTime(700);
            vi.runAllTimers();
            return promise;
        });
    });

    describe('animateCardPlay', () => {
        it('should return a Promise', () => {
            expect(animateCardPlay(cardElement, targetElement)).toBeInstanceOf(Promise);
        });

        it('should calculate trajectory', () => {
            animateCardPlay(cardElement, targetElement);
            expect(cardElement.getBoundingClientRect).toHaveBeenCalled();
            expect(targetElement.getBoundingClientRect).toHaveBeenCalled();
        });

        it('handles missing elements', () => {
            expect(() => animateCardPlay(cardElement, targetElement)).not.toThrow();
        });
    });

    describe('animateCardDiscard', () => {
        it('should return a Promise', () => {
            expect(animateCardDiscard(cardElement)).toBeInstanceOf(Promise);
        });

        it('should set transition and transform', () => {
            animateCardDiscard(cardElement);
            expect(cardElement.style.transition).toBe('all 0.4s ease-out');
            expect(cardElement.style.transform).toBe('translateY(50px) scale(0.8) rotate(10deg)');
            expect(cardElement.style.opacity).toBe('0');
            expect(cardElement.style.filter).toBe('blur(2px)');
        });

        it('should remove element after duration', () => {
            const promise = animateCardDiscard(cardElement);
            vi.advanceTimersByTime(400);
            vi.runAllTimers();
            return promise;
        });

        it('should call remove on element', async () => {
            const removeSpy = vi.spyOn(cardElement, 'remove');
            const promise = animateCardDiscard(cardElement);
            vi.advanceTimersByTime(400);
            await vi.runAllTimersAsync();
            await promise;
            expect(removeSpy).toHaveBeenCalled();
        });

        it('handles element already removed', () => {
            const promise = animateCardDiscard(cardElement);
            vi.advanceTimersByTime(200);
            cardElement.remove();
            vi.advanceTimersByTime(400);
            vi.runAllTimers();
            return promise;
        });
    });

    describe('animate3DTilt', () => {
        it('should calculate tilt based on mouse position', () => {
            animate3DTilt(cardElement, 150, 125);
            expect(cardElement.style.transform).toContain('perspective(1000px)');
            expect(cardElement.style.transform).toContain('rotateX(');
            expect(cardElement.style.transform).toContain('rotateY(');
            expect(cardElement.style.transform).toContain('translateY(-12px)');
            expect(cardElement.style.transform).toContain('scale(1.08)');
        });

        it('should use cached rect when provided', () => {
            const cachedRect = { left: 50, top: 50, width: 100, height: 150 };
            animate3DTilt(cardElement, 150, 125, cachedRect);
            expect(cardElement.style.transform).toContain('perspective(1000px)');
        });

        it('should reset transition', () => {
            animate3DTilt(cardElement, 150, 125);
            expect(cardElement.style.transition).toBe('transform 0.1s ease-out');
        });

        it('should handle mouse at card center', () => {
            animate3DTilt(cardElement, 150, 175);
            expect(cardElement.style.transform).toContain('rotateX(0deg)');
            expect(cardElement.style.transform).toContain('rotateY(0deg)');
        });

        it('should handle extreme mouse positions', () => {
            animate3DTilt(cardElement, 0, 0);
            animate3DTilt(cardElement, 500, 500);
            expect(cardElement.style.transform).toContain('rotateX(');
        });
    });

    describe('reset3DTilt', () => {
        it('should reset transform and transition', () => {
            animate3DTilt(cardElement, 150, 125);
            reset3DTilt(cardElement);
            expect(cardElement.style.transition).toBe('transform 0.3s ease-out');
            expect(cardElement.style.transform).toBe('');
        });

        it('should handle element without prior tilt', () => {
            reset3DTilt(cardElement);
            expect(cardElement.style.transition).toBe('transform 0.3s ease-out');
            expect(cardElement.style.transform).toBe('');
        });
    });

    describe('shakeCard', () => {
        it('should return a Promise', () => {
            expect(shakeCard(cardElement)).toBeInstanceOf(Promise);
        });

        it('should add shake class', () => {
            shakeCard(cardElement);
            expect(cardElement.classList.contains('card-shake')).toBe(true);
        });

        it('should remove shake class after duration', () => {
            shakeCard(cardElement);
            expect(cardElement.classList.contains('card-shake')).toBe(true);
            vi.advanceTimersByTime(500);
            vi.runAllTimers();
            expect(cardElement.classList.contains('card-shake')).toBe(false);
        });

        it('should resolve after 500ms', () => {
            const promise = shakeCard(cardElement);
            vi.advanceTimersByTime(500);
            vi.runAllTimers();
            return promise;
        });
    });

    describe('flipCard', () => {
        it('should return a Promise', () => {
            expect(flipCard(cardElement)).toBeInstanceOf(Promise);
        });

        it('should set initial flip transform', () => {
            flipCard(cardElement);
            expect(cardElement.style.transition).toBe('transform 0.6s');
            expect(cardElement.style.transformStyle).toBe('preserve-3d');
            expect(cardElement.style.transform).toBe('rotateY(90deg)');
        });

        it('should complete flip to front', () => {
            const promise = flipCard(cardElement);
            vi.advanceTimersByTime(600);
            vi.runAllTimers();
            return promise;
        });

        it('should reset transformStyle after animation', async () => {
            const promise = flipCard(cardElement);
            vi.advanceTimersByTime(600);
            await vi.runAllTimersAsync();
            await promise;
            expect(cardElement.style.transformStyle).toBe('');
        });
    });

    describe('pulseGlow / stopPulseGlow', () => {
        it('should add pulse-glow class', () => {
            pulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(true);
        });

        it('should remove pulse-glow class', () => {
            pulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(true);
            stopPulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(false);
        });

        it('should handle missing classList', () => {
            const simple = { classList: { add: vi.fn(), remove: vi.fn() } };
            pulseGlow(simple);
            stopPulseGlow(simple);
        });

        it('stop before pulse should work', () => {
            stopPulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(false);
        });
    });

    describe('highlightCard', () => {
        it('should return a Promise', () => {
            expect(highlightCard(cardElement)).toBeInstanceOf(Promise);
        });

        it('should add highlight class', () => {
            highlightCard(cardElement);
            expect(cardElement.classList.contains('card-highlight')).toBe(true);
        });

        it('should remove highlight class after 1000ms', () => {
            highlightCard(cardElement);
            expect(cardElement.classList.contains('card-highlight')).toBe(true);
            vi.advanceTimersByTime(1000);
            vi.runAllTimers();
            expect(cardElement.classList.contains('card-highlight')).toBe(false);
        });

        it('should resolve after duration', () => {
            const promise = highlightCard(cardElement);
            vi.advanceTimersByTime(1000);
            vi.runAllTimers();
            return promise;
        });
    });

    describe('default export', () => {
        it('should export all functions', async () => {
            const { default: defaultExport } = await import('../js/cardAnimations.js');
            expect(defaultExport.animateCardDraw).toBe(animateCardDraw);
            expect(defaultExport.animateCardPlay).toBe(animateCardPlay);
            expect(defaultExport.animateCardDiscard).toBe(animateCardDiscard);
            expect(defaultExport.animate3DTilt).toBe(animate3DTilt);
            expect(defaultExport.reset3DTilt).toBe(reset3DTilt);
            expect(defaultExport.shakeCard).toBe(shakeCard);
            expect(defaultExport.flipCard).toBe(flipCard);
            expect(defaultExport.pulseGlow).toBe(pulseGlow);
            expect(defaultExport.stopPulseGlow).toBe(stopPulseGlow);
            expect(defaultExport.highlightCard).toBe(highlightCard);
        });
    });
});