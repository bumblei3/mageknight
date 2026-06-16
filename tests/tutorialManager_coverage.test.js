import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TutorialManager from '../js/tutorialManager.js';

describe('TutorialManager - New System', () => {
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
        
        document.body.innerHTML = '';
        
        mockGame = {
            showToast: vi.fn(),
            addLog: vi.fn(),
            isTestEnvironment: true,
            reachableHexes: [{ q: 1, r: 0 }],
            combat: null
        };
        
        tutorialManager = new TutorialManager(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        TutorialManager.reset();
    });

    describe('constructor', () => {
        it('should initialize with 11 tutorial steps', () => {
            expect(tutorialManager.steps.length).toBe(11);
            expect(tutorialManager.steps[0].id).toBe('welcome');
            expect(tutorialManager.steps[10].id).toBe('complete');
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
        });
    });

    describe('skip', () => {
        it('should complete tutorial', () => {
            tutorialManager.start();
            tutorialManager.skip();
            expect(tutorialManager.isActive).toBe(false);
            expect(global.localStorage.getItem('mk_tutorial_completed')).toBe('true');
            expect(mockGame.showToast).toHaveBeenCalledWith('Tutorial completed!', 'success');
        });
    });

    describe('showStep', () => {
        it('should complete if step index exceeds steps', () => {
            tutorialManager.start();
            tutorialManager.showStep(15); // Out of bounds (11 steps)
            expect(tutorialManager.isActive).toBe(false);
        });

        it('should show step within bounds', () => {
            tutorialManager.start();
            tutorialManager.showStep(2);
            expect(tutorialManager.currentStep).toBe(2);
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
            expect(mockGame.showToast).toHaveBeenCalledWith('Tutorial completed!', 'success');
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
            expect(document.getElementById('tutorial-next-btn')).not.toBeNull();
            expect(document.getElementById('tutorial-title')).not.toBeNull();
            expect(document.getElementById('tutorial-content')).not.toBeNull();
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
            expect(tutorialManager.tutorialBox.style.transform).toBe('translate(-50%, -50%)');
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