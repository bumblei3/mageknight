import { describe, it, expect } from 'vitest';
import { Card } from '../../js/card/CardFactory';

describe('Card Normalization', () => {
    it('should normalize basic "move" type to "movement" property', () => {
        const card = new Card({
            id: 'test_move',
            name: 'Test Move',
            color: 'green',
            basicEffect: { type: 'move', value: 2 }
        });

        expect(card.basicEffect.movement).toBe(2);
    });

    it('should map advancedEffect to strongEffect and normalize it', () => {
        const card = new Card({
            id: 'test_move_strong',
            name: 'Test Move Strong',
            color: 'green',
            advancedEffect: { type: 'move', value: 4 }
        });

        expect(card.strongEffect.movement).toBe(4);
    });

    it('should normalize other effect types (attack, block, influence, heal)', () => {
        const cardAtk = new Card({
            id: 'atk', name: 'Atk', color: 'red',
            basicEffect: { type: 'attack', value: 3 }
        });
        const cardBlk = new Card({
            id: 'blk', name: 'Blk', color: 'blue',
            basicEffect: { type: 'block', value: 3 }
        });
        const cardInf = new Card({
            id: 'inf', name: 'Inf', color: 'white',
            basicEffect: { type: 'influence', value: 3 }
        });
        const cardHeal = new Card({
            id: 'heal', name: 'Heal', color: 'green',
            basicEffect: { type: 'heal', value: 3 }
        });

        expect(cardAtk.basicEffect.attack).toBe(3);
        expect(cardBlk.basicEffect.block).toBe(3);
        expect(cardInf.basicEffect.influence).toBe(3);
        expect(cardHeal.basicEffect.healing).toBe(3);
    });
});
