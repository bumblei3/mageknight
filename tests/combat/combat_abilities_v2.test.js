
import { describe, it, expect, beforeEach } from '../testRunner.js';
import { createSpy } from '../test-mocks.js';
import { Combat } from '../../js/combat.js';
import { Hero } from '../../js/hero.js';
import { Enemy } from '../../js/enemy.js';
import { ATTACK_ELEMENTS } from '../../js/constants.js';

describe('Advanced Combat Abilities V2', () => {
    let hero;
    let combat;

    beforeEach(() => {
        hero = new Hero('Test Hero');
        hero.armor = 2;
        hero.hand = [];
        hero.deck = [];
        hero.discard = [];
    });

    it('1. Assassinate: prevents assigning damage to units', () => {
        const assassin = new Enemy({ name: 'Assassin', attack: 3, assassin: true });
        combat = new Combat(hero, [assassin]);
        combat.phase = 'damage';

        const unit = { getName: () => 'Test Unit', takeWound: createSpy(), wounds: 0, isReady: () => true };
        const result = combat.assignDamageToUnit(unit, assassin);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Attentäter');
        expect(unit.takeWound.called).toBe(false);
    });

    it('2. Paralyze (Hero): hero discards one non-wound card per wound received', () => {
        const spider = new Enemy({ name: 'Giant Spider', attack: 3, petrify: true });
        combat = new Combat(hero, [spider]);

        // Setup hero hand with 3 non-wound cards
        hero.hand = [
            { isWound: () => false, name: 'Card 1' },
            { isWound: () => false, name: 'Card 2' },
            { isWound: () => false, name: 'Card 3' }
        ];

        combat.phase = 'damage';
        const result = combat.damagePhase();

        // Attack 3 vs Armor 2 = 2 wounds
        expect(result.woundsReceived).toBe(2);
        expect(result.paralyzeTriggered).toBe(true);

        // Hero takes 2 wounds to hand
        expect(hero.hand.length).toBe(5);

        // Handle paralyze
        const discarded = combat.handleParalyzeEffect();
        expect(discarded).toBe(2);
        expect(hero.hand.filter(c => !c.isWound()).length).toBe(1);
    });

    it('3. Paralyze (Unit): unit is destroyed instantly', () => {
        const spider = new Enemy({ name: 'Giant Spider', attack: 3, petrify: true });
        combat = new Combat(hero, [spider]);
        combat.phase = 'damage';

        const unit = { getName: () => 'Test Unit', takeWound: createSpy(), wounds: 0, destroyed: false };
        const result = combat.assignDamageToUnit(unit, spider);

        expect(result.success).toBe(true);
        expect(unit.destroyed).toBe(true);
        expect(unit.takeWound.called).toBe(false);
    });

    it('4. Vampirism: enemy gains armor bonus when hero is wounded', () => {
        const vampire = new Enemy({ name: 'Vampire', attack: 3, vampiric: true, armor: 4 });
        combat = new Combat(hero, [vampire]);
        combat.phase = 'damage';

        const result = combat.damagePhase();

        // Hero takes 2 wounds
        expect(result.woundsReceived).toBe(2);
        expect(vampire.armorBonus).toBe(2);
        expect(vampire.getCurrentArmor()).toBe(6);
    });

    it('5. Vampirism: enemy gains armor bonus when unit is wounded/destroyed', () => {
        const vampire = new Enemy({ name: 'Vampire', attack: 3, vampiric: true, armor: 4 });
        combat = new Combat(hero, [vampire]);
        combat.phase = 'damage';

        const unit = { getName: () => 'Test Unit', takeWound: createSpy(), wounds: 0, destroyed: false };
        combat.assignDamageToUnit(unit, vampire);

        expect(vampire.armorBonus).toBeGreaterThan(0);
        expect(vampire.getCurrentArmor()).toBeGreaterThan(4);
    });

    it('6. Cumbersome: spending movement points reduces block requirement', () => {
        const golem = new Enemy({ name: 'Golem', attack: 6, cumbersome: true });
        combat = new Combat(hero, [golem]);
        combat.phase = 'block';

        // Spend 3 move. Block req becomes 3.
        const result = combat.blockEnemy(golem, { value: 3, element: 'physical' }, 3);

        expect(result.success).toBe(true);
        expect(result.blocked).toBe(true);
        expect(combat.blockedEnemies.has(golem.id)).toBe(true);
    });

    it('7. Elusive: armor is lower in attack phase if blocked', () => {
        const bird = new Enemy({ id: 'b1', name: 'Elusive Bird', armor: 5, lowerArmor: 2, elusive: true });
        combat = new Combat(hero, bird);

        expect(bird.getCurrentArmor(false, false)).toBe(5);
        combat.phase = 'block';
        combat.blockedEnemies.add(bird.id);
        expect(bird.getCurrentArmor(true, true)).toBe(2);
        combat.blockedEnemies.clear();
        expect(bird.getCurrentArmor(false, true)).toBe(5);
    });
});
