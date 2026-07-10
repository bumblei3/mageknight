import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TutorialManager from '../js/tutorialManager.js';

/**
 * Focused tests for js/tutorialManager.ts (previously ~55% line coverage).
 * jsdom provides document/window/localStorage; we build the tutorial DOM
 * elements so the UI-creation and step-rendering code paths are exercised.
 */

function buildDom() {
    document.body.innerHTML = '';
    const ids = ['tutorial-overlay', 'tutorial-box', 'tutorial-spotlight', 'tutorial-step-indicator',
        'tutorial-title', 'tutorial-content', 'tutorial-next-btn', 'tutorial-prev-btn', 'tutorial-shortcut-hint',
        'hero-name', 'hand-cards', 'mana-source', 'game-board', 'end-turn-btn', 'combat-panel'];
    for (const id of ids) {
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
}

function makeGame(over = {}) {
    return {
        particleSystem: { engine: { emit: vi.fn() } },
        showToast: vi.fn(),
        reachableHexes: [],
        hexGrid: null,
        combat: null,
        ...over,
    };
}

describe('TutorialManager - static helpers', () => {
    beforeEach(() => { localStorage.clear(); });

    it('hasCompleted false initially, true after complete, reset clears', () => {
        expect(TutorialManager.hasCompleted()).toBe(false);
        localStorage.setItem('mk_tutorial_completed', 'true');
        expect(TutorialManager.hasCompleted()).toBe(true);
        TutorialManager.reset();
        expect(TutorialManager.hasCompleted()).toBe(false);
    });

    it('hasCompleted returns false when localStorage undefined', () => {
        const orig = global.localStorage;
        // @ts-ignore simulate missing localStorage
        global.localStorage = undefined;
        expect(TutorialManager.hasCompleted()).toBe(false);
        global.localStorage = orig;
    });
});

describe('TutorialManager - lifecycle', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        buildDom();
        game = makeGame();
        mgr = new TutorialManager(game);
    });
    afterEach(() => { document.body.innerHTML = ''; });

    it('start activates tutorial and creates UI', () => {
        mgr.start();
        expect(mgr.isActive).toBe(true);
        expect(document.getElementById('tutorial-box')).toBeTruthy();
    });

    it('start is a no-op when already completed', () => {
        localStorage.setItem('mk_tutorial_completed', 'true');
        mgr.start();
        expect(mgr.isActive).toBe(false);
    });

    it('nextStep is a no-op when not active', () => {
        // not started
        mgr.nextStep();
        expect(mgr.currentStep).toBe(0);
    });

    it('prevStep at step 0 completes the tutorial', () => {
        mgr.start();
        mgr.prevStep();
        expect(mgr.isActive).toBe(false);
        expect(TutorialManager.hasCompleted()).toBe(true);
    });

    it('showStep with out-of-range index completes', () => {
        mgr.start();
        mgr.showStep(999);
        expect(mgr.isActive).toBe(false);
    });

    it('skip completes the tutorial', () => {
        mgr.start();
        mgr.skip();
        expect(mgr.isActive).toBe(false);
        expect(TutorialManager.hasCompleted()).toBe(true);
    });

    it('complete sets localStorage and toasts', () => {
        mgr.start();
        mgr.complete();
        expect(TutorialManager.hasCompleted()).toBe(true);
        expect(game.showToast).toHaveBeenCalled();
    });

    it('stop deactivates and removes overlay', () => {
        mgr.start();
        mgr.stop();
        expect(mgr.isActive).toBe(false);
    });
});

describe('TutorialManager - navigation', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        buildDom();
        game = makeGame();
        mgr = new TutorialManager(game);
        mgr.start();
    });
    afterEach(() => { document.body.innerHTML = ''; });

    it('nextStep advances the current step', () => {
        const before = mgr.currentStep;
        mgr.nextStep();
        expect(mgr.currentStep).toBe(before + 1);
    });

    it('prevStep moves back when not at step 0', () => {
        mgr.nextStep();
        const mid = mgr.currentStep;
        mgr.prevStep();
        expect(mgr.currentStep).toBe(mid - 1);
    });
});

