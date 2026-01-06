import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';
import { eventBus } from '../js/eventBus.js';

// Mock global.confirm
const originalConfirm = global.confirm;

describe('Game Reset', () => {
    let game;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name">Hero</div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer" class="canvas-layer"></div>
            <div id="reset-modal">
                <button id="confirm-reset-btn"></button>
                <button id="cancel-reset-btn"></button>
                <button id="close-reset-modal"></button>
            </div>
            <div id="scenario-selection-modal">
                <div id="scenario-cards-grid"></div>
                <button id="scenario-selection-close"></button>
                <button id="scenario-cancel-btn"></button>
            </div>
            <div id="play-area">
                <div id="played-cards"></div>
            </div>
        `;
        game = new MageKnightGame();
        // Mock confirm to always return true
        global.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.clear();
        // Restore confirm
        global.confirm = originalConfirm;
    });

    it('should reset game state on reset()', () => {
        // Modify state
        game.turnNumber = 5;
        game.hero.movementPoints = 3;

        // Call reset - this shows the modal
        game.reset();

        // Simulate scenario card click (the new flow)
        const firstCard = document.querySelector('.scenario-card');
        if (firstCard) {
            firstCard.click();
        }

        // Verify reset
        expect(game.turnNumber).toBe(0);
        expect(game.hero.movementPoints).toBe(0);
        expect(game.gameState).toBe('playing');
    });

    it('should re-initialize hero and map on reset()', () => {
        const originalHeroId = game.hero.id;
        const originalMapManager = game.mapManager;

        game.reset();

        // Simulate scenario card click
        const firstCard = document.querySelector('.scenario-card');
        if (firstCard) firstCard.click();

        expect(game.hero).not.toBe(originalHeroId);
        expect(game.mapManager).not.toBe(originalMapManager);
    });

    it('should not reset if confirm is cancelled', () => {
        // global.confirm = () => false; // No longer used
        game.turnNumber = 5;

        game.reset();

        // Simulate cancel
        const cancelBtn = document.getElementById('cancel-reset-btn');
        if (cancelBtn) cancelBtn.click();

        expect(game.turnNumber).toBe(5);
    });
});
