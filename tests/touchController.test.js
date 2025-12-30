
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { TouchController } from '../js/touchController.js';
import { MageKnightGame } from '../js/game.js';
import { MockHTMLElement } from './test-mocks.js';

describe('Touch Controller', () => {
    let game;
    let touchController;
    let canvas;

    beforeEach(() => {
        document.body.innerHTML = '<div id="canvas-container"><canvas id="game-board"></canvas></div><div id="hand-cards"></div>';
        game = new MageKnightGame();

        // Mock hero for render/update
        game.hero = {
            hand: [],
            getStats: () => ({
                health: 10, maxHealth: 10,
                armor: 2,
                handSize: 5
            }),
            position: { q: 0, r: 0 },
            displayPosition: { q: 0, r: 0 }
        };

        canvas = game.canvas;
        touchController = new TouchController(game);

        // Mock navigator.vibrate
        global.navigator.vibrate = () => true;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should handle tap as a click/select', () => {
        let selectedHex = null;
        game.selectHex = (q, r) => { selectedHex = { q, r }; };

        // Mock coordinate translation
        game.hexGrid.pixelToAxial = () => ({ q: 2, r: 3 });
        game.hexGrid.hasHex = () => true;

        const touchStart = new CustomEvent('touchstart');
        touchStart.touches = [{ clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        const touchEnd = new CustomEvent('touchend');
        touchEnd.changedTouches = [{ clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchEnd);

        expect(selectedHex).toEqual({ q: 2, r: 3 });
    });

    it('should handle long press for context info', (done) => {
        game.ui.addLog = (msg, type) => {
            if (msg.includes('Langes Drücken')) {
                done();
            }
        };

        game.hexGrid.pixelToAxial = () => ({ q: 2, r: 3 });
        game.hexGrid.hasHex = () => true;

        // Force long press threshold
        touchController.longPressThreshold = 10;

        const touchStart = new CustomEvent('touchstart');
        touchStart.touches = [{ clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        // Wait for long press timer
        setTimeout(() => {
            const touchEnd = new CustomEvent('touchend');
            touchEnd.changedTouches = [{ clientX: 100, clientY: 100 }];
            canvas.dispatchEvent(touchEnd);
        }, 20);
    });

    it('should handle swipes', () => {
        let loggedMsg = '';
        game.ui.addLog = (msg) => { loggedMsg = msg; };

        const touchStart = new CustomEvent('touchstart');
        touchStart.touches = [{ clientX: 100, clientY: 100 }];
        canvas.dispatchEvent(touchStart);

        const touchEnd = new CustomEvent('touchend');
        touchEnd.changedTouches = [{ clientX: 200, clientY: 100 }]; // Swipe right
        canvas.dispatchEvent(touchEnd);

        expect(loggedMsg).toBe('Swipe rechts');
    });

    it('should handle card taps', () => {
        const hand = document.getElementById('hand-cards');
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.dataset.index = '0';
        hand.appendChild(cardEl);

        let cardClicked = false;
        game.handleCardClick = () => { cardClicked = true; };
        game.hero = { hand: [{ name: 'Test Card' }] };

        const touchStart = new CustomEvent('touchstart');
        touchStart.target = cardEl;
        hand.dispatchEvent(touchStart);

        const touchEnd = new CustomEvent('touchend');
        touchEnd.target = cardEl;
        hand.dispatchEvent(touchEnd);

        expect(cardClicked).toBe(true);
    });

    it('should handle viewport resize', (done) => {
        const initialWidth = canvas.width;

        // Mock container
        const container = document.createElement('div');
        Object.defineProperty(container, 'getBoundingClientRect', {
            value: () => ({ width: 500, height: 400 })
        });
        container.appendChild(canvas);
        document.body.appendChild(container); // Add to DOM

        touchController.resizeCanvas();

        // Canvas should be resized
        setTimeout(() => {
            expect(canvas.width).toBe(500);
            expect(canvas.height).toBe(400);
            done();
        }, 150);
    });
});
