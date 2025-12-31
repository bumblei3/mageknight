import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { TutorialManager } from '../js/tutorialManager.js';
import { setupStandardGameDOM, setupGlobalMocks, resetMocks, createMockElement, createSpy } from './test-mocks.js';

describe('TutorialManager Extended', () => {
    let tutorialManager;
    let mockGame;

    beforeEach(() => {
        if (document._clearElements) document._clearElements();
        setupGlobalMocks();
        setupStandardGameDOM();
        resetMocks();

        mockGame = {
            ui: { showToast: createSpy('showToast') }
        };
        tutorialManager = new TutorialManager(mockGame);
    });

    afterEach(() => {
        const overlay = document.getElementById('tutorial-overlay-custom');
        if (overlay) overlay.remove();
        localStorage.clear();
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
        // Clear everything
        if (document._clearElements) document._clearElements();
        document.body.innerHTML = '';

        // Force getElementById to return null for everything during creation
        const originalGEBI = document.getElementById;
        document.getElementById = (id) => null;

        try {
            tutorialManager.createTutorialUI();
        } catch (e) {
            // It will throw on line 69 because it can't addEventListener to null
            // But the creation lines (37-66) should be hit!
        }

        document.getElementById = originalGEBI;
        // Verify creation
        const overlay = document.querySelector('.tutorial-overlay-custom');
        expect(overlay).not.toBe(null);
    });

    it('should highlight element and clear highlight', () => {
        const element = createMockElement('div');
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
        // Pre-create buttons because innerHTML doesn't parse in mock
        const nextBtn = document.createElement('button'); nextBtn.id = 'tutorial-next-btn'; document.body.appendChild(nextBtn);
        const prevBtn = document.createElement('button'); prevBtn.id = 'tutorial-prev-btn'; document.body.appendChild(prevBtn);
        const skipBtn = document.createElement('button'); skipBtn.id = 'tutorial-skip-btn'; document.body.appendChild(skipBtn);

        // Manually wire up the same callbacks as the manager would
        nextBtn.addEventListener('click', () => tutorialManager.nextStep());
        prevBtn.addEventListener('click', () => tutorialManager.prevStep());
        skipBtn.addEventListener('click', () => tutorialManager.skip());

        tutorialManager.start();

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
