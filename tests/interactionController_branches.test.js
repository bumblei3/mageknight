/**
 * InteractionController - Branch Coverage Boost
 * Targets the untested guard/branch paths in js/interactionController.ts
 * (handleCanvasClick, handleCardDrop, handleManaClick, handleCardRightClick, selectHex).
 * Uses a fully mocked game object (no full MageKnightGame init) to isolate logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionController } from '../js/interactionController.js';

function makeCard(overrides = {}) {
    return {
        name: 'TestCard',
        isWound: () => false,
        strongEffect: {},
        basicEffect: {},
        color: 'red',
        ...overrides,
    };
}

function makeMockGame() {
    const enemies = [];
    const hexGrid = {
        _hexes: { '1,1': { q: 1, r: 1, revealed: true, terrain: 'plains', site: null }, '2,2': { q: 2, r: 2, revealed: false } },
        pixelToAxial: vi.fn(() => ({ q: 1, r: 1 })),
        hasHex: vi.fn((q, r) => !!(hexGrid._hexes[`${q},${r}`])),
        getHex: vi.fn((q, r) => hexGrid._hexes[`${q},${r}`] || null),
        selectHex: vi.fn(),
        distance: vi.fn(() => 1),
        axialToPixel: vi.fn(() => ({ x: 100, y: 100 })),
        getMovementCost: vi.fn(() => 1),
    };
    const canvas = {
        width: 800, height: 600,
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 })),
    };
    const hero = {
        position: { q: 0, r: 0 },
        displayPosition: { q: 0, r: 0 },
        hand: [],
        movementPoints: 5,
        hasSkill: vi.fn(() => false),
        canAffordMana: vi.fn(() => true),
    };
    const combatOrchestrator = {
        initiateCombat: vi.fn(),
        playCardInCombat: vi.fn(),
    };
    const actionManager = {
        playCard: vi.fn(() => null),
        playCardSideways: vi.fn(() => null),
        takeMana: vi.fn(() => null),
    };
    const ui = {
        tooltipManager: { showTooltip: vi.fn(), hideTooltip: vi.fn(), createEnemyTooltipHTML: vi.fn(() => '<e>'), createSiteTooltipHTML: vi.fn(() => '<s>'), createTerrainTooltipHTML: vi.fn(() => '<t>') },
        formatEffect: vi.fn((e) => e ? 'effect' : ''),
        addPlayedCard: vi.fn(),
        showPlayArea: vi.fn(),
        elements: { playedCards: null, handCards: null },
        createCardElement: vi.fn(() => ({ style: {}, classList: { add: vi.fn(), remove: vi.fn() } })),
    };
    const timeManager = { isNight: vi.fn(() => false) };
    const sound = { error: vi.fn(), cardPlay: vi.fn(), cardPlaySideways: vi.fn() };
    const game = {
        canvas,
        hexGrid,
        hero,
        enemies,
        combatOrchestrator,
        actionManager,
        ui,
        timeManager,
        sound,
        terrain: { getName: vi.fn((t) => `Terrain:${t}`) },
        addLog: vi.fn(),
        render: vi.fn(),
        moveHero: vi.fn(),
        renderHand: vi.fn(),
        updateStats: vi.fn(),
        renderMana: vi.fn(),
        enterMovementMode: vi.fn(),
        combat: null,
        movementMode: false,
        debugTeleport: false,
        particleSystem: null,
    };
    return game;
}

describe('InteractionController - Branch Coverage Boost', () => {
    let game;
    let controller;

    beforeEach(() => {
        game = makeMockGame();
        controller = new InteractionController(game);
    });

    describe('handleCanvasClick', () => {
        it('returns early when pixelToAxial yields no hex', () => {
            game.hexGrid.pixelToAxial.mockReturnValue(null);
            const ev = { clientX: 10, clientY: 10 };
            expect(() => controller.handleCanvasClick(ev)).not.toThrow();
            expect(game.addLog).not.toHaveBeenCalled();
        });

        it('returns early when hex is not on the grid', () => {
            game.hexGrid.pixelToAxial.mockReturnValue({ q: 9, r: 9 });
            game.hexGrid.hasHex.mockReturnValue(false);
            controller.handleCanvasClick({ clientX: 10, clientY: 10 });
            expect(game.hexGrid.selectHex).not.toHaveBeenCalled();
        });

        it('selects hex and moves when in movement mode', () => {
            game.movementMode = true;
            controller.handleCanvasClick({ clientX: 400, clientY: 300 });
            expect(game.hexGrid.selectHex).toHaveBeenCalledWith(1, 1);
            expect(game.moveHero).toHaveBeenCalledWith(1, 1);
        });

        it('does not move when not in movement mode', () => {
            game.movementMode = false;
            controller.handleCanvasClick({ clientX: 400, clientY: 300 });
            expect(game.moveHero).not.toHaveBeenCalled();
        });

        it('debug teleports when debugTeleport flag is set', () => {
            game.debugTeleport = true;
            controller.handleCanvasClick({ clientX: 400, clientY: 300 });
            expect(game.hero.position).toEqual({ q: 1, r: 1 });
            expect(game.hero.displayPosition).toEqual({ q: 1, r: 1 });
            expect(game.render).toHaveBeenCalled();
            expect(game.addLog).toHaveBeenCalledWith('Debug: Teleported to 1,1', 'info');
            expect(game.debugTeleport).toBe(false);
        });
    });

    describe('selectHex', () => {
        it('initiates combat when an enemy is on the same hex (distance 0)', () => {
            const enemy = { name: 'Goblin', armor: 2, attack: 3, position: { q: 1, r: 1 }, isDefeated: () => false };
            game.enemies.push(enemy);
            game.hexGrid.distance.mockReturnValue(0);
            controller.selectHex(1, 1);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledWith(enemy);
        });

        it('logs enemy info but does not combat at distance > 0', () => {
            const enemy = { name: 'Orc', armor: 3, attack: 4, position: { q: 1, r: 1 }, isDefeated: () => false };
            game.enemies.push(enemy);
            game.hexGrid.distance.mockReturnValue(2);
            controller.selectHex(1, 1);
            expect(game.addLog).toHaveBeenCalledWith(expect.stringContaining('Feind gefunden'), 'combat');
            expect(game.combatOrchestrator.initiateCombat).not.toHaveBeenCalled();
        });

        it('logs terrain name when hex has terrain', () => {
            controller.selectHex(1, 1);
            expect(game.addLog).toHaveBeenCalledWith(expect.stringContaining('Terrain:plains'), 'info');
        });
    });

    describe('handleCardDrop', () => {
        it('returns early when no card at index', () => {
            game.hero.hand = [];
            game.hexGrid.pixelToAxial.mockReturnValue({ q: 1, r: 1 });
            expect(() => controller.handleCardDrop(0, 100, 100)).not.toThrow();
        });

        it('returns early when axial resolves to null', () => {
            game.hero.hand = [makeCard()];
            game.hexGrid.pixelToAxial.mockReturnValue(null);
            expect(() => controller.handleCardDrop(0, 100, 100)).not.toThrow();
        });

        it('plays the card normally when valid', () => {
            const card = makeCard();
            game.hero.hand = [card];
            game.hexGrid.pixelToAxial.mockReturnValue({ q: 1, r: 1 });
            controller.handleCardDrop(0, 100, 100);
            // handleCardDrop -> handleCardClick -> finishCardPlay (no combat, no strong)
            expect(game.actionManager.playCard).toHaveBeenCalledWith(0, false, false);
        });
    });

    describe('handleManaClick', () => {
        it('does nothing when takeMana returns null', () => {
            game.actionManager.takeMana.mockReturnValue(null);
            controller.handleManaClick(0, 'red');
            expect(game.addLog).not.toHaveBeenCalled();
            expect(game.renderMana).not.toHaveBeenCalled();
        });

        it('logs, renders mana, and triggers particle effect when mana taken', () => {
            game.actionManager.takeMana.mockReturnValue({ color: 'red' });
            game.particleSystem = { manaEffect: vi.fn() };
            game.hexGrid.axialToPixel.mockReturnValue({ x: 50, y: 60 });
            controller.handleManaClick(0, 'red');
            expect(game.addLog).toHaveBeenCalledWith('Mana genommen: red', 'info');
            expect(game.renderMana).toHaveBeenCalled();
            expect(game.particleSystem.manaEffect).toHaveBeenCalledWith(50, 60, 'red');
        });

        it('takes mana without particle system', () => {
            game.actionManager.takeMana.mockReturnValue({ color: 'blue' });
            game.particleSystem = null;
            controller.handleManaClick(0, 'blue');
            expect(game.renderMana).toHaveBeenCalled();
        });
    });

    describe('handleCardRightClick', () => {
        it('returns early when card is a wound', () => {
            const card = makeCard({ isWound: () => true });
            controller.handleCardRightClick(0, card);
            expect(game.addLog).not.toHaveBeenCalled();
        });

        it('returns early when in combat', () => {
            game.combat = { active: true };
            const card = makeCard();
            controller.handleCardRightClick(0, card);
            expect(game.addLog).not.toHaveBeenCalled();
        });

        it('returns early when sideways modal elements are missing', () => {
            document.body.innerHTML = ''; // no sideways-modal
            const card = makeCard();
            controller.handleCardRightClick(0, card);
            // Should fail silently (missing modal)
        });
    });

    describe('finishCardPlay', () => {
        it('plays in combat when combat is active', () => {
            game.combat = { active: true };
            const card = makeCard();
            game.hero.hand = [card];
            controller.finishCardPlay(0, true, false);
            expect(game.combatOrchestrator.playCardInCombat).toHaveBeenCalledWith(0, card, true);
        });

        it('plays via actionManager when no combat and result returned', () => {
            const result = { card: makeCard(), effect: { movement: 2 } };
            game.actionManager.playCard.mockReturnValue(result);
            const card = makeCard();
            game.hero.hand = [card];
            game.ui.elements.playedCards = { getBoundingClientRect: () => ({ right: 100, top: 50 }) };
            game.particleSystem = { playCardEffect: vi.fn() };
            controller.finishCardPlay(0, false, false);
            expect(game.actionManager.playCard).toHaveBeenCalledWith(0, false, false);
            expect(game.sound.cardPlay).toHaveBeenCalled();
            expect(game.enterMovementMode).toHaveBeenCalled();
            expect(game.particleSystem.playCardEffect).toHaveBeenCalled();
        });

        it('does nothing when actionManager returns null', () => {
            game.hero.hand = [makeCard()];
            game.actionManager.playCard.mockReturnValue(null);
            controller.finishCardPlay(0, false, false);
            expect(game.sound.cardPlay).not.toHaveBeenCalled();
            expect(game.renderHand).not.toHaveBeenCalled();
        });
    });

    describe('handleCardClick', () => {
        it('blocks wound cards', () => {
            const card = makeCard({ isWound: () => true });
            controller.handleCardClick(0, card);
            expect(game.sound.error).toHaveBeenCalled();
            expect(game.addLog).toHaveBeenCalledWith('Verletzungen können nicht gespielt werden.', 'warning');
        });

        it('shows modal when strong effect affordable', () => {
            const card = makeCard({ strongEffect: { attack: 2 } });
            game.hero.canAffordMana.mockReturnValue(true);
            // modal exists in DOM
            document.body.innerHTML = `
                <div id="card-play-modal">
                    <div id="basic-effect-desc"></div>
                    <div id="strong-effect-desc"></div>
                    <div id="strong-cost-desc"></div>
                    <button id="play-basic-btn"></button>
                    <button id="play-strong-btn"></button>
                    <button id="card-play-close"></button>
                    <div id="card-play-preview"></div>
                </div>`;
            controller.handleCardClick(0, card);
            expect(game.ui.formatEffect).toHaveBeenCalled();
        });

        it('plays basic in combat when no strong modal', () => {
            const card = makeCard({ strongEffect: {} });
            game.hero.hand = [card];
            game.combat = { active: true };
            controller.handleCardClick(0, card);
            expect(game.combatOrchestrator.playCardInCombat).toHaveBeenCalledWith(0, card, false);
        });

        it('finishes basic play when no combat and no strong', () => {
            const card = makeCard({ strongEffect: {} });
            game.hero.hand = [card];
            game.actionManager.playCard.mockReturnValue({ card, effect: {} });
            controller.handleCardClick(0, card);
            expect(game.actionManager.playCard).toHaveBeenCalledWith(0, false, false);
        });
    });
});
