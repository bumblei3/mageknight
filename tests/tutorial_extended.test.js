import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TutorialManager } from '../js/tutorialManager.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';

describe('TutorialManager Extended', () => {
    let tutorialManager;
    let mockGame;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = '';
        mockGame = {
            ui: { showToast: vi.fn() }
        };
        tutorialManager = new TutorialManager(mockGame);
    });

    afterEach(() => {
        if (tutorialManager) {
            const overlay = document.getElementById('tutorial-overlay-custom');
            if (overlay) overlay.remove();
        }
        if (store) store.clearListeners();
        vi.clearAllMocks();
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('should start tutorial and show first step', () => {
        tutorialManager.start();
        expect(tutorialManager.isActive).toBe(true);
        expect(tutorialManager.currentStep).toBe(0);
        expect(document.getElementById('tutorial-overlay-custom').style.display).toBe('flex');
    });

    it('should not restart if already active', () => {
        tutorialManager.isActive = true;
        tutorialManager.currentStep = 2;
        tutorialManager.start();
        expect(tutorialManager.currentStep).toBe(2);
    });

    it('should create UI from scratch', () => {
        document.body.innerHTML = '';
        tutorialManager.createTutorialUI();

        // Verify creation
        const overlay = document.querySelector('.tutorial-overlay-custom');
        expect(overlay).not.toBe(null);
    });

    it('should highlight element and clear highlight', () => {
        const element = document.createElement('div');
        element.id = 'test-highlight';
        document.body.appendChild(element);

        tutorialManager.createTutorialUI();
        tutorialManager.highlightElement('#test-highlight');

        expect(element.style.zIndex).toBe('10000');
        expect(element.dataset.tutorialHighlight).toBe('true');
        expect(tutorialManager.spotlight.style.display).toBe('block');

        tutorialManager.clearHighlight();
        expect(element.style.zIndex).toBe('');
        // Directly check dataset property
        expect(element.dataset.tutorialHighlight).toBeUndefined();
        expect(tutorialManager.spotlight.style.display).toBe('none');

        element.remove();
    });

    it('should handle highlight for non-existent element', () => {
        tutorialManager.start();

        // Temporarily override querySelector to return null for non-existent element
        const originalQS = document.querySelector;
        document.querySelector = (sel) => sel === '#non-existent' ? null : originalQS.call(document, sel);

        tutorialManager.highlightElement('#non-existent');

        expect(tutorialManager.spotlight.style.display).toBe('none');
        document.querySelector = originalQS;
    });

    it('should position tutorial box correctly', () => {
        tutorialManager.createTutorialUI();

        tutorialManager.positionTutorialBox('top');
        expect(tutorialManager.tutorialBox.style.top).toBe('20px');

        tutorialManager.positionTutorialBox('bottom');
        expect(tutorialManager.tutorialBox.style.bottom).toBe('20px');

        tutorialManager.positionTutorialBox('center');
        expect(tutorialManager.tutorialBox.style.top).toBe('50%');
    });

    it('should navigate next, prev, and skip', () => {
        tutorialManager.start();

        // Get the buttons created by tutorialManager.start()
        const nextBtn = document.getElementById('tutorial-next-btn');
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');

        expect(tutorialManager.currentStep).toBe(0);

        nextBtn.click();
        expect(tutorialManager.currentStep).toBe(1);

        prevBtn.click();
        expect(tutorialManager.currentStep).toBe(0);

        skipBtn.click();
        expect(tutorialManager.isActive).toBe(false);
    });

    it('should track completion in localStorage', () => {
        TutorialManager.reset();
        expect(TutorialManager.hasCompleted()).toBe(false);

        tutorialManager.start();
        tutorialManager.complete();
        expect(TutorialManager.hasCompleted()).toBe(true);
    });

    it('should handle last step "Los geht\'s!" text', () => {
        tutorialManager.start();
        tutorialManager.showStep(tutorialManager.steps.length - 1);
        expect(document.getElementById('tutorial-next-btn').textContent).toBe("Los geht's!");
    });
});
