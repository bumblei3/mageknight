/**
 * Card System for Mage Knight
 * Re-exports from modular components for backward compatibility
 */

// Re-export definitions
// Re-export definitions
export {
    GOLDYX_STARTER_DECK,
    SAMPLE_SPELLS,
    SAMPLE_ARTIFACTS,
    SAMPLE_ADVANCED_ACTIONS
} from './card/CardDefinitions';

export {
    CARD_COLORS,
    CARD_TYPES
} from './constants';

// Re-export factory functions and Card class
export {
    Card,
    createDeck,
    shuffleDeck,
    createWoundCard
} from './card/CardFactory';

// Re-export types separately
export type { CardData, CardEffect } from './card/CardFactory';
