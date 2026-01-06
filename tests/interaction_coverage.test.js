import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionController } from '../js/interactionController.js';
import { MageKnightGame } from '../js/game.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';
import { eventBus } from '../js/eventBus.js';

describe('InteractionController Coverage', () => {
    let game;
    let controller;

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
            <div id="card-play-modal" style="display: none;">
                <div id="basic-effect-desc"></div>
                <div id="strong-effect-desc"></div>
                <div id="strong-cost-desc"></div>
                <button id="play-basic-btn"></button>
                <button id="play-strong-btn"></button>
                <button id="card-play-close"></button>
            </div>
            <div class="board-wrapper"></div>
        `;
        game = new MageKnightGame();
        // Mock UI further if needed
        game.ui.addLog = vi.fn();
        controller = new InteractionController(game);
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.clear();
    });

    it('should show card play modal when card has strong effect and hero can afford it', () => {
        const card = {
            name: 'Strong Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 }; // Can afford

        controller.handleCardClick(0, card);

        const modal = document.getElementById('card-play-modal');
        expect(modal.style.display).toBe('flex');
        expect(document.getElementById('basic-effect-desc').textContent).toContain('2');
        expect(document.getElementById('strong-effect-desc').textContent).toContain('5');
    });

    it('should play strong effect when strong button is clicked', () => {
        const card = {
            name: 'Strong Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 };

        controller.handleCardClick(0, card);

        const strongBtn = document.getElementById('play-strong-btn');
        let playCalled = false;
        game.actionManager.playCard = (index, strong) => {
            if (strong) playCalled = true;
            return { card, effect: card.strongEffect };
        };

        strongBtn.click();

        expect(playCalled).toBe(true);
        expect(document.getElementById('card-play-modal').style.display).toBe('none');
    });

    it('should play basic effect when basic button is clicked', () => {
        const card = {
            name: 'Strong Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 };

        controller.handleCardClick(0, card);

        const basicBtn = document.getElementById('play-basic-btn');
        let playCalled = false;
        game.actionManager.playCard = (index, strong) => {
            if (!strong) playCalled = true;
            return { card, effect: card.basicEffect };
        };

        basicBtn.click();

        expect(playCalled).toBe(true);
        expect(document.getElementById('card-play-modal').style.display).toBe('none');
    });

    it('should close modal when close button is clicked', () => {
        const card = {
            name: 'Strong Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 };

        controller.handleCardClick(0, card);
        const modal = document.getElementById('card-play-modal');
        expect(modal.style.display).toBe('flex');

        document.getElementById('card-play-close').click();
        expect(modal.style.display).toBe('none');
    });

    it('should play card in combat when combat is active', () => {
        game.combat = {}; // Mock combat active
        const card = {
            name: 'Attack Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 }
        };
        game.hero.hand = [card];

        let playInCombatCalled = false;
        game.playCardInCombat = () => { playInCombatCalled = true; };

        controller.handleCardClick(0, card);

        expect(playInCombatCalled).toBe(true);
    });

    it('should play strong card in combat when affordable', () => {
        game.combat = {};
        const card = {
            name: 'Strong Attack',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 };

        let playInCombatCalled = false;
        game.playCardInCombat = (idx, c, strong) => { if (strong) playInCombatCalled = true; };

        controller.handleCardClick(0, card);
        document.getElementById('play-strong-btn').click();

        expect(playInCombatCalled).toBe(true);
    });

    it('should initiate combat when clicking enemy on same hex', () => {
        const enemy = { name: 'Orc', position: { q: 0, r: 0 }, armor: 2, attack: 3 };
        game.enemies = [enemy];
        game.hero.position = { q: 0, r: 0 };
        game.hexGrid.distance = () => 0;

        let initiateCalled = false;
        game.initiateCombat = (e) => { if (e === enemy) initiateCalled = true; };

        controller.selectHex(0, 0);
        expect(initiateCalled).toBe(true);
    });

    it('should handle wounds and invalid clicks', () => {
        const wound = { isWound: () => true, name: 'Wound' };
        let soundPlayed = false;
        game.sound.error = () => { soundPlayed = true; };

        controller.handleCardClick(0, wound);
        expect(soundPlayed).toBe(true);
    });

    it('should close modal when clicking outside (on modal background)', () => {
        const card = {
            name: 'Strong Card',
            color: 'red',
            isWound: () => false,
            basicEffect: { attack: 2 },
            strongEffect: { attack: 5 }
        };
        game.hero.hand = [card];
        game.hero.manaInventory = { red: 1 };

        controller.handleCardClick(0, card);
        const modal = document.getElementById('card-play-modal');

        // Mock event targeting the modal itself
        modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(modal.style.display).toBe('none');
    });

    it('should prevent right-click actions in combat or on wounds', () => {
        const wound = { isWound: () => true, name: 'Wound' };
        const normal = { isWound: () => false, name: 'Normal' };

        // Wound check
        expect(controller.handleCardRightClick(0, wound)).toBeUndefined();

        // Combat check
        game.combat = {};
        expect(controller.handleCardRightClick(0, normal)).toBeUndefined();
    });

    it('should handle sideways card play via prompt', () => {
        const card = {
            isWound: () => false,
            name: 'Normal',
            basicEffect: {},
            strongEffect: {},
            color: 'red'
        };
        game.hero.hand = [card];

        // Mock prompt to return '1' (Movement)
        const originalPrompt = global.prompt;
        global.prompt = () => '1';

        let sidewaysCalled = false;
        game.actionManager.playCardSideways = (index, type) => {
            if (type === 'movement') sidewaysCalled = true;
            return { card, effect: { movement: 1 } };
        };

        try {
            controller.handleCardRightClick(0, card);
            expect(sidewaysCalled).toBe(true);
        } finally {
            global.prompt = originalPrompt;
        }
    });
});
