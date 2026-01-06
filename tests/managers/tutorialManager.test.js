import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TutorialManager } from '../../js/tutorialManager.js';
import { setLanguage } from '../../js/i18n/index.js';
import { store } from '../../js/game/Store.js';

describe('TutorialManager', () => {
    let tutorial;
    let game;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = '';
        game = {
            addLog: vi.fn(),
            ui: { showToast: vi.fn() }
        };
        tutorial = new TutorialManager(game);
        localStorage.clear();
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        localStorage.clear();
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
        const testEl = document.createElement('div');
        testEl.className = 'test-highlight';
        testEl.id = 'test-id';
        testEl.style.width = '100px';
        testEl.style.height = '100px';
        document.body.appendChild(testEl);

        tutorial.createTutorialUI();

        // 1. Element not found
        tutorial.highlightElement('.non-existent');
        expect(tutorial.spotlight.style.display).toBe('none');

        // 2. Element found
        tutorial.highlightElement('#test-id');
        expect(tutorial.spotlight.style.display).toBe('block');
        expect(testEl.dataset.tutorialHighlight).toBe('true');

        // 3. Clear highlight
        tutorial.clearHighlight();
        expect(testEl.style.zIndex).toBe('');
        expect(testEl.dataset.tutorialHighlight).toBeUndefined();
    });

    it('should position box correctly', () => {
        tutorial.createTutorialUI();
        tutorial.positionTutorialBox('bottom');
        expect(tutorial.tutorialBox.style.bottom).toBe('20px');
    });
});
