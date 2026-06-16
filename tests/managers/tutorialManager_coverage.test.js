import { describe, it, expect, beforeEach } from 'vitest';
import TutorialManager from '../../js/tutorialManager.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM } from '../test-mocks.js';

setupGlobalMocks();

describe('TutorialManager Coverage Boost', () => {
    let tutorialManager;
    let mockGame;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();

        mockGame = {
            ui: { showToast: () => { } },
            hero: { position: { q: 0, r: 0 } },
            reachableHexes: [{ q: 1, r: 0 }],
            combat: null
        };
    });

    describe('createTutorialUI branches', () => {
        it('should create new UI elements when overlay does not exist', () => {
            const existingOverlay = document.getElementById('tutorial-overlay-custom');
            if (existingOverlay && existingOverlay.parentNode) {
                existingOverlay.parentNode.removeChild(existingOverlay);
            }

            tutorialManager = new TutorialManager(mockGame);
            tutorialManager.createTutorialUI();

            expect(tutorialManager.overlay).toBeDefined();
            expect(tutorialManager.tutorialBox).toBeDefined();
        });

        it('should reuse existing UI elements when overlay already exists', () => {
            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            
            const spotlight = document.createElement('div');
            spotlight.id = 'tutorial-spotlight';

            const box = document.createElement('div');
            box.id = 'tutorial-box';

            document.body.appendChild(overlay);
            document.body.appendChild(spotlight);
            document.body.appendChild(box);

            tutorialManager = new TutorialManager(mockGame);
            tutorialManager.createTutorialUI();

            expect(tutorialManager.overlay.id).toBe('tutorial-overlay');
        });
    });

    describe('showStep edge cases', () => {
        it('should complete tutorial when step index exceeds steps', () => {
            tutorialManager = new TutorialManager(mockGame);
            tutorialManager.start(); // Need to start first
            tutorialManager.steps = [{ title: 'Test', text: 'test' }];

            let completed = false;
            tutorialManager.complete = () => { completed = true; };

            tutorialManager.showStep(5); // Out of bounds (only 1 step)

            expect(completed).toBe(true);
        });

        it('should complete tutorial when step index is negative', () => {
            tutorialManager = new TutorialManager(mockGame);
            tutorialManager.start(); // Need to start first
            tutorialManager.steps = [{ title: 'Test', text: 'test' }];

            let completed = false;
            tutorialManager.complete = () => { completed = true; };

            tutorialManager.showStep(-1);

            expect(completed).toBe(true);
        });
    });
});