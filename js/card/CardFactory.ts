/**
 * CardFactory - Card creation functions and Card class
 */
import { CARD_TYPES } from './CardDefinitions.js';

export interface CardEffect {
    type?: string;
    value?: number;
    description?: string;
    [key: string]: unknown;
}

export interface CardData {
    id: string;
    name: string;
    type?: string;
    color: string | null;
    basicEffect?: CardEffect;
    strongEffect?: CardEffect;
    manaCost?: number;
    description?: string;
}

export class Card {
    id: string;
    name: string;
    type: string;
    color: string | null;
    basicEffect: CardEffect;
    strongEffect: CardEffect;
    manaCost: number;
    description: string;

    constructor(data: CardData) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type || CARD_TYPES.ACTION;
        this.color = data.color;
        this.basicEffect = data.basicEffect || {};
        this.strongEffect = data.strongEffect || {};
        this.manaCost = data.manaCost || 0;
        this.description = data.description || '';
    }

    getEffect(useStrong = false): CardEffect {
        return useStrong ? this.strongEffect : this.basicEffect;
    }

    canPlaySideways(): boolean {
        return this.type !== CARD_TYPES.WOUND && this.type !== CARD_TYPES.ARTIFACT;
    }

    isWound(): boolean {
        return this.type === CARD_TYPES.WOUND;
    }

    clone(): Card {
        return new Card({
            id: this.id,
            name: this.name,
            type: this.type,
            color: this.color,
            basicEffect: { ...this.basicEffect },
            strongEffect: { ...this.strongEffect },
            manaCost: this.manaCost,
            description: this.description
        });
    }
}

// Create a deck from card definitions
export function createDeck(cardDefinitions: Partial<CardData>[]): Card[] {
    return cardDefinitions.map((def, index) => new Card({
        ...def,
        id: def.id || `card_${index}`,
        name: def.name || 'Unknown',
        color: def.color ?? null
    }));
}

// Shuffle a deck (Fisher-Yates)
export function shuffleDeck<T>(deck: T[]): T[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create wound card
export function createWoundCard(): Card {
    return new Card({
        id: `wound_${Date.now()}`,
        name: 'Verletzung',
        type: CARD_TYPES.WOUND,
        color: null,
        description: 'Blockiert eine Karte in deiner Hand'
    });
}
