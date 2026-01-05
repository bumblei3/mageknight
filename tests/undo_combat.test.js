
import { describe, it, expect, beforeEach } from './testRunner.js';
import { Hero } from '../js/hero.js';
import { Enemy } from '../js/enemy.js';
import { Combat } from '../js/combat.js';
import { CombatOrchestrator } from '../js/game/CombatOrchestrator.js';
import { ActionManager } from '../js/game/ActionManager.js';
import { ManaSource } from '../js/mana.js';

// Mock Game
class MockGame {
    constructor() {
        this.hero = new Hero('Test Hero');
        this.hero.hand = []; // Clear default starter
        this.manaSource = new ManaSource();
        this.timeManager = { isNight: () => false, isDay: () => true };
        this.ui = {
            updateCombatInfo: () => { },
            renderUnitsInCombat: () => { },
            addPlayedCard: () => { },
            showPlayArea: () => { },
            hideCombatPanel: () => { },
            formatEffect: () => '',
            updateHeroMana: () => { },
            updateCombatTotals: () => { },
            elements: { playedCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0 }) } }
        };
        this.hexGrid = { axialToPixel: () => ({ x: 0, y: 0 }) };
        this.particleSystem = { playCardEffect: () => { }, impactEffect: () => { }, createDamageNumber: () => { } };
        this.addLog = () => { };
        this.renderHand = () => { };
        this.renderMana = () => { };
        this.render = () => { };
        this.updateStats = () => { };
        this.showToast = () => { };
        this.updatePhaseIndicator = () => { };

        this.actionManager = new ActionManager(this);
        this.combatOrchestrator = new CombatOrchestrator(this);
    }

    startCombat(enemy) {
        this.combat = new Combat(this.hero, [enemy]);
        this.combat.start();
        // Manually link orchestrator (usually done in Game.initiateCombat)
        this.gameState = 'combat';
    }
}

describe('Undo in Combat', () => {
    let game;
    let hero;
    let enemy;

    beforeEach(() => {
        game = new MockGame();
        hero = game.hero;
        enemy = new Enemy({ name: 'Orc', attack: 3, armor: 3, id: 'orc_1' });

        // Add a Block card to hand
        hero.hand = [{
            name: 'Block Card',
            color: 'blue',
            isWound: () => false,
            getEffect: () => ({ block: 2, element: 'ice' }),
            clone: function () { return this; }
        }];

        game.startCombat(enemy);
        game.combat.phase = 'block'; // Force block phase
    });

    it('should save checkpoint and undo card play in block phase', () => {
        const cardIndex = 0;

        // 1. Play Card
        game.combatOrchestrator.playCardInCombat(cardIndex, hero.hand[0]);

        // Verify played
        expect(game.combatOrchestrator.combatBlockTotal).toBe(2);
        expect(hero.hand.length).toBe(0);
        expect(game.actionManager.history.length).toBe(1);

        // 2. Undo
        game.actionManager.undoLastAction();

        // Verify restored
        expect(game.combatOrchestrator.combatBlockTotal).toBe(0);
        expect(hero.hand.length).toBe(1);
        expect(hero.hand[0].name).toBe('Block Card');
        expect(game.actionManager.history.length).toBe(0);
    });

    it('should clear history when block phase ends', () => {
        // Play card
        game.combatOrchestrator.playCardInCombat(0, hero.hand[0]);
        expect(game.actionManager.history.length).toBe(1);

        // End Block Phase (Committing)
        // Mock blockEnemy to return result
        game.combat.blockEnemy = () => ({ success: true, blocked: false });
        game.combat.endBlockPhase = () => ({ woundsReceived: 0, message: 'Done' });

        game.combatOrchestrator.endBlockPhase();

        // Verify history cleared
        expect(game.actionManager.history.length).toBe(0);

        // Try Undo -> Should fail/do nothing
        game.actionManager.undoLastAction();
        expect(game.combatOrchestrator.combatBlockTotal).toBe(0); // Reset by phase end anyway
    });
});
