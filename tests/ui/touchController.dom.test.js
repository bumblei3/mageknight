// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TouchController from '../../js/touchController.js';

// TouchController reads a subset of TouchEvent; we pass plain objects.
function touchEvent(touches, changedTouches) {
    return {
        touches: touches || [],
        changedTouches: changedTouches || touches || [],
        preventDefault: vi.fn(),
    };
}

function makeGame() {
    const canvas = document.createElement('canvas');
    canvas.id = 'game-board';
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 });
    document.body.appendChild(canvas);

    const hexGrid = {
        hasHex: (q, r) => (q === 0 && r === 0),
        pixelToAxial: (x, y) => ({ q: 0, r: 0 }),
        axialToPixel: (q, r) => ({ x: 10, y: 10 }),
    };

    const enemy = { position: { q: 0, r: 0 }, isDefeated: () => false };
    const game = {
        canvas,
        hexGrid,
        enemies: [enemy],
        reachableHexes: [{ q: 0, r: 0 }],
        hero: { hand: [{}, {}], movementPoints: 5 },
        moveHero: vi.fn(),
        initiateCombat: vi.fn(),
        ui: {
            tooltipManager: {
                showEnemyTooltip: vi.fn(),
                showSiteTooltip: vi.fn(),
                showTerrainTooltip: vi.fn(),
                hideTooltip: vi.fn(),
            },
        },
        addLog: vi.fn(),
    };
    return { game, canvas, enemy };
}

describe('TouchController (real DOM, jsdom)', () => {
    let tc;
    let ctx;

    beforeEach(() => {
        document.body.innerHTML = '';
        ctx = makeGame();
        tc = new TouchController(ctx.game);
    });

    it('isTouchDevice detects touch via maxTouchPoints', () => {
        const orig = navigator.maxTouchPoints;
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
        expect(TouchController.isTouchDevice()).toBe(true);
        Object.defineProperty(navigator, 'maxTouchPoints', { value: orig, configurable: true });
    });

    it('single-finger pan on empty space applies a translate transform', () => {
        // force the "empty space" branch (no draggable card under finger)
        tc.isOverDraggableCard = () => false;
        tc.handleTouchStart(touchEvent([{ clientX: 0, clientY: 0 }]));
        expect(tc.isPanning).toBe(true);

        tc.handleTouchMove(touchEvent([{ clientX: 30, clientY: 20 }]));
        expect(ctx.canvas.style.transform).toContain('translate(30px, 20px)');
        expect(ctx.canvas.style.transform).toContain('scale(1)');

        tc.handleTouchEnd(touchEvent([{ clientX: 30, clientY: 20 }]));
        expect(tc.isPanning).toBe(false);
    });

    it('two-finger pinch zoom applies a scale transform', () => {
        const t0 = [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }];
        tc.handleTouchStart(touchEvent(t0));
        expect(tc.isPinching).toBe(true);

        const t1 = [{ clientX: 0, clientY: 0 }, { clientX: 200, clientY: 0 }];
        tc.handleTouchMove(touchEvent(t1));
        expect(ctx.canvas.style.transform).toContain('scale(2)');

        tc.handleTouchEnd(touchEvent(t1));
        expect(tc.isPinching).toBe(false);
    });

    it('card drag + drop on a move hex calls game.moveHero', () => {
        // force the "card under finger" branch
        const fakeCard = { classList: { contains: () => false }, dataset: { index: '1' }, cloneNode: () => document.createElement('div'), getBoundingClientRect: () => ({ width: 100, height: 140 }), style: {} };
        tc.isOverDraggableCard = () => true;
        tc.findCardElement = () => fakeCard;
        tc.handleTouchStart(touchEvent([{ clientX: 50, clientY: 50 }]));
        expect(tc.draggedCardElement).not.toBeNull();
        expect(tc.validDropZones.length).toBeGreaterThan(0);

        tc.handleTouchMove(touchEvent([{ clientX: 10, clientY: 10 }]));
        tc.handleTouchEnd(touchEvent([{ clientX: 10, clientY: 10 }]));

        expect(ctx.game.moveHero).toHaveBeenCalledWith(0, 0);
        expect(tc.draggedCardElement).toBeNull();
    });

    it('card drag + drop on an enemy calls game.initiateCombat', () => {
        // no reachable hexes -> only the enemy drop zone exists, isolates attack path
        ctx.game.reachableHexes = [];
        const fakeCard = { classList: { contains: () => false }, dataset: { index: '0' }, cloneNode: () => document.createElement('div'), getBoundingClientRect: () => ({ width: 100, height: 140 }), style: {} };
        tc.isOverDraggableCard = () => true;
        tc.findCardElement = () => fakeCard;
        tc.handleTouchStart(touchEvent([{ clientX: 50, clientY: 50 }]));
        tc.handleTouchMove(touchEvent([{ clientX: 10, clientY: 10 }]));
        tc.handleTouchEnd(touchEvent([{ clientX: 10, clientY: 10 }]));

        expect(ctx.game.initiateCombat).toHaveBeenCalledWith(0);
    });

    it('touch move over a hex with an enemy shows enemy tooltip', () => {
        tc.isOverDraggableCard = () => false; // empty space -> pan branch on start
        tc.handleTouchStart(touchEvent([{ clientX: 5, clientY: 5 }]));
        tc.isPanning = false; // simulate pan released, finger still moving -> tooltip branch
        tc.handleTouchMove(touchEvent([{ clientX: 5, clientY: 5 }]));
        expect(ctx.game.ui.tooltipManager.showEnemyTooltip).toHaveBeenCalled();
    });

    it('handleCardLongPress calls game.handleCardRightClick when present', () => {
        ctx.game.handleCardRightClick = vi.fn();
        tc.handleCardLongPress(0);
        expect(ctx.game.handleCardRightClick).toHaveBeenCalledWith(0);
    });

    it('handleSwipe logs direction on vertical/horizontal swipes', () => {
        tc.handleSwipe(0, -50); // up
        expect(ctx.game.addLog).toHaveBeenCalledWith('Swipe hoch', 'info');
        ctx.game.addLog.mockClear();
        tc.handleSwipe(50, 0); // right
        expect(ctx.game.addLog).toHaveBeenCalledWith('Swipe rechts', 'info');
    });
});
