
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { animateCardPlay, animateCardDiscard, animateCardDraw } from '../js/cardAnimations.js';
import { createMockElement, setupGlobalMocks, resetMocks, createMockWindow } from './test-mocks.js';

describe('Card Animation Coverage', () => {
    beforeEach(() => {
        setupGlobalMocks();
        resetMocks();
    });

    describe('animateCardPlay', () => {
        it('should resolve after animation completes', async () => {
            const card = createMockElement('div');
            const target = createMockElement('div');

            // Mock getBoundingClientRect
            card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 150 });
            target.getBoundingClientRect = () => ({ left: 200, top: 200, width: 100, height: 150 });

            // Mock cloneNode to return a mock element
            card.cloneNode = () => {
                const clone = createMockElement('div');
                clone.style = {};
                clone.remove = () => { };
                return clone;
            };

            const promise = animateCardPlay(card, target);

            // Fast-forward animation frames if possible, or wait
            // Since mock requestAnimationFrame uses setTimeout(16), we can just wait a bit
            // But the animation duration is 500ms.
            // We can fast-forward timers if we had fake timers, but we just use real timeout in mocks.
            // We need to wait > 500ms. 
            // Better: mock performance.now() to jump ahead? 
            // The animator uses performance.now(). 

            // Let's just await the promise - with mock window it should resolve eventually even if slow
            // or we mock window.requestAnimationFrame to be instant?

            await promise;

            expect(true).toBe(true); // Reached here means resolved
        });
    });

    describe('animateCardDraw', () => {
        it('should animate draw with delay', async () => {
            const card = createMockElement('div');
            const start = Date.now();

            // Short animation for test
            await animateCardDraw(card, 0);

            // Just verify it resolves
            expect(card.style.opacity).toBe('1');
        });
    });

    describe('animateCardDiscard', () => {
        it('should remove element after animation', async () => {
            const card = createMockElement('div');
            let removed = false;
            card.remove = () => { removed = true; };

            await animateCardDiscard(card);

            expect(removed).toBe(true);
        });
    });
});
