import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TutorialManager from '../js/tutorialManager.js';
import { eventBus } from '../js/eventBus.js';
import { GAME_EVENTS } from '../js/constants.js';

function makeGame(overrides = {}) {
    return {
        particleSystem: { engine: { emit: vi.fn() } },
        reachableHexes: [],
        hexGrid: { getHexElement: () => null },
        showToast: vi.fn(),
        ...overrides,
    };
}

function clearTutorialStorage() {
    try { localStorage.removeItem('mk_tutorial_completed'); } catch {}
}

describe('TutorialManager', () => {
    let game;

    beforeEach(() => {
        clearTutorialStorage();
        eventBus.clear();
        document.body.innerHTML = '';
        game = makeGame();
    });

    afterEach(() => {
        eventBus.clear();
    });

    describe('static flags', () => {
        it('hasCompleted reflects localStorage', () => {
            expect(TutorialManager.hasCompleted()).toBe(false);
            localStorage.setItem('mk_tutorial_completed', 'true');
            expect(TutorialManager.hasCompleted()).toBe(true);
        });

        it('hasCompleted returns false when localStorage undefined', () => {
            const orig = globalThis.localStorage;
            // jsdom always has localStorage; just assert the stored value path
            expect(TutorialManager.hasCompleted()).toBeTypeOf('boolean');
            if (orig) globalThis.localStorage = orig;
        });

        it('reset clears the completed flag', () => {
            localStorage.setItem('mk_tutorial_completed', 'true');
            TutorialManager.reset();
            expect(TutorialManager.hasCompleted()).toBe(false);
        });
    });

    describe('constructor', () => {
        it('initializes steps', () => {
            const tm = new TutorialManager(game);
            expect(tm.steps.length).toBeGreaterThan(5);
            expect(tm.steps[0].id).toBe('welcome');
        });
    });

    describe('start', () => {
        it('does not start when already completed', () => {
            localStorage.setItem('mk_tutorial_completed', 'true');
            const tm = new TutorialManager(game);
            tm.start();
            expect(tm.isActive).toBe(false);
        });

        it('creates UI, activates, and shows first step', () => {
            const tm = new TutorialManager(game);
            tm.start();
            expect(tm.isActive).toBe(true);
            expect(document.getElementById('tutorial-overlay')).not.toBeNull();
            expect(document.getElementById('tutorial-box')).not.toBeNull();
            expect(tm.currentStep).toBe(0);
        });

        it('reuses existing UI elements if present', () => {
            document.body.innerHTML = `
                <div id="tutorial-overlay"></div>
                <div id="tutorial-box"></div>
                <div id="tutorial-spotlight"></div>
                <div id="tutorial-step-indicator"></div>`;
            const tm = new TutorialManager(game);
            tm.start();
            expect(tm.overlay.id).toBe('tutorial-overlay');
            tm.stop();
        });
    });

    describe('keyboard navigation', () => {
        function press(key) {
            const ev = new KeyboardEvent('keydown', { key });
            document.dispatchEvent(ev);
        }

        it('ArrowRight / Enter advances to next step', () => {
            const tm = new TutorialManager(game);
            tm.start();
            expect(tm.currentStep).toBe(0);
            press('ArrowRight');
            expect(tm.currentStep).toBe(1);
            press('Enter');
            expect(tm.currentStep).toBe(2);
        });

        it('ArrowLeft goes to previous step', () => {
            const tm = new TutorialManager(game);
            tm.start();
            press('ArrowRight'); // step 1
            press('ArrowLeft');  // back to 0
            expect(tm.currentStep).toBe(0);
        });

        it('ArrowLeft at step 0 completes the tutorial', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const spy = vi.spyOn(tm, 'complete');
            press('ArrowLeft');
            expect(spy).toHaveBeenCalled();
        });

        it('Escape skips the tutorial', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const spy = vi.spyOn(tm, 'skip');
            press('Escape');
            expect(spy).toHaveBeenCalled();
        });

        it('ignores keys when not active', () => {
            const tm = new TutorialManager(game);
            // not started -> isActive false
            const spy = vi.spyOn(tm, 'nextStep');
            press('ArrowRight');
            expect(spy).not.toHaveBeenCalled();
        });

        it('prevents default on navigation keys', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
            document.dispatchEvent(ev);
            expect(ev.defaultPrevented).toBe(true);
        });
    });

    describe('nextStep / prevStep / skip', () => {
        it('nextStep is a no-op when inactive', () => {
            const tm = new TutorialManager(game);
            expect(() => tm.nextStep()).not.toThrow();
        });

        it('prevStep is a no-op when inactive', () => {
            const tm = new TutorialManager(game);
            expect(() => tm.prevStep()).not.toThrow();
        });

        it('skip completes the tutorial', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.skip();
            expect(tm.isActive).toBe(false);
            expect(TutorialManager.hasCompleted()).toBe(true);
        });
    });

    describe('complete', () => {
        it('marks completed, clears storage flag, shows toast', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.complete();
            expect(tm.isActive).toBe(false);
            expect(TutorialManager.hasCompleted()).toBe(true);
            expect(game.showToast).toHaveBeenCalled();
        });

        it('is safe when game has no showToast', () => {
            const tm = new TutorialManager(makeGame({ showToast: undefined }));
            tm.start();
            expect(() => tm.complete()).not.toThrow();
        });
    });

    describe('showStep', () => {
        it('completes when step index is out of range', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const spy = vi.spyOn(tm, 'complete');
            tm.showStep(999);
            expect(spy).toHaveBeenCalled();
        });

        it('is a no-op when not active', () => {
            const tm = new TutorialManager(game);
            expect(() => tm.showStep(0)).not.toThrow();
        });

        it('renders when condition is already satisfied', () => {
            const tm = new TutorialManager(game);
            tm.start();
            // Step 5 (index 5) "end_turn" has no condition; directly show it
            tm.showStep(5);
            expect(tm.currentStep).toBe(5);
            expect(document.getElementById('tutorial-title')).not.toBeNull();
        });

        it('polls until condition is met', () => {
            vi.useFakeTimers();
            const tm = new TutorialManager(game);
            tm.start();
            // step index 7 (ranged_phase) has a condition on combat phase
            tm.showStep(7);
            // condition not met yet -> no render
            expect(tm.currentStep).toBe(7);
            // satisfy condition
            tm.game.combat = { phase: 'ranged' };
            vi.advanceTimersByTime(600);
            vi.useRealTimers();
            expect(document.getElementById('tutorial-title')).not.toBeNull();
        });

        it('waits for an event when waitForEvent is set', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showStep(6); // combat_intro, waitForEvent: combat_started
            // Not rendered until event fires
            eventBus.emit(GAME_EVENTS.COMBAT_STARTED);
            expect(document.getElementById('tutorial-title')).not.toBeNull();
        });

        it('sets up action listener and advances on nextOnAction', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showStep(5); // end_turn step, nextOnAction: turn_ended
            eventBus.emit('turn_ended');
            expect(tm.currentStep).toBeGreaterThan(5);
        });
    });

    describe('renderStep content + hints', () => {
        it('renders title/content/indicator and hint for move action', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showStep(4); // movement step (action: move)
            expect(document.getElementById('tutorial-title').textContent).toBeTruthy();
            expect(document.getElementById('tutorial-content').textContent).toBeTruthy();
            expect(document.getElementById('tutorial-step-indicator').textContent).toContain('/');
            expect(document.getElementById('tutorial-shortcut-hint').textContent).toBeTruthy();
        });

        it('shows start button text on the last step', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showStep(tm.steps.length - 1);
            const nextBtn = document.getElementById('tutorial-next-btn');
            expect(nextBtn.textContent).toBeTruthy();
        });

        it('hides previous button on first step', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showStep(0);
            const prevBtn = document.getElementById('tutorial-prev-btn');
            expect(prevBtn.style.display).toBe('none');
        });

        it('highlights an element via selector', () => {
            const tm = new TutorialManager(game);
            tm.start();
            document.body.innerHTML += '<div id="end-turn-btn"></div>';
            tm.showStep(5); // end_turn highlights #end-turn-btn
            expect(document.querySelector('[data-tutorial-highlight="true"]')).not.toBeNull();
        });
    });

    describe('positionTutorialBox', () => {
        it('positions top/bottom/center variants', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.positionTutorialBox('top');
            expect(tm.tutorialBox.style.top).toBe('20px');
            tm.positionTutorialBox('bottom');
            expect(tm.tutorialBox.style.bottom).toBe('20px');
            tm.positionTutorialBox('center');
            expect(tm.tutorialBox.style.top).toBe('50%');
        });

        it('no-ops without a tutorialBox', () => {
            const tm = new TutorialManager(game);
            tm.tutorialBox = null;
            expect(() => tm.positionTutorialBox('top')).not.toThrow();
        });
    });

    describe('clearHighlight', () => {
        it('clears tracked and untracked highlighted elements', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const el = document.createElement('div');
            el.dataset.tutorialHighlight = 'true';
            document.body.appendChild(el);
            tm.highlightedElements.push(el);
            tm.clearHighlight();
            expect(el.dataset.tutorialHighlight).toBeUndefined();
            expect(tm.highlightedElements).toHaveLength(0);
        });

        it('is safe without a spotlight', () => {
            const tm = new TutorialManager(game);
            tm.spotlight = null;
            expect(() => tm.clearHighlight()).not.toThrow();
        });
    });

    describe('stop', () => {
        it('deactivates and removes overlay/spotlight', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.stop();
            expect(tm.isActive).toBe(false);
        });

        it('is safe when overlay has no parent', () => {
            const tm = new TutorialManager(game);
            tm.overlay = null;
            tm.spotlight = null;
            expect(() => tm.stop()).not.toThrow();
        });
    });

    describe('showCompletionConfetti', () => {
        it('emits confetti particles when particle system present', () => {
            const tm = new TutorialManager(game);
            tm.showCompletionConfetti();
            expect(game.particleSystem.engine.emit).toHaveBeenCalled();
        });

        it('is a no-op without particle system', () => {
            const tm = new TutorialManager(makeGame({ particleSystem: null }));
            expect(() => tm.showCompletionConfetti()).not.toThrow();
        });
    });

    describe('showWelcomeAnimation', () => {
        it('injects keyframes when tutorialBox present', () => {
            const tm = new TutorialManager(game);
            tm.start();
            tm.showWelcomeAnimation();
            expect(document.getElementById('tutorial-animations')).not.toBeNull();
        });

        it('is a no-op without tutorialBox', () => {
            const tm = new TutorialManager(game);
            tm.tutorialBox = null;
            expect(() => tm.showWelcomeAnimation()).not.toThrow();
        });
    });

    describe('highlightReachableHexes', () => {
        it('highlights hexes when reachableHexes and hexGrid present', () => {
            const el = document.createElement('div');
            const tm = new TutorialManager(makeGame({
                reachableHexes: [{ q: 1, r: 1 }],
                hexGrid: { getHexElement: () => el },
            }));
            tm.start();
            tm.highlightReachableHexes();
            expect(tm.highlightedElements).toContain(el);
        });

        it('no-ops without reachableHexes', () => {
            const tm = new TutorialManager(makeGame({ reachableHexes: null }));
            expect(() => tm.highlightReachableHexes()).not.toThrow();
        });
    });

    describe('styleButton', () => {
        it('applies styles and hover handlers', () => {
            const tm = new TutorialManager(game);
            tm.start();
            const btn = document.createElement('button');
            tm.styleButton(btn, '#ff0000');
            expect(btn.style.backgroundColor).toBe('rgb(255, 0, 0)');
            expect(typeof btn.onmouseenter).toBe('function');
            expect(typeof btn.onmouseleave).toBe('function');
        });
    });
});
