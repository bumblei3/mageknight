import { describe, it, expect } from '../testRunner.js';
import { Card } from '../../js/card.js';

describe('Card System', () => {
    it('should create a basic action card', () => {
        const card = new Card({
            name: 'March',
            color: 'green',
            basicEffect: { movement: 2 },
            strongEffect: { movement: 4 },
            manaCost: 1
        });

        expect(card.name).toBe('March');
        expect(card.color).toBe('green');
        expect(card.manaCost).toBe(1);
    });

    it('should get basic effect', () => {
        const card = new Card({
            name: 'Strike',
            color: 'red',
            basicEffect: { attack: 3 },
            strongEffect: { attack: 6 },
            manaCost: 1
        });

        const effect = card.getEffect(false);

        expect(effect.attack).toBe(3);
    });

    it('should get strong effect', () => {
        const card = new Card({
            name: 'Strike',
            color: 'red',
            basicEffect: { attack: 3 },
            strongEffect: { attack: 6 },
            manaCost: 1
        });

        const effect = card.getEffect(true);

        expect(effect.attack).toBe(6);
    });

    it('should allow sideways play for basic cards', () => {
        const card = new Card({
            name: 'March',
            color: 'green',
            basicEffect: { movement: 2 },
            strongEffect: { movement: 4 },
            manaCost: 1,
            type: 'action'
        });

        expect(card.canPlaySideways()).toBe(true);
    });

    it('should not allow sideways play for wound cards', () => {
        const woundCard = new Card({
            name: 'Wound',
            type: 'wound',
            basicEffect: {},
            strongEffect: {},
            manaCost: 0
        });

        expect(woundCard.canPlaySideways()).toBe(false);
    });

    it('should handle cards with multiple effect types', () => {
        const card = new Card({
            name: 'Versatile',
            color: 'blue',
            basicEffect: { movement: 1, attack: 1 },
            strongEffect: { movement: 2, attack: 3 },
            manaCost: 1
        });

        const basicEffect = card.getEffect(false);
        expect(basicEffect.movement).toBe(1);
        expect(basicEffect.attack).toBe(1);

        const strongEffect = card.getEffect(true);
        expect(strongEffect.movement).toBe(2);
        expect(strongEffect.attack).toBe(3);
    });

    it('should have color attribute', () => {
        const redCard = new Card({ name: 'FireBlast', color: 'red', basicEffect: { attack: 4 }, strongEffect: { attack: 7 }, manaCost: 1 });
        const blueCard = new Card({ name: 'IceShield', color: 'blue', basicEffect: { block: 3 }, strongEffect: { block: 6 }, manaCost: 1 });

        expect(redCard.color).toBe('red');
        expect(blueCard.color).toBe('blue');
    });

    it('should have mana cost', () => {
        const card1 = new Card({ name: 'Weak', color: 'green', basicEffect: { movement: 1 }, strongEffect: { movement: 2 }, manaCost: 0 });
        const card2 = new Card({ name: 'Strong', color: 'red', basicEffect: { attack: 2 }, strongEffect: { attack: 5 }, manaCost: 2 });

        expect(card1.manaCost).toBe(0);
        expect(card2.manaCost).toBe(2);
    });
});
