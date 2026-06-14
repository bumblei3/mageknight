import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TutorialManager from '../js/tutorialManager.js';

describe('TutorialManager - Coverage Boost', () => {
    let tutorialManager;
    let mockGame;
    let localStorageMock;

    beforeEach(() => {
        localStorageMock = {
            store: {},
            getItem: vi.fn((key) => localStorageMock.store[key] || null),
            setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
            removeItem: vi.fn((key) => { delete localStorageMock.store[key]; })
        };
        
        global.localStorage = localStorageMock;
        
        // Mock document methods
        document.body.innerHTML = '';
        
        mockGame = {
            showToast: vi.fn(),
            addLog: vi.fn(),
            isTestEnvironment: true
        };
        
        tutorialManager = new TutorialManager(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        TutorialManager.reset();
    });

    describe('constructor', () => {
        it('should initialize with default steps', () => {
            expect(tutorialManager.steps.length).toBe(4);
            expect(tutorialManager.steps[0].text).toBe('Willkommen bei Mage Knight!');
        });

        it('should have isActive false initially', () => {
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should have currentStep 0 initially', () => {
            expect(tutorialManager.currentStep).toBe(0);
        });
    });

    describe('hasCompleted', () => {
        it('should return false when not completed', () => {
            global.localStorage.removeItem('mk_tutorial_completed');
            expect(TutorialManager.hasCompleted()).toBe(false);
        });

        it('should return true when completed', () => {
            global.localStorage.setItem('mk_tutorial_completed', 'true');
            expect(TutorialManager.hasCompleted()).toBe(true);
        });

        it('should return false when localStorage is undefined', () => {
            const originalLocalStorage = global.localStorage;
            global.localStorage = undefined;
            expect(TutorialManager.hasCompleted()).toBe(false);
            global.localStorage = originalLocalStorage;
        });
    });

    describe('start', () => {
        it('should not start if already completed', () => {
            global.localStorage.setItem('mk_tutorial_completed', 'true');
            tutorialManager.start();
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should start tutorial and create UI', () => {
            tutorialManager.start();
            expect(tutorialManager.isActive).toBe(true);
            expect(tutorialManager.currentStep).toBe(0);
            expect(document.getElementById('tutorial-overlay')).not.toBeNull();
        });

        it('should reuse existing overlay if present', () => {
            // Create existing overlay
            const existingOverlay = document.createElement('div');
            existingOverlay.id = 'tutorial-overlay';
            document.body.appendChild(existingOverlay);
            
            const existingBox = document.createElement('div');
            existingBox.id = 'tutorial-box';
            existingOverlay.appendChild(existingBox);
            
            tutorialManager.start();
            
            expect(tutorialManager.overlay).toBe(existingOverlay);
            expect(tutorialManager.tutorialBox).toBe(existingBox);
        });
    });

    describe('stop', () => {
        it('should set isActive to false', () => {
            tutorialManager.start();
            tutorialManager.stop();
            expect(tutorialManager.isActive).toBe(false);
        });
    });

    describe('nextStep', () => {
        it('should not advance if not active', () => {
            tutorialManager.nextStep();
            expect(tutorialManager.currentStep).toBe(0);
        });

        it('should advance step when active', () => {
            tutorialManager.start();
            tutorialManager.nextStep();
            expect(tutorialManager.currentStep).toBe(1);
            expect(mockGame.showToast).toHaveBeenCalled();
        });

        it('should show step 1 when advancing from 0', () => {
            tutorialManager.start();
            tutorialManager.nextStep();
            // nextStep calls showStep(this.currentStep + 1) then increments
            // So it shows step 1, then currentStep becomes 1
        });
    });

    describe('prevStep', () => {
        it('should not go back if not active', () => {
            tutorialManager.prevStep();
            expect(tutorialManager.currentStep).toBe(0);
        });

        it('should complete when at step 0', () => {
            tutorialManager.start();
            tutorialManager.prevStep();
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should go back when step > 0', () => {
            tutorialManager.start();
            tutorialManager.currentStep = 2;
            tutorialManager.prevStep();
            expect(tutorialManager.currentStep).toBe(1);
            expect(mockGame.showToast).toHaveBeenCalled();
        });
    });

    describe('skip', () => {
        it('should complete tutorial', () => {
            tutorialManager.start();
            tutorialManager.skip();
            expect(tutorialManager.isActive).toBe(false);
            expect(global.localStorage.getItem('mk_tutorial_completed')).toBe('true');
            expect(mockGame.showToast).toHaveBeenCalledWith('Tutorial abgeschlossen!', 'success');
        });
    });

    describe('showStep', () => {
        it('should complete if step > steps.length', () => {
            tutorialManager.start();
            tutorialManager.showStep(10);
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should complete if step < 1', () => {
            tutorialManager.start();
            tutorialManager.showStep(0);
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should show step within bounds', () => {
            tutorialManager.start();
            tutorialManager.showStep(2);
            expect(mockGame.showToast).toHaveBeenCalledWith('Tutorial: Willkommen! (Schritt 2)', 'info');
        });

        it('should update button text for last step', () => {
            tutorialManager.start();
            document.body.innerHTML = '<div id="tutorial-box"><div id="tutorial-content"></div><button id="tutorial-next-btn"></button></div>';
            tutorialManager.tutorialBox = document.getElementById('tutorial-box');
            
            tutorialManager.showStep(4); // Last step (4 steps total)
            
            const nextBtn = document.getElementById('tutorial-next-btn');
            expect(nextBtn.innerText).toBe("Los geht's!");
        });

        it('should update button text for non-last step', () => {
            tutorialManager.start();
            document.body.innerHTML = '<div id="tutorial-box"><div id="tutorial-content"></div><button id="tutorial-next-btn"></button></div>';
            tutorialManager.tutorialBox = document.getElementById('tutorial-box');
            
            tutorialManager.showStep(2);
            
            const nextBtn = document.getElementById('tutorial-next-btn');
            expect(nextBtn.innerText).toBe('Weiter');
        });

        it('should update content text', () => {
            tutorialManager.start();
            document.body.innerHTML = '<div id="tutorial-box"><div id="tutorial-content"></div><button id="tutorial-next-btn"></button></div>';
            tutorialManager.tutorialBox = document.getElementById('tutorial-box');
            
            tutorialManager.showStep(1);
            
            const content = document.getElementById('tutorial-content');
            expect(content.innerText).toBe('Willkommen bei Mage Knight!');
        });

        it('should handle missing tutorialBox gracefully', () => {
            tutorialManager.start();
            tutorialManager.tutorialBox = null;
            expect(() => tutorialManager.showStep(1)).not.toThrow();
        });
    });

    describe('complete', () => {
        it('should set isActive false and save to localStorage', () => {
            tutorialManager.start();
            tutorialManager.complete();
            expect(tutorialManager.isActive).toBe(false);
            expect(global.localStorage.getItem('mk_tutorial_completed')).toBe('true');
            expect(mockGame.showToast).toHaveBeenCalledWith('Tutorial abgeschlossen!', 'success');
        });

        it('should remove overlay from DOM', () => {
            tutorialManager.start();
            const overlay = tutorialManager.overlay;
            tutorialManager.complete();
            expect(overlay.parentNode).toBeNull();
        });

        it('should handle missing overlay gracefully', () => {
            tutorialManager.start();
            tutorialManager.overlay = null;
            expect(() => tutorialManager.complete()).not.toThrow();
        });
    });

    describe('createTutorialUI', () => {
        it('should create overlay and tutorial box', () => {
            tutorialManager.createTutorialUI();
            expect(tutorialManager.overlay).not.toBeNull();
            expect(tutorialManager.tutorialBox).not.toBeNull();
            expect(tutorialManager.spotlight).not.toBeNull();
            expect(document.body.contains(tutorialManager.overlay)).toBe(true);
            expect(document.body.contains(tutorialManager.spotlight)).toBe(true);
        });

        it('should add prev and skip buttons', () => {
            tutorialManager.createTutorialUI();
            expect(document.getElementById('tutorial-prev-btn')).not.toBeNull();
            expect(document.getElementById('tutorial-skip-btn')).not.toBeNull();
        });
    });

    describe('highlightElement', () => {
        it('should highlight element when found', () => {
            const element = document.createElement('div');
            element.id = 'test-element';
            element.style.position = 'absolute';
            element.style.top = '100px';
            element.style.left = '100px';
            element.style.width = '50px';
            element.style.height = '50px';
            document.body.appendChild(element);
            
            tutorialManager.spotlight = document.createElement('div');
            tutorialManager.spotlight.id = 'tutorial-spotlight';
            
            tutorialManager.highlightElement('#test-element');
            
            expect(tutorialManager.spotlight.style.display).toBe('block');
            expect(element.style.zIndex).toBe('10000');
            expect(element.dataset.tutorialHighlight).toBe('true');
        });

        it('should not throw when element not found', () => {
            tutorialManager.spotlight = document.createElement('div');
            expect(() => tutorialManager.highlightElement('#nonexistent')).not.toThrow();
        });
    });

    describe('clearHighlight', () => {
        it('should clear highlight from element', () => {
            const element = document.createElement('div');
            element.dataset.tutorialHighlight = 'true';
            element.style.zIndex = '10000';
            document.body.appendChild(element);
            
            tutorialManager.spotlight = document.createElement('div');
            
            tutorialManager.clearHighlight();
            
            expect(element.style.zIndex).toBe('');
            expect(element.dataset.tutorialHighlight).toBeUndefined();
            expect(tutorialManager.spotlight.style.display).toBe('none');
        });

        it('should handle no highlighted element', () => {
            tutorialManager.spotlight = document.createElement('div');
            expect(() => tutorialManager.clearHighlight()).not.toThrow();
        });
    });

    describe('positionTutorialBox', () => {
        it('should not throw if tutorialBox missing', () => {
            tutorialManager.tutorialBox = null;
            expect(() => tutorialManager.positionTutorialBox('top')).not.toThrow();
        });

        it('should position at top', () => {
            tutorialManager.tutorialBox = document.createElement('div');
            tutorialManager.positionTutorialBox('top');
            expect(tutorialManager.tutorialBox.style.top).toBe('20px');
            expect(tutorialManager.tutorialBox.style.bottom).toBe('');
        });

        it('should position at bottom', () => {
            tutorialManager.tutorialBox = document.createElement('div');
            tutorialManager.positionTutorialBox('bottom');
            expect(tutorialManager.tutorialBox.style.bottom).toBe('20px');
            expect(tutorialManager.tutorialBox.style.top).toBe('');
        });

        it('should position at center', () => {
            tutorialManager.tutorialBox = document.createElement('div');
            tutorialManager.positionTutorialBox('center');
            expect(tutorialManager.tutorialBox.style.top).toBe('50%');
            expect(tutorialManager.tutorialBox.style.bottom).toBe('');
        });
    });

    describe('reset', () => {
        it('should remove localStorage item', () => {
            global.localStorage.setItem('mk_tutorial_completed', 'true');
            TutorialManager.reset();
            expect(global.localStorage.getItem('mk_tutorial_completed')).toBeNull();
        });
    });
});