import { CARD_TYPES, CARD_COLORS } from '../constants';

export const CARD_DEFINITIONS: Record<string, any> = {
    'rage': {
        id: 'rage',
        name: 'Rage',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.RED,
        cost: 0,
        basicEffect: { type: 'attack', value: 2 },
        advancedEffect: { type: 'attack', value: 4 },
        image: 'rage.png'
    },
    'determination': {
        id: 'determination',
        name: 'Determination',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.BLUE,
        cost: 0,
        basicEffect: { type: 'block', value: 2 },
        advancedEffect: { type: 'block', value: 5 },
        image: 'determination.png'
    },
    'swiftness': {
        id: 'swiftness',
        name: 'Swiftness',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'move', value: 2 },
        advancedEffect: { type: 'move', value: 4 },
        image: 'swiftness.png'
    },
    'march': {
        id: 'march',
        name: 'March',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.GREEN,
        cost: 0,
        basicEffect: { type: 'move', value: 2 },
        advancedEffect: { type: 'move', value: 4 },
        image: 'march.png'
    },
    'stamina': {
        id: 'stamina',
        name: 'Stamina',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.GREEN,
        cost: 0,
        basicEffect: { type: 'move', value: 2 },
        advancedEffect: { type: 'move', value: 4 },
        image: 'stamina.png'
    },
    'tranquility': {
        id: 'tranquility',
        name: 'Tranquility',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.GREEN,
        cost: 0,
        basicEffect: { type: 'heal', value: 1 },
        advancedEffect: { type: 'heal', value: 2 },
        image: 'tranquility.png'
    },
    'promise': {
        id: 'promise',
        name: 'Promise',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'influence', value: 2 },
        advancedEffect: { type: 'influence', value: 5 },
        image: 'promise.png'
    },
    'threaten': {
        id: 'threaten',
        name: 'Threaten',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.RED,
        cost: 0,
        basicEffect: { type: 'influence', value: 2, condition: 'reputation_loss' },
        advancedEffect: { type: 'influence', value: 5, condition: 'reputation_loss' },
        image: 'threaten.png'
    },
    'crystallize': {
        id: 'crystallize',
        name: 'Crystallize',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.BLUE,
        cost: 0,
        basicEffect: { type: 'crystal', value: 1 },
        advancedEffect: { type: 'crystal', value: 3 },
        image: 'crystallize.png'
    },
    'mana_draw': {
        id: 'mana_draw',
        name: 'Mana Draw',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'mana_token', value: 1 },
        advancedEffect: { type: 'mana_token', value: 2 },
        image: 'mana_draw.png'
    },
    'concentrate': {
        id: 'concentrate',
        name: 'Concentrate',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'enhance_next', value: 2 },
        advancedEffect: { type: 'enhance_next', value: 5 },
        image: 'concentrate.png'
    },
    'wound': {
        id: 'wound',
        name: 'Wound',
        type: CARD_TYPES.WOUND,
        color: CARD_COLORS.GREY,
        cost: 0,
        basicEffect: { type: 'none' },
        advancedEffect: { type: 'none' },
        image: 'wound.png'
    }
};

export const GOLDYX_STARTER_DECK = [
    'rage', 'determination', 'swiftness', 'march', 'stamina',
    'tranquility', 'promise', 'threaten', 'crystallize', 'mana_draw',
    'concentrate', 'march', 'swiftness', 'determination', 'rage' // 15 cards usually, adding some duplicates for filler
];

export const NOROWAS_STARTER_DECK = [
    'rage', 'determination', 'swiftness', 'march', 'stamina',
    'tranquility', 'promise', 'threaten', 'crystallize', 'mana_draw',
    'inf_2', 'unit_1', 'march', 'swiftness', 'determination' // Includes unique cards
];
export const ARYTHEA_STARTER_DECK = [
    'rage', 'determination', 'swiftness', 'march', 'stamina',
    'tranquility', 'promise', 'threaten', 'crystallize', 'mana_draw',
    'atk_cha', 'chaos_1', 'march', 'swiftness', 'determination' // Includes unique cards
];
export const TOVAK_STARTER_DECK = [
    'rage', 'determination', 'swiftness', 'march', 'stamina',
    'tranquility', 'promise', 'threaten', 'crystallize', 'mana_draw',
    'blk_tac', 'tac_1', 'march', 'swiftness', 'determination' // Includes unique cards
];

export const SAMPLE_SPELLS: any[] = [
    {
        id: 'flame_wave',
        name: 'Flame Wave',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.RED,
        cost: 1, // Mana cost usually
        basicEffect: { type: 'attack', value: 4, element: 'fire', area: true },
        advancedEffect: { type: 'attack', value: 8, element: 'fire', area: true },
        image: 'flame_wave.png'
    },
    {
        id: 'healing_light',
        name: 'Healing Light',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.WHITE,
        cost: 1,
        basicEffect: { type: 'heal', value: 2 },
        advancedEffect: { type: 'heal', value: 5 },
        image: 'healing_light.png'
    }
];

export const SAMPLE_ARTIFACTS: any[] = [
    {
        id: 'banner_of_glory',
        name: 'Banner of Glory',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 3 },
        advancedEffect: { type: 'influence', value: 6 },
        description: 'Grants massive influence.',
        image: 'banner_of_glory.png'
    },
    {
        id: 'soul_stealer',
        name: 'Soul Stealer',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 4, vampirism: true },
        advancedEffect: { type: 'attack', value: 8, vampirism: true },
        description: 'Steals life from enemies.',
        image: 'soul_stealer.png'
    }
];
export const SAMPLE_ADVANCED_ACTIONS: any[] = [
    {
        id: 'fireball_action',
        name: 'Fireball',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.RED,
        cost: 0,
        basicEffect: { type: 'attack', value: 3, element: 'fire' },
        advancedEffect: { type: 'attack', value: 5, element: 'fire' },
        image: 'fireball.png'
    },
    {
        id: 'ice_shield',
        name: 'Ice Shield',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.BLUE,
        cost: 0,
        basicEffect: { type: 'block', value: 3, element: 'ice' },
        advancedEffect: { type: 'block', value: 6, element: 'ice' },
        image: 'ice_shield.png'
    },
    {
        id: 'refresh',
        name: 'Refresh',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.GREEN,
        cost: 0,
        basicEffect: { type: 'heal', value: 2 },
        advancedEffect: { type: 'heal', value: 4 },
        image: 'refresh.png'
    }
];
