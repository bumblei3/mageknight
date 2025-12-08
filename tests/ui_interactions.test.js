import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createSpy } from './test-mocks.js';
import { Card } from '../js/card.js';

describe('UI Interactions', () => {
    let game;
    let originalRest;
    let originalEndTurn;
    let originalHandleCardClick;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Mock required elements to avoid UI errors during init
        const buttonIds = ['end-turn-btn', 'rest-btn', 'explore-btn', 'save-btn', 'load-btn', 'help-btn'];
        buttonIds.forEach(id => {
            if (!document.getElementById(id)) {
                const btn = document.createElement('button');
                btn.id = id;
            }
        });

        if (!document.getElementById('game-board')) {
            const canvas = document.createElement('canvas'); // Canvas for board
            canvas.id = 'game-board';
            // Also need 2d context for some game logic if it draws immediately
        }

        // Spy on PROTOTYPE to ensure all calls are captured, bypassing any binding issues
        originalRest = MageKnightGame.prototype.rest;
        originalEndTurn = MageKnightGame.prototype.endTurn;
        originalHandleCardClick = MageKnightGame.prototype.handleCardClick;

        MageKnightGame.prototype.rest = createSpy(() => { });
        MageKnightGame.prototype.endTurn = createSpy(() => { });
        MageKnightGame.prototype.handleCardClick = createSpy(() => { });

        game = new MageKnightGame();
    });

    afterEach(() => {
        // Restore prototype methods
        if (originalRest) MageKnightGame.prototype.rest = originalRest;
        if (originalEndTurn) MageKnightGame.prototype.endTurn = originalEndTurn;
        if (originalHandleCardClick) MageKnightGame.prototype.handleCardClick = originalHandleCardClick;
    });

    it('should trigger endTurn when End Turn button is clicked', () => {
        const btn = document.getElementById('end-turn-btn');
        btn.dispatchEvent({ type: 'click', target: btn });

        expect(game.endTurn.callCount).toBeGreaterThan(0);
    });

    it('should trigger rest when Rest button is clicked', () => {
        const btn = document.getElementById('rest-btn');
        btn.dispatchEvent({ type: 'click', target: btn });

        expect(game.rest.callCount).toBeGreaterThan(0);
    });

    it('should delegate card rendering to UI', () => {
        // For this test we spy on UI method
        game.ui.renderHandCards = createSpy();

        game.hero.hand = [new Card({ id: 1, name: 'Test Card', type: 'action', color: 'red' })];
        game.renderHand();

        expect(game.ui.renderHandCards.callCount).toBeGreaterThan(0);
        expect(game.ui.renderHandCards.calls[0][0].length).toBe(1);
    });
});
