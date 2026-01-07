/**
 * Card System for Mage Knight
 * Re-exports from modular components for backward compatibility
 */

// Re-export definitions
export {
    CARD_COLORS,
    CARD_TYPES,
    GOLDYX_STARTER_DECK,
    SAMPLE_SPELLS,
    SAMPLE_ARTIFACTS,
    SAMPLE_ADVANCED_ACTIONS
} from './card/CardDefinitions.js';

// Re-export factory functions and Card class
export {
    Card,
    createDeck,
    shuffleDeck,
    createWoundCard
} from './card/CardFactory.js';

// Re-export types separately
export type { CardData, CardEffect } from './card/CardFactory.js';
