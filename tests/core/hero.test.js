import { describe, it, expect } from '../testRunner.js';
import { Hero, LEVEL_TABLE } from '../../js/hero.js';
import { assertHeroState, HeroBuilder } from '../test-helpers.js';

describe('Hero', () => {
    it('should initialize with correct stats', () => {
        const hero = new HeroBuilder().build();
        expect(hero.name).toBe('TestHero');
        assertHeroState(hero, {
            armor: 2,
            handSize: 0,
            level: 1,
            fame: 0,
            reputation: 0
        });
    });

    it('should draw cards up to hand limit', () => {
        const hero = new HeroBuilder().build();
        hero.drawCards();
        expect(hero.hand.length).toBe(5);
    });

    it('should take wounds correctly', () => {
        const hero = new HeroBuilder().build();
        hero.takeWound();
        expect(hero.wounds.length).toBe(1);
        expect(hero.hand.length).toBe(1); // Wound goes to hand
        expect(hero.hand[0].isWound()).toBe(true);
    });

    it('should heal wounds', () => {
        const hero = new HeroBuilder()
            .withStats({ healingPoints: 1 })
            .build();
        hero.takeWound();
        const healed = hero.healWound();
        expect(healed).toBe(true);
        expect(hero.wounds.length).toBe(0);
        expect(hero.healingPoints).toBe(0);
    });

    // === NEW EDGE CASE TESTS ===

    it('should NOT shuffle discard into deck automatically during round', () => {
        const hero = new HeroBuilder().build();
        hero.drawCards(); // Draw initial hand (5)
        hero.discard.push(...hero.hand);
        hero.hand = [];
        hero.deck = []; // Empty deck

        // Try to draw 3
        const drawnCards = hero.drawCards(3);

        // Should NOT draw anything because deck is empty and valid discard pile exists but shouldn't be touched
        expect(drawnCards.length).toBe(0);
        expect(hero.hand.length).toBe(0);
        expect(hero.deck.length).toBe(0);
        expect(hero.discard.length).toBe(5); // Discard pile untouched
    });

    it('should not draw from empty deck and discard', () => {
        const hero = new HeroBuilder()
            .withDeck([])
            .build();
        hero.discard = [];
        hero.hand = [];

        const card = hero.drawCard();
        expect(card).toBe(null);
        expect(hero.hand.length).toBe(0);
    });

    it('should handle playCard with invalid index', () => {
        const hero = new HeroBuilder().build();
        hero.drawCards();

        const result = hero.playCard(-1);
        expect(result).toBe(null);

        const result2 = hero.playCard(10);
        expect(result2).toBe(null);
    });

    it('should play card and apply effects', () => {
        const hero = new HeroBuilder().build();
        hero.drawCards();
        const initialHandSize = hero.hand.length;

        const result = hero.playCard(0, false);
        expect(result).not.toBe(null);
        expect(hero.hand.length).toBe(initialHandSize - 1);
        expect(hero.discard.length).toBe(1);
    });

    it('should handle sideways play for non-wound cards', () => {
        const hero = new HeroBuilder().build();
        hero.drawCards();
        const card = hero.hand.find(c => !c.isWound());
        const index = hero.hand.indexOf(card);

        const result = hero.playCardSideways(index, 'movement');
        expect(result).not.toBe(null);
        expect(result.effect.movement).toBe(1);
        expect(hero.movementPoints).toBe(1);
    });

    it('should not allow sideways play on wounds', () => {
        const hero = new HeroBuilder().build();
        hero.takeWound();
        const woundIndex = hero.hand.findIndex(c => c.isWound());

        const result = hero.playCardSideways(woundIndex, 'movement');
        expect(result).toBe(null);
    });

    it('should reset turn resources on endTurn', () => {
        const hero = new HeroBuilder()
            .withStats({
                movementPoints: 5,
                attackPoints: 3,
                blockPoints: 2,
                influencePoints: 4
            })
            .build();

        hero.endTurn();

        assertHeroState(hero, {
            movementPoints: 0,
            attackPoints: 0,
            blockPoints: 0,
            influencePoints: 0,
            handSize: 5
        });
    });

    it('should gain fame and detect level up', () => {
        const hero = new HeroBuilder()
            .withFame(5)
            .build();

        const result = hero.gainFame(5); // Total 10 -> Level 2
        expect(result.leveledUp).toBe(true);
        expect(result.newLevel).toBe(2);
        expect(hero.fame).toBe(10);
    });

    it('should not level up if fame below threshold', () => {
        const hero = new HeroBuilder()
            .withFame(5)
            .build();

        const result = hero.gainFame(2); // Total 7
        expect(result.leveledUp).toBe(false);
        expect(hero.fame).toBe(7);
    });

    it('should increase stats on levelUp', () => {
        const hero = new HeroBuilder().build();
        const initialArmor = hero.armor;
        const initialLimit = hero.handLimit;

        hero.level = 1;
        hero.levelUp(); // Level 2 (even)
        expect(hero.level).toBe(2);
        expect(hero.handLimit).toBe(initialLimit + 1);

        hero.levelUp(); // Level 3 (odd)
        expect(hero.level).toBe(3);
        expect(hero.commandLimit).toBe(2);
        expect(hero.armor).toBe(initialArmor + 1);
    });

    it('should clamp reputation between -7 and +7', () => {
        const hero = new HeroBuilder().build();

        hero.changeReputation(10);
        expect(hero.reputation).toBe(7);

        hero.changeReputation(-20);
        expect(hero.reputation).toBe(-7);
    });

    it('should calculate reputation modifier correctly', () => {
        const hero = new HeroBuilder().build();

        hero.reputation = 0;
        expect(hero.getReputationModifier()).toBe(0);

        hero.reputation = 3;
        expect(hero.getReputationModifier()).toBe(2);

        hero.reputation = -5;
        expect(hero.getReputationModifier()).toBe(-2);
    });

    it('should handle mana management', () => {
        const hero = new HeroBuilder().build();

        hero.takeManaFromSource('red');
        expect(hero.tempMana.length).toBe(1);
        expect(hero.hasMana('red')).toBe(true);

        const spent = hero.spendMana('red');
        expect(spent).toBe(true);
        expect(hero.tempMana.length).toBe(0);
    });

    it('should use gold mana as wildcard', () => {
        const hero = new HeroBuilder().build();

        hero.takeManaFromSource('gold');
        expect(hero.hasMana('red')).toBe(true);

        const spent = hero.spendMana('blue');
        expect(spent).toBe(true);
        expect(hero.tempMana.length).toBe(0);
    });

    it('should clear temp mana', () => {
        const hero = new HeroBuilder().build();
        hero.takeManaFromSource('red');
        hero.takeManaFromSource('blue');

        hero.clearTempMana();
        expect(hero.tempMana.length).toBe(0);
    });

    it('should handle multiple wounds', () => {
        const hero = new HeroBuilder().build();

        for (let i = 0; i < 3; i++) {
            hero.takeWound();
        }

        expect(hero.wounds.length).toBe(3);
        expect(hero.hand.length).toBe(3);

        hero.healingPoints = 2;
        hero.healWound();
        expect(hero.wounds.length).toBe(2);
        hero.healWound();
        expect(hero.wounds.length).toBe(1);
    });

    it('should not heal without healing points', () => {
        const hero = new HeroBuilder()
            .withStats({ healingPoints: 0 })
            .build();
        hero.takeWound();

        const healed = hero.healWound();
        expect(healed).toBe(false);
        expect(hero.wounds.length).toBe(1);
    });

    it('should manage units within command limit', () => {
        const hero = new HeroBuilder().build();
        const mockUnit = { name: 'Peasant' };

        expect(hero.commandLimit).toBe(1);
        const added = hero.addUnit(mockUnit);
        expect(added).toBe(true);
        expect(hero.units.length).toBe(1);

        const added2 = hero.addUnit({ name: 'Archer' });
        expect(added2).toBe(false); // Over limit
        expect(hero.units.length).toBe(1);
    });

    it('should validate skills acquisition', () => {
        const hero = new HeroBuilder().build();
        const skill = { id: 'test', name: 'Test Skill' };
        hero.addSkill(skill);
        expect(hero.skills.length).toBe(1);
        expect(hero.skills[0].name).toBe('Test Skill');
    });

    it('should learn spells and advanced actions', () => {
        const hero = new HeroBuilder().withStats({ influencePoints: 10 }).build();
        const spell = { name: 'Fireball', type: 'spell' };

        const result = hero.learnSpell(spell, 7);
        expect(result.success).toBe(true);
        expect(hero.discard.length).toBe(1);
        expect(hero.influencePoints).toBe(3);

        const action = { name: 'Stamina', type: 'advanced' };
        hero.learnAdvancedAction(action, 3);
        expect(hero.discard.length).toBe(2);
    });

    it('should fail learnSpell if influence is too low', () => {
        const hero = new HeroBuilder().withStats({ influencePoints: 2 }).build();
        const spell = { name: 'Fireball', type: 'spell' };
        const result = hero.learnSpell(spell, 5);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Nicht genug Einfluss.');
    });

    it('should manage crystals with limits', () => {
        const hero = new HeroBuilder().build();
        hero.crystals = { red: 2 };
        expect(hero.addCrystal('red')).toBe(true);
        expect(hero.addCrystal('red')).toBe(false); // Cap at 3
        expect(hero.crystals.red).toBe(3);

        expect(hero.useCrystal('red')).toBe(true);
        expect(hero.crystals.red).toBe(2);
        expect(hero.useCrystal('blue')).toBe(false);
    });
});
