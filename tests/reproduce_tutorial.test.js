
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockDocument, createMockWindow } from './test-mocks.js';
import { SimpleTutorial } from '../js/simpleTutorial.js';

describe('Tutorial Skip Reproduction', () => {
    let game;
    let tutorial;

    beforeEach(() => {
        if (!global.document) {
            global.document = createMockDocument();
            global.window = createMockWindow();
            global.localStorage = {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { }
            };
        }

        // Mock execution context
        game = new MageKnightGame();
        // Mock UI for tutorial
        game.ui = {
            addLog: () => { },
            showNotification: () => { }
        };

        tutorial = new SimpleTutorial(game);
    });

    it('should allow skipping the tutorial via method call', async () => {
        tutorial.start();
        expect(tutorial.active).toBe(true);

        tutorial.skip();

        expect(tutorial.active).toBe(false);
        // Verify overlay is marked for removal (class or removed)
        // In this mock env, we just check state
    });

    it('should wire up the skip button correctly', async () => {
        tutorial.start();

        const overlay = document.querySelector('.tutorial-overlay');
        expect(overlay).toBeDefined();

        const skipBtn = overlay.querySelector('.btn-tutorial-skip');
        expect(skipBtn).toBeDefined();

        // Simulate click
        skipBtn.click(); // This relies on MockHTMLElement implementation of click() or we dispatch event

        it('should navigate to next step when Next is clicked', async () => {
            tutorial.start();

            // Step 0 -> Step 1
            const nextBtn = document.querySelector('.btn-tutorial-next');
            expect(nextBtn.style.display).not.toBe('none');

            // Mock the click handler call since we can't easily simulate real click event bubbling in this mock env
            // but we can check if the listener calls the method
            tutorial.next();

            expect(tutorial.currentStep).toBe(1);
            expect(document.querySelector('.tutorial-title').textContent).toContain('Handkarten');
        });

        it('should disable Next button when action is required', async () => {
            tutorial.start();
            tutorial.next(); // Step 1
            tutorial.next(); // Step 2 (Card Play - waitForAction: true)

            const nextBtn = document.querySelector('.btn-tutorial-next');
            expect(tutorial.steps[2].waitForAction).toBe(true);
            expect(nextBtn.disabled).toBe(true);
            // Style might be empty string or inline-block, but not 'none'
            expect(nextBtn.style.display).not.toBe('none');
        });
    });
});
