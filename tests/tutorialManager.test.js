import { describe, it, expect, beforeEach } from './testRunner.js';
import { TutorialManager } from '../js/tutorialManager.js';
import { createSpy } from './test-mocks.js';

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
    let game = {
        addLog: createSpy('addLog')
    };

    beforeEach(() => {
        tutorial = new TutorialManager(game);
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
        tutorial.prevStep();
        expect(tutorial.isActive).toBe(false);
    });
});
