// Card system for Mage Knight

export const CARD_COLORS = {
    RED: 'red',
    BLUE: 'blue',
    WHITE: 'white',
    GREEN: 'green'
};

export const CARD_TYPES = {
    ACTION: 'action',
    SPELL: 'spell',
    ARTIFACT: 'artifact',
    WOUND: 'wound'
};

export class Card {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type || CARD_TYPES.ACTION;
        this.color = data.color;
        this.basicEffect = data.basicEffect || {};
        this.strongEffect = data.strongEffect || {};
        this.manaCost = data.manaCost || 0;
        this.description = data.description || '';
    }

    // Get the effect based on whether mana is used
    getEffect(useStrong = false) {
        return useStrong ? this.strongEffect : this.basicEffect;
    }

    // Check if card can be played sideways for basic effects
    canPlaySideways() {
        return this.type === CARD_TYPES.ACTION && !this.isWound();
    }

    isWound() {
        return this.type === CARD_TYPES.WOUND;
    }

    // Clone this card
    clone() {
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

// Define Goldyx's starter deck (simplified version)
export const GOLDYX_STARTER_DECK = [
    // Movement cards (Green)
    {
        id: 'move_1',
        name: 'Marsch',
        color: CARD_COLORS.GREEN,
        basicEffect: { movement: 2 },
        strongEffect: { movement: 4 },
        manaCost: 1,
        description: 'Basic: +2 Bewegung | Strong: +4 Bewegung'
    },
    {
        id: 'move_2',
        name: 'Marsch',
        color: CARD_COLORS.GREEN,
        basicEffect: { movement: 2 },
        strongEffect: { movement: 4 },
        manaCost: 1,
        description: 'Basic: +2 Bewegung | Strong: +4 Bewegung'
    },
    {
        id: 'move_3',
        name: 'Marsch',
        color: CARD_COLORS.GREEN,
        basicEffect: { movement: 2 },
        strongEffect: { movement: 4 },
        manaCost: 1,
        description: 'Basic: +2 Bewegung | Strong: +4 Bewegung'
    },
    {
        id: 'move_4',
        name: 'Schneller Marsch',
        color: CARD_COLORS.GREEN,
        basicEffect: { movement: 3 },
        strongEffect: { movement: 6 },
        manaCost: 1,
        description: 'Basic: +3 Bewegung | Strong: +6 Bewegung'
    },

    // Influence cards (White)
    {
        id: 'inf_1',
        name: 'Diplomatie',
        color: CARD_COLORS.WHITE,
        basicEffect: { influence: 2 },
        strongEffect: { influence: 5 },
        manaCost: 1,
        description: 'Basic: +2 Einfluss | Strong: +5 Einfluss'
    },
    {
        id: 'inf_2',
        name: 'Diplomatie',
        color: CARD_COLORS.WHITE,
        basicEffect: { influence: 2 },
        strongEffect: { influence: 5 },
        manaCost: 1,
        description: 'Basic: +2 Einfluss | Strong: +5 Einfluss'
    },
    {
        id: 'inf_3',
        name: 'Versprechen',
        color: CARD_COLORS.WHITE,
        basicEffect: { influence: 3 },
        strongEffect: { influence: 7 },
        manaCost: 1,
        description: 'Basic: +3 Einfluss | Strong: +7 Einfluss'
    },

    // Attack cards (Red)
    {
        id: 'atk_1',
        name: 'Angriff',
        color: CARD_COLORS.RED,
        basicEffect: { attack: 2 },
        strongEffect: { attack: 5 },
        manaCost: 1,
        description: 'Basic: +2 Angriff | Strong: +5 Angriff'
    },
    {
        id: 'atk_2',
        name: 'Angriff',
        color: CARD_COLORS.RED,
        basicEffect: { attack: 2 },
        strongEffect: { attack: 5 },
        manaCost: 1,
        description: 'Basic: +2 Angriff | Strong: +5 Angriff'
    },
    {
        id: 'atk_3',
        name: 'Angriff',
        color: CARD_COLORS.RED,
        basicEffect: { attack: 2 },
        strongEffect: { attack: 5 },
        manaCost: 1,
        description: 'Basic: +2 Angriff | Strong: +5 Angriff'
    },
    {
        id: 'atk_4',
        name: 'Wilder Angriff',
        color: CARD_COLORS.RED,
        basicEffect: { attack: 3 },
        strongEffect: { attack: 6 },
        manaCost: 1,
        description: 'Basic: +3 Angriff | Strong: +6 Angriff'
    },

    // Block cards (Blue)
    {
        id: 'blk_1',
        name: 'Verteidigung',
        color: CARD_COLORS.BLUE,
        basicEffect: { block: 2 },
        strongEffect: { block: 5 },
        manaCost: 1,
        description: 'Basic: +2 Block | Strong: +5 Block'
    },
    {
        id: 'blk_2',
        name: 'Verteidigung',
        color: CARD_COLORS.BLUE,
        basicEffect: { block: 2 },
        strongEffect: { block: 5 },
        manaCost: 1,
        description: 'Basic: +2 Block | Strong: +5 Block'
    },
    {
        id: 'blk_3',
        name: 'Verteidigung',
        color: CARD_COLORS.BLUE,
        basicEffect: { block: 2 },
        strongEffect: { block: 5 },
        manaCost: 1,
        description: 'Basic: +2 Block | Strong: +5 Block'
    },
    {
        id: 'blk_4',
        name: 'Konzentration',
        color: CARD_COLORS.BLUE,
        basicEffect: { block: 3 },
        strongEffect: { block: 7 },
        manaCost: 1,
        description: 'Basic: +3 Block | Strong: +7 Block'
    },

    // Healing card
    {
        id: 'heal_1',
        name: 'Meditation',
        color: CARD_COLORS.WHITE,
        basicEffect: { healing: 1 },
        strongEffect: { healing: 2 },
        manaCost: 1,
        description: 'Basic: +1 Heilung | Strong: +2 Heilung'
    }
];

// Create a deck from card definitions
export function createDeck(cardDefinitions) {
    return cardDefinitions.map((def, index) => new Card({
        ...def,
        id: def.id || `card_${index}`
    }));
}

// Shuffle a deck
export function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create wound card
export function createWoundCard() {
    return new Card({
        id: `wound_${Date.now()}`,
        name: 'Verletzung',
        type: CARD_TYPES.WOUND,
        color: null,
        description: 'Blockiert eine Karte in deiner Hand'
    });
}
