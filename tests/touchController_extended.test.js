import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { TouchController } from '../js/touchController.js';
import { createMockElement, createSpy, setupGlobalMocks, resetMocks } from './test-mocks.js';

describe('TouchController Extended', () => {
    let game;
    let controller;
    let canvas;

    beforeEach(() => {
        setupGlobalMocks();
        resetMocks();

        canvas = createMockElement('canvas');
        canvas.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        });

        game = {
            canvas: canvas,
            hero: { hand: [{ name: 'Card 1' }, { name: 'Card 2' }] },
            handleCardClick: createSpy('handleCardClick'),
            handleCardRightClick: createSpy('handleCardRightClick'),
            addLog: createSpy('addLog'),
            hexGrid: {
                pixelToAxial: () => ({ q: 0, r: 0 }),
                hasHex: () => true,
                getHex: () => ({ terrain: 1 })
            },
            terrain: { getName: () => 'Plains' },
            enemies: [],
            ui: {
                tooltipManager: {
                    showEnemyTooltip: createSpy('showEnemyTooltip'),
                    showTerrainTooltip: createSpy('showTerrainTooltip')
                }
            }
        };

        // Mock document.getElementById for hand-cards
        const handCards = createMockElement('div');
        handCards.id = 'hand-cards';
        document.body.appendChild(handCards);

        controller = new TouchController(game);
    });

    afterEach(() => {
        const handCards = document.getElementById('hand-cards');
        if (handCards) handCards.remove();
    });

    it('should handle card touch start and end (tap)', () => {
        const handCards = document.getElementById('hand-cards');
        const cardEl = createMockElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = '0';
        handCards.appendChild(cardEl);

        const touchStartEvent = {
            target: cardEl,
            preventDefault: createSpy('preventDefault'),
            touches: [{ clientX: 0, clientY: 0 }]
        };

        const touchEndEvent = {
            target: cardEl,
            preventDefault: createSpy('preventDefault'),
            changedTouches: [{ clientX: 0, clientY: 0 }]
        };

        // Simulate touch events
        const touchStartHandler = Array.from(handCards.listeners).find(l => l.type === 'touchstart').handler;
        const touchEndHandler = Array.from(handCards.listeners).find(l => l.type === 'touchend').handler;

        touchStartHandler(touchStartEvent);
        touchEndHandler(touchEndEvent);

        expect(game.handleCardClick.called).toBe(true);
        expect(game.handleCardClick.calledWith(0, game.hero.hand[0])).toBe(true);
    });

    it('should show hex tooltip for enemy', () => {
        const touch = { clientX: 100, clientY: 200 };
        const hex = { q: 1, r: 1 };
        const enemy = { name: 'Orc', position: { q: 1, r: 1 } };
        game.enemies = [enemy];

        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showEnemyTooltip.called).toBe(true);
    });

    it('should show hex tooltip for terrain', () => {
        const touch = { clientX: 100, clientY: 200 };
        const hex = { q: 2, r: 2 };
        game.enemies = [];
        const originalGetHex = game.hexGrid.getHex; // Store original
        game.hexGrid.getHex = () => ({ terrain: 'forest', q: 2, r: 2 });

        controller.showHexTooltip(touch, hex);
        expect(game.ui.tooltipManager.showTerrainTooltip.called).toBe(true);

        game.hexGrid.getHex = originalGetHex; // Restore original
    });

    it('should handle card touch cancel', () => {
        const handCards = document.getElementById('hand-cards');
        const cardEl = createMockElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = '0';
        handCards.appendChild(cardEl);

        const touchStartHandler = Array.from(handCards.listeners).find(l => l.type === 'touchstart').handler;
        const touchCancelHandler = Array.from(handCards.listeners).find(l => l.type === 'touchcancel').handler;

        touchStartHandler({ target: cardEl, preventDefault: () => { }, touches: [{}] });
        touchCancelHandler();

        expect(controller.cardLongPressTimer).toBe(null);
    });

    it('should handle card long press', async () => {
        const handCards = document.getElementById('hand-cards');
        const cardEl = createMockElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = '1';
        handCards.appendChild(cardEl);

        const touchStartHandler = Array.from(handCards.listeners).find(l => l.type === 'touchstart').handler;

        touchStartHandler({ target: cardEl, preventDefault: () => { }, touches: [{}] });

        // Wait for long press threshold (500ms)
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(game.handleCardRightClick.called).toBe(true);
        expect(game.handleCardRightClick.calledWith(1, game.hero.hand[1])).toBe(true);
    });

    it('should handle swipes in all directions', () => {
        controller.touchStartPos = { x: 100, y: 100 };
        controller.touchStartTime = Date.now();

        // Swipe right
        controller.handleTouchEnd({
            preventDefault: () => { },
            changedTouches: [{ clientX: 200, clientY: 100 }]
        });
        expect(game.addLog.calledWith('Swipe rechts', 'info')).toBe(true);

        // Swipe left
        controller.handleTouchEnd({
            preventDefault: () => { },
            changedTouches: [{ clientX: 0, clientY: 100 }]
        });
        expect(game.addLog.calledWith('Swipe links', 'info')).toBe(true);

        // Swipe down
        controller.handleTouchEnd({
            preventDefault: () => { },
            changedTouches: [{ clientX: 100, clientY: 200 }]
        });
        expect(game.addLog.calledWith('Swipe runter', 'info')).toBe(true);

        // Swipe up
        controller.handleTouchStart({ touches: [{ clientX: 100, clientY: 100 }], preventDefault: () => { } });
        controller.handleTouchEnd({
            preventDefault: () => { },
            changedTouches: [{ clientX: 100, clientY: 0 }]
        });
        expect(game.addLog.calledWith('Swipe hoch', 'info')).toBe(true);
    });
});