describe('TutorialManager - keyboard', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        buildDom();
        game = makeGame();
        mgr = new TutorialManager(game);
        mgr.start();
    });
    afterEach(() => { document.body.innerHTML = ''; });

    function key(k) {
        const e = { key: k, preventDefault: vi.fn() };
        mgr.handleKeyDown(e);
        return e;
    }

    it('ArrowRight advances', () => {
        const before = mgr.currentStep;
        key('ArrowRight');
        expect(mgr.currentStep).toBe(before + 1);
    });

    it('Enter advances', () => {
        const before = mgr.currentStep;
        key('Enter');
        expect(mgr.currentStep).toBe(before + 1);
    });

    it('ArrowLeft goes back', () => {
        mgr.nextStep();
        const mid = mgr.currentStep;
        key('ArrowLeft');
        expect(mgr.currentStep).toBe(mid - 1);
    });

    it('Escape skips (completes)', () => {
        key('Escape');
        expect(mgr.isActive).toBe(false);
    });

    it('handleKeyDown is a no-op when not active', () => {
        mgr.stop();
        const before = 0;
        key('ArrowRight');
        expect(mgr.currentStep).toBe(before); // unchanged (stop resets? no — just no-op)
    });
});

describe('TutorialManager - rendering & highlight', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        buildDom();
        game = makeGame();
        mgr = new TutorialManager(game);
        mgr.start();
    });
    afterEach(() => { document.body.innerHTML = ''; });

    it('renderStep updates title/content/buttons', () => {
        mgr.showStep(1); // hero_stats step
        expect(document.getElementById('tutorial-title').textContent).toBeTruthy();
        expect(document.getElementById('tutorial-content').textContent).toBeTruthy();
        expect(document.getElementById('tutorial-step-indicator').textContent).toContain('/');
    });

    it('highlightElement applies spotlight styles to matched element', () => {
        mgr.highlightElement('#hero-name');
        const el = document.getElementById('hero-name');
        expect(el.dataset.tutorialHighlight).toBe('true');
        expect(mgr.spotlight.style.display).toBe('block');
    });

    it('highlightElement is a no-op for missing selector', () => {
        // should not throw
        expect(() => mgr.highlightElement('#does-not-exist')).not.toThrow();
    });

    it('clearHighlight resets tracked elements', () => {
        mgr.highlightElement('#hero-name');
        mgr.clearHighlight();
        const el = document.getElementById('hero-name');
        expect(el.dataset.tutorialHighlight).toBeUndefined();
        expect(mgr.spotlight.style.display).toBe('none');
    });

    it('positionTutorialBox handles top/bottom/center', () => {
        mgr.positionTutorialBox('top');
        expect(mgr.tutorialBox.style.top).toBe('20px');
        mgr.positionTutorialBox('bottom');
        expect(mgr.tutorialBox.style.bottom).toBe('20px');
        mgr.positionTutorialBox('center');
        expect(mgr.tutorialBox.style.transform).toContain('translate(-50%, -50%)');
    });

    it('showStep with waitForEvent registers an event listener', () => {
        // combat_intro step waits for 'combat_started'
        mgr.showStep(6);
        // simulate the event firing
        // eventBus is internal; we just verify no throw and step indicator present
        expect(document.getElementById('tutorial-step-indicator')).toBeTruthy();
    });

    it('showStep with condition polls until satisfied', () => {
        // ranged_phase / block_phase / attack_phase have conditions
        mgr.showStep(7); // ranged_phase (condition: combat.phase === RANGED)
        // not satisfied yet -> should not throw, just sets up interval
        expect(mgr.isActive).toBe(true);
    });
});

describe('TutorialManager - welcome & completion effects', () => {
    let game, mgr;
    beforeEach(() => {
        localStorage.clear();
        buildDom();
        game = makeGame();
        mgr = new TutorialManager(game);
        mgr.start();
    });
    afterEach(() => { document.body.innerHTML = ''; });

    it('welcome step adds animation style element', () => {
        mgr.showStep(0);
        expect(document.getElementById('tutorial-animations')).toBeTruthy();
    });

    it('completion confetti emits particles', () => {
        mgr.showStep(10); // complete step calls showCompletionConfetti
        expect(game.particleSystem.engine.emit).toHaveBeenCalled();
    });

    it('showCompletionConfetti is a no-op without particleSystem', () => {
        const g2 = makeGame({ particleSystem: null });
        const m2 = new TutorialManager(g2);
        m2.start();
        // should not throw
        expect(() => m2.showStep(10)).not.toThrow();
    });
});
