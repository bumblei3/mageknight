import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { SKILLS } from '../js/skills.js';
import { SAMPLE_ADVANCED_ACTIONS } from '../js/card.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';
import { eventBus } from '../js/eventBus.js';

describe('Long Session - Integration', () => {
    let game;
    let originalGetElementById, originalQuerySelector;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
            <div id="play-area" style="display: none;">
                <div id="played-cards"></div>
            </div>
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
        `;

        game = new MageKnightGame();
        // Mock heavy systems to avoid actual timers/loops
        game.sound = { play: vi.fn(), success: vi.fn() };
        game.particles = { start: vi.fn(), stop: vi.fn(), burst: vi.fn(), addParticle: vi.fn() };
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.clear();
    });

    it('should maintain state over a 3-turn sequence', () => {
        // Turn 1: Initialization
        expect(game.turnNumber).toBe(0);
        const initialDeckSize = game.hero.deck.length;

        // Turn 0: End Turn
        game.endTurn();
        expect(game.turnNumber).toBe(1);

        // Turn 1: Gain Fame (combat result simulation)
        game.gainFame(15); // Level up triggers at 10

        // Simulate player selection via LevelUpManager
        game.levelUpManager.selectedSkill = SKILLS.GOLDYX[0];
        game.levelUpManager.selectedCard = SAMPLE_ADVANCED_ACTIONS[0];
        game.levelUpManager.confirmSelection();

        expect(game.hero.level).toBe(2);
        expect(game.hero.skills.length).toBeGreaterThan(0);

        // Turn 1: End Turn
        game.endTurn();
        expect(game.turnNumber).toBe(2);

        // Turn 3: Check day/night transition if applicable (requires timeManager)
        // The game cycles day/night after turns? Or rounds? 
        // Let's check consistency
        // Turn 3: Check day/night transition if applicable (requires timeManager)
        // The game cycles day/night after turns? Or rounds? 
        // Let's check consistency
        expect(game.hero.fame).toBeGreaterThanOrEqual(15);
        expect(game.hero.level).toBe(2);
    });

    it('should survive save/load in the middle of a session', () => {
        game.hero.fame = 25;
        game.turnNumber = 4;

        const state = game.getGameState();
        const newGame = new MageKnightGame();
        newGame.loadGameState(state);

        expect(newGame.hero.fame).toBe(25);
        expect(newGame.turnNumber).toBe(4);
    });
});
