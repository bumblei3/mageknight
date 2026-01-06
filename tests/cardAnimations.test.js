import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cardAnimations from '../js/cardAnimations.js';
import { createSpy, MockHTMLElement } from './test-mocks.js';

describe('Card Animations', () => {
    let cardElement;
    let targetElement;

    beforeEach(() => {
        // Create mock card element
        cardElement = document.createElement('div');
        cardElement.className = 'card';
        document.body.appendChild(cardElement);

        // Create mock target element
        targetElement = document.createElement('div');
        targetElement.id = 'play-area';
        document.body.appendChild(targetElement);

        // Mock requestAnimationFrame
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
        global.cancelAnimationFrame = (id) => clearTimeout(id);
    });

    // afterEach cleanup is handled globally by resetMocks

    describe('animateCardDraw', () => {
        it('should set initial transform and opacity', async () => {
            const promise = cardAnimations.animateCardDraw(cardElement, 0);
            expect(cardElement.style.opacity).toBe('0');
            expect(cardElement.style.transform).toContain('translateX(-200px)');
            await promise;
        });

        it('should animate to final state', async () => {
            await cardAnimations.animateCardDraw(cardElement, 0);
            expect(cardElement.style.opacity).toBe('1');
            expect(cardElement.style.transform).toContain('scale(1)');
        });

        it('should stagger animation based on index', async () => {
            const start = Date.now();
            await cardAnimations.animateCardDraw(cardElement, 2);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThan(600);
        });
    });

    describe('animateCardDiscard', () => {
        it('should apply discard transform', async () => {
            const promise = cardAnimations.animateCardDiscard(cardElement);
            expect(cardElement.style.transform).toContain('translateY(50px)');
            expect(cardElement.style.opacity).toBe('0');
            await promise;
        });

        it('should remove element after animation', async () => {
            await cardAnimations.animateCardDiscard(cardElement);
            expect(cardElement.parentNode).toBeNull();
        });
    });

    describe('animate3DTilt', () => {
        it('should apply perspective transform', () => {
            cardAnimations.animate3DTilt(cardElement, 100, 100);
            expect(cardElement.style.transform).toContain('perspective');
            expect(cardElement.style.transform).toContain('rotateX');
        });
    });

    describe('reset3DTilt', () => {
        it('should reset transform', () => {
            cardElement.style.transform = 'rotateX(10deg)';
            cardAnimations.reset3DTilt(cardElement);
            expect(cardElement.style.transform).toBe('');
        });
    });

    describe('shakeCard', () => {
        it('should add and remove shake class', async () => {
            const promise = cardAnimations.shakeCard(cardElement);
            expect(cardElement.classList.contains('card-shake')).toBe(true);
            await promise;
            expect(cardElement.classList.contains('card-shake')).toBe(false);
        });
    });

    describe('flipCard', () => {
        it('should apply flip transform', async () => {
            const promise = cardAnimations.flipCard(cardElement);
            await new Promise(r => setTimeout(r, 50));
            expect(cardElement.style.transform).toContain('rotateY');
            await promise;
        });

        it('should complete flip animation', async () => {
            await cardAnimations.flipCard(cardElement);
            expect(cardElement.style.transform).toBe('rotateY(0deg)');
        });
    });

    describe('pulseGlow and stopPulseGlow', () => {
        it('should add glow class', () => {
            cardAnimations.pulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(true);
        });

        it('should remove glow class', () => {
            cardElement.classList.add('card-pulse-glow');
            cardAnimations.stopPulseGlow(cardElement);
            expect(cardElement.classList.contains('card-pulse-glow')).toBe(false);
        });
    });

    describe('highlightCard', () => {
        it('should add and remove highlight class', async () => {
            const promise = cardAnimations.highlightCard(cardElement);
            expect(cardElement.classList.contains('card-highlight')).toBe(true);
            await promise;
            expect(cardElement.classList.contains('card-highlight')).toBe(false);
        });
    });

    describe('animateCardPlay', () => {
        it('should hide original card during animation', async () => {
            const promise = cardAnimations.animateCardPlay(cardElement, targetElement);
            await new Promise(r => setTimeout(r, 50));
            expect(cardElement.style.opacity).toBe('0');

            // Fast-forward to end
            await promise;
        });

        it('should clean up clone after animation', async () => {
            const initialChildCount = document.body.children.length;

            await cardAnimations.animateCardPlay(cardElement, targetElement);

            // After animation, clone should be removed (children count back to original)
            // Note: The animation creates and removes a clone
            expect(document.body.children.length).toBe(initialChildCount);
        });
    });
});
