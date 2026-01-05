import { describe, it, expect, beforeEach } from '../testRunner.js';
import { TutorialManager } from '../../js/tutorialManager.js';
import { createSpy, createMockElement } from '../test-mocks.js';

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
    global.localStorage = {
        store: {},
        getItem: (k) => global.localStorage.store[k] || null,
        setItem: (k, v) => global.localStorage.store[k] = v,
        clear: () => global.localStorage.store = {}
    };
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

    it('should handle highlighting and clearing accurately', () => {
        tutorial.createTutorialUI();
        // Mock querySelector to return null for non-existent
        const originalQS = global.document.querySelector;
        global.document.querySelector = (sel) => sel === '.non-existent' ? null : mockElement;

        tutorial.highlightElement('.non-existent');
        expect(tutorial.spotlight.style.display).toBe('none');

        global.document.querySelector = originalQS;

        const el = { style: {}, dataset: { tutorialHighlight: 'true' } };
        global.document.querySelectorAll = () => [el];
        tutorial.clearHighlight();
        expect(el.style.zIndex).toBe('');
    });

    it('should position box correctly', () => {
        tutorial.createTutorialUI();
        tutorial.positionTutorialBox('bottom');
        expect(tutorial.tutorialBox.style.bottom).toBe('20px');
    });
});
