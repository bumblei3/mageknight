import { describe, it, expect } from 'vitest';
import { CARD_DEFINITIONS, GOLDYX_STARTER_DECK, NOROWAS_STARTER_DECK, ARYTHEA_STARTER_DECK, TOVAK_STARTER_DECK } from '../../js/card/CardDefinitions';

describe('Starter Deck Definitions', () => {
    const decks = [
        { name: 'Goldyx', deck: GOLDYX_STARTER_DECK },
        { name: 'Norowas', deck: NOROWAS_STARTER_DECK },
        { name: 'Arythea', deck: ARYTHEA_STARTER_DECK },
        { name: 'Tovak', deck: TOVAK_STARTER_DECK }
    ];

    decks.forEach(({ name, deck }) => {
        it(`should have all card definitions for ${name} starter deck`, () => {
            deck.forEach(cardId => {
                expect(CARD_DEFINITIONS[cardId], `Missing definition for card ID: ${cardId} in ${name}'s deck`).toBeDefined();
            });
        });
    });
});
