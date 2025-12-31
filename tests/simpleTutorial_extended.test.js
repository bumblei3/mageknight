
import { describe, it, expect, beforeEach } from './testRunner.js';
import SimpleTutorial from '../js/simpleTutorial.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM, createSpy } from './test-mocks.js';

setupGlobalMocks();

describe('SimpleTutorial Extended Coverage', () => {
    let tutorial;
    let mockGame;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();

        mockGame = {
            hero: {
                position: { q: 0, r: 0 },
                hand: [{ name: 'TestCard', type: 'action' }],
                movementPoints: 5
            },
            ui: {
                showToast: createSpy(),
                addLog: createSpy(),
                renderHand: createSpy()
            },
            canvas: document.createElement('canvas')
        };

        tutorial = new SimpleTutorial(mockGame);
    });

    describe('initialization', () => {
        it('should initialize with correct defaults', () => {
            expect(tutorial.currentStep).toBe(0);
            expect(tutorial.active).toBe(false);
        });

        it('should have steps defined', () => {
            expect(tutorial.steps.length).toBeGreaterThan(0);
        });
    });

    describe('start', () => {
        it('should set active to true', () => {
            tutorial.start();
            expect(tutorial.active).toBe(true);
        });

        it('should create overlay', () => {
            tutorial.start();
            expect(tutorial.overlay).toBeDefined();
        });
    });

    describe('next', () => {
        it('should advance to next step', () => {
            tutorial.start();
            const initialStep = tutorial.currentStep;
            tutorial.next();
            expect(tutorial.currentStep).toBe(initialStep + 1);
        });
    });

    describe('skip', () => {
        it('should deactivate tutorial', () => {
            tutorial.start();
            tutorial.skip();
            expect(tutorial.active).toBe(false);
        });
    });
});
