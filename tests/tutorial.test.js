import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SimpleTutorial } from '../js/simpleTutorial.js';
import { createMockLocalStorage } from './test-mocks.js';

describe('SimpleTutorial', () => {
    let tutorial;
    let mockGame;
    let originalStorage;
    let mockOverlay;
    let mockElements;

    beforeEach(() => {
        // Mock localStorage
        originalStorage = global.localStorage;
        global.localStorage = createMockLocalStorage();

        // Mock Game
        mockGame = {
            hero: { movementPoints: 2, hand: [{ color: 'green' }] },
            ui: {
                addLog: () => { },
                showNotification: () => { }
            },
            handleCardClick: (idx, card) => { },
            moveHero: (q, r) => { }
        };

        // Mock DOM elements container
        mockElements = {
            title: { textContent: '' },
            message: { textContent: '' },
            progress: { textContent: '' },
            nextBtn: {
                textContent: '',
                style: {},
                classList: {
                    add: () => { },
                    remove: () => { }
                },
                disabled: false,
                addEventListener: () => { }
            },
            skipBtn: { addEventListener: () => { } }
        };

        // Custom Overlay Mock
        mockOverlay = {
            querySelector: (selector) => {
                if (selector.includes('title')) return mockElements.title;
                if (selector.includes('message')) return mockElements.message;
                if (selector.includes('progress')) return mockElements.progress;
                if (selector.includes('next')) return mockElements.nextBtn;
                if (selector.includes('skip')) return mockElements.skipBtn;
                return { addEventListener: () => { } };
            },
            classList: { add: () => { }, remove: () => { } },
            remove: () => { }
        };

        // Mock methods that might be missing in testRunner environment
        HTMLElement.prototype.scrollIntoView = () => { };

        tutorial = new SimpleTutorial(mockGame);

        // Override createOverlay to use our mock
        tutorial.createOverlay = function () {
            this.overlay = mockOverlay;
            // Manually bind events if needed or just skip
        };
    });

    afterEach(() => {
        global.localStorage = originalStorage;
    });

    describe('Initialization', () => {
        it('should verify start condition', () => {
            expect(tutorial.shouldStart()).toBe(true);

            localStorage.setItem('tutorial_completed', 'true');
            expect(tutorial.shouldStart()).toBe(false);
        });

        it('should create overlay on start', () => {
            tutorial.start();
            expect(tutorial.overlay).toBe(mockOverlay);
            expect(tutorial.active).toBe(true);
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            tutorial.start();
        });

        it('should show first step content', () => {
            expect(tutorial.currentStep).toBe(0);
            expect(mockElements.title.textContent).toContain('Willkommen');
        });

        it('should advance to next step', () => {
            tutorial.next();
            expect(tutorial.currentStep).toBe(1);
            expect(mockElements.progress.textContent).toContain('Schritt 2');
        });

        it('should complete tutorial after last step', () => {
            // Fast forward to end
            tutorial.currentStep = tutorial.steps.length - 1;
            tutorial.next(); // Should trigger complete()

            expect(tutorial.active).toBe(false);
            expect(localStorage.getItem('tutorial_completed')).toBe('true');
        });

        it('should skip tutorial', () => {
            tutorial.skip();
            expect(tutorial.active).toBe(false);
            expect(localStorage.getItem('tutorial_completed')).toBe('true');
        });
    });

    describe('Interactions', () => {
        beforeEach(() => {
            tutorial.start();
        });

        it('should handle keyboard navigation', () => {
            // Enter for next
            tutorial.handleKeyPress({ key: 'Enter' });
            expect(tutorial.currentStep).toBe(1);

            // Escape for skip
            tutorial.handleKeyPress({ key: 'Escape' });
            expect(tutorial.active).toBe(false);
        });

        it('should not advance on Enter if waiting for action', () => {
            // Move to step 2 (Wait for Card Play)
            tutorial.showStep(2);
            expect(tutorial.steps[2].waitForAction).toBe(true);

            const currentStep = tutorial.currentStep;
            tutorial.handleKeyPress({ key: 'Enter' });
            expect(tutorial.currentStep).toBe(currentStep);
        });
    });

    describe('Action Triggers', () => {
        beforeEach(() => {
            tutorial.start();
        });

        it('should detect card play', async () => {
            tutorial.showStep(2); // Card Play Step

            mockGame.handleCardClick(0, { color: 'green' });

            await new Promise(r => setTimeout(r, 600));

            expect(tutorial.currentStep).toBe(3);
        });

        it('should detect hero movement', async () => {
            tutorial.showStep(3); // Movement Step

            mockGame.moveHero(1, 1);

            await new Promise(r => setTimeout(r, 600));

            expect(tutorial.currentStep).toBe(4);
        });
    });

    describe('Restart', () => {
        it('should clear storage and restart', async () => {
            localStorage.setItem('tutorial_completed', 'true');
            // Mock setTimeout
            const originalSetTimeout = setTimeout;

            tutorial.restart();

            expect(localStorage.getItem('tutorial_completed')).toBeNull();

            await new Promise(r => originalSetTimeout(r, 150));
            expect(tutorial.active).toBe(true);
        });
    });
});
