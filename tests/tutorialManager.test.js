import { describe, it, expect, beforeEach } from './testRunner.js';
import { TutorialManager } from '../js/tutorialManager.js';

// Mock DOM
const mockElement = {
    style: {},
    dataset: {},
    addEventListener: () => { },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    appendChild: () => { },
    textContent: ''
};

const mockDocument = {
    getElementById: () => mockElement,
    createElement: () => mockElement,
    body: { appendChild: () => { } },
    querySelector: () => mockElement,
    querySelectorAll: () => []
};

if (typeof document === 'undefined') {
    global.document = mockDocument;
}

describe('TutorialManager', () => {
    let tutorial;
    let game = {};

    beforeEach(() => {
        tutorial = new TutorialManager(game);
        // Reset localStorage mock if needed (handled by global mock usually)
        if (typeof localStorage !== 'undefined') localStorage.clear();
    });

    it('should initialize correctly', () => {
        expect(tutorial.currentStep).toBe(0);
        expect(tutorial.isActive).toBe(false);
        expect(tutorial.steps.length).toBeGreaterThan(0);
    });

    it('should start tutorial', () => {
        tutorial.start();

        expect(tutorial.isActive).toBe(true);
        expect(tutorial.currentStep).toBe(0);
    });

    it('should advance steps', () => {
        tutorial.start();
        tutorial.nextStep();

        expect(tutorial.currentStep).toBe(1);
    });

    it('should go back steps', () => {
        tutorial.start();
        tutorial.nextStep();
        tutorial.prevStep();

        expect(tutorial.currentStep).toBe(0);
    });

    it('should complete tutorial', () => {
        tutorial.start();
        tutorial.complete();

        expect(tutorial.isActive).toBe(false);
        expect(TutorialManager.hasCompleted()).toBe(true);
    });

    it('should skip tutorial', () => {
        tutorial.start();
        tutorial.skip();

        expect(tutorial.isActive).toBe(false);
        expect(TutorialManager.hasCompleted()).toBe(true);
    });

    it('should handle step bounds', () => {
        tutorial.start();
        tutorial.prevStep(); // Should stay at 0 or handle gracefully (implementation allows < 0 check in showStep)

        // If prevStep calls showStep(-1), showStep calls complete()
        // Let's verify behavior based on implementation:
        // showStep checks index < 0 -> complete()

        expect(tutorial.isActive).toBe(false);
    });
});
