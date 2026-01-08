/**
 * CardFactory - Card creation functions and Card class
 */
import { CARD_TYPES } from '../constants';
import { CARD_DEFINITIONS } from './CardDefinitions';

export interface CardEffect {
    type?: string;
    value?: number;
    description?: string;
    movement?: number;
    attack?: number;
    block?: number;
    influence?: number;
    healing?: number;
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

    constructor(data: CardData & { advancedEffect?: CardEffect }) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type || CARD_TYPES.ACTION;
        this.color = data.color;

        // Normalize basic effect
        this.basicEffect = this.normalizeEffect(data.basicEffect || {});

        // Handle both strongEffect and advancedEffect naming
        const strongSource = data.strongEffect || data.advancedEffect || {};
        this.strongEffect = this.normalizeEffect(strongSource);

        this.manaCost = data.manaCost || 0;
        this.description = data.description || '';
    }

    private normalizeEffect(effect: CardEffect): CardEffect {
        if (!effect) return {};

        const normalized = { ...effect };

        // Map common type-based effects to direct property effects used by Hero/UI
        if (effect.type === 'move' && effect.value !== undefined) {
            normalized.movement = effect.value;
        } else if (effect.type === 'attack' && effect.value !== undefined) {
            normalized.attack = effect.value;
        } else if (effect.type === 'block' && effect.value !== undefined) {
            normalized.block = effect.value;
        } else if (effect.type === 'influence' && effect.value !== undefined) {
            normalized.influence = effect.value;
        } else if (effect.type === 'heal' && effect.value !== undefined) {
            normalized.healing = effect.value;
        }

        return normalized;
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
// Create a deck from card definitions

// ... (Card Class above stays same)

// Create a deck from card definitions or IDs
export function createDeck(cardDefinitions: (Partial<CardData> | string)[]): Card[] {
    return cardDefinitions.map((def, index) => {
        let data: Partial<CardData>;
        if (typeof def === 'string') {
            data = CARD_DEFINITIONS[def];
            if (!data) {
                console.warn(`Card definition not found for ID: ${def}`);
                data = { id: def, name: 'Unknown Card' };
            }
        } else {
            data = def;
        }

        return new Card({
            ...data,
            id: data.id || `card_${index}`,
            name: data.name || 'Unknown',
            color: data.color ?? null
        });
    });
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
