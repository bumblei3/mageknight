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
    'inf_2': {
        id: 'inf_2',
        name: 'Noble Manners',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'influence', value: 2 },
        advancedEffect: { type: 'influence', value: 4 },
        image: 'noble_manners.png'
    },
    'unit_1': {
        id: 'unit_1',
        name: 'Call to Arms',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.WHITE,
        cost: 0,
        basicEffect: { type: 'influence', value: 2 },
        advancedEffect: { type: 'influence', value: 5, unitRecruitment: true },
        image: 'call_to_arms.png'
    },
    'atk_cha': {
        id: 'atk_cha',
        name: 'Savage Bite',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.RED,
        cost: 0,
        basicEffect: { type: 'attack', value: 2 },
        advancedEffect: { type: 'attack', value: 5 },
        image: 'savage_bite.png'
    },
    'chaos_1': {
        id: 'chaos_1',
        name: 'Burning Shield',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.RED,
        cost: 0,
        basicEffect: { type: 'block', value: 2 },
        advancedEffect: { type: 'block', value: 4, fireAttack: 2 },
        image: 'burning_shield.png'
    },
    'blk_tac': {
        id: 'blk_tac',
        name: 'Agility',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.BLUE,
        cost: 0,
        basicEffect: { type: 'block', value: 2 },
        advancedEffect: { type: 'block', value: 3, type2: 'move', value2: 2 },
        image: 'agility.png'
    },
    'tac_1': {
        id: 'tac_1',
        name: 'Cold Toughness',
        type: CARD_TYPES.ACTION,
        color: CARD_COLORS.BLUE,
        cost: 0,
        basicEffect: { type: 'block', value: 2 },
        advancedEffect: { type: 'block', value: 5, iceBlock: true },
        image: 'cold_toughness.png'
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
    },
    {
        id: 'ice_shield_spell',
        name: 'Ice Shield',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLUE,
        cost: 1,
        basicEffect: { type: 'block', value: 5, element: 'ice' },
        advancedEffect: { type: 'block', value: 10, element: 'ice' },
        image: 'ice_shield_spell.png'
    },
    {
        id: 'mana_storm',
        name: 'Mana Storm',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.GOLD,
        cost: 1,
        basicEffect: { type: 'mana_token', value: 2 },
        advancedEffect: { type: 'mana_token', value: 4 },
        image: 'mana_storm.png'
    },
    {
        id: 'dark_ritual',
        name: 'Dark Ritual',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLACK,
        cost: 1,
        basicEffect: { type: 'attack', value: 6, element: 'cold_fire' },
        advancedEffect: { type: 'attack', value: 10, element: 'cold_fire' },
        image: 'dark_ritual.png'
    },
    {
        id: 'shield_of_faith',
        name: 'Shield of Faith',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.WHITE,
        cost: 1,
        basicEffect: { type: 'block', value: 8 },
        advancedEffect: { type: 'block', value: 15 },
        image: 'shield_of_faith.png'
    },
    {
        id: 'stone_skin',
        name: 'Stone Skin',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.GREEN,
        cost: 1,
        basicEffect: { type: 'block', value: 4, element: 'physical' },
        advancedEffect: { type: 'block', value: 8, element: 'physical' },
        image: 'stone_skin.png'
    },
    {
        id: 'fire_blast',
        name: 'Fire Blast',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.RED,
        cost: 1,
        basicEffect: { type: 'attack', value: 7, element: 'fire' },
        advancedEffect: { type: 'attack', value: 12, element: 'fire', area: true },
        image: 'fire_blast.png'
    },
    {
        id: 'teleport',
        name: 'Teleport',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLUE,
        cost: 1,
        basicEffect: { type: 'move', value: 6 },
        advancedEffect: { type: 'move', value: 10 },
        image: 'teleport.png'
    },
    {
        id: 'disenchant',
        name: 'Disenchant',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLACK,
        cost: 1,
        basicEffect: { type: 'attack', value: 5, element: 'cold_fire', area: true },
        advancedEffect: { type: 'attack', value: 8, element: 'cold_fire', area: true },
        image: 'disenchant.png'
    },
    {
        id: 'summon_spell',
        name: 'Summon',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.GREEN,
        cost: 1,
        basicEffect: { type: 'summon_unit', value: 1 },
        advancedEffect: { type: 'summon_unit', value: 2 },
        image: 'summon.png'
    },
    {
        id: 'time_walk',
        name: 'Time Walk',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLUE,
        cost: 1,
        basicEffect: { type: 'extra_turn', value: 1 },
        advancedEffect: { type: 'extra_turn', value: 2 },
        image: 'time_walk.png'
    },
    {
        id: 'disintegrate',
        name: 'Disintegrate',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.BLACK,
        cost: 1,
        basicEffect: { type: 'destroy_enemy', value: 1 },
        advancedEffect: { type: 'destroy_enemy', value: 2 },
        image: 'disintegrate.png'
    },
    {
        id: 'wish',
        name: 'Wish',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.GOLD,
        cost: 1,
        basicEffect: { type: 'wish', value: 1 },
        advancedEffect: { type: 'wish', value: 2 },
        image: 'wish.png'
    },
    {
        id: 'meteor_storm',
        name: 'Meteor Storm',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.RED,
        cost: 1,
        basicEffect: { type: 'attack', value: 7, element: 'fire', area: true, target: 'all' },
        advancedEffect: { type: 'attack', value: 12, element: 'fire', area: true, target: 'all' },
        image: 'meteor_storm.png'
    },
    {
        id: 'healing_touch',
        name: 'Healing Touch',
        type: CARD_TYPES.SPELL,
        color: CARD_COLORS.WHITE,
        cost: 1,
        basicEffect: { type: 'heal', value: 5 },
        advancedEffect: { type: 'heal', value: 10, full_heal: true },
        image: 'healing_touch.png'
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
    },
    {
        id: 'crystal_of_insight',
        name: 'Crystal of Insight',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'mana_token', value: 2 },
        advancedEffect: { type: 'mana_token', value: 4 },
        description: 'Generates mana crystals.',
        image: 'crystal_of_insight.png'
    },
    {
        id: 'staff_of_asar',
        name: 'Staff of Asar',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 3, element: 'fire' },
        advancedEffect: { type: 'attack', value: 6, element: 'fire' },
        description: 'Channels fire magic.',
        image: 'staff_of_asar.png'
    },
    {
        id: 'dragon_heart',
        name: 'Dragon Heart',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 5, element: 'cold_fire' },
        advancedEffect: { type: 'attack', value: 10, element: 'cold_fire' },
        description: 'Grants cold fire attack.',
        image: 'dragon_heart.png'
    },
    {
        id: 'boots_of_flight',
        name: 'Boots of Flight',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'move', value: 4 },
        advancedEffect: { type: 'move', value: 8 },
        description: 'Allows rapid movement.',
        image: 'boots_of_flight.png'
    },
    {
        id: 'amulet_of_protection',
        name: 'Amulet of Protection',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'block', value: 6 },
        advancedEffect: { type: 'block', value: 12 },
        description: 'Provides strong protection.',
        image: 'amulet_of_protection.png'
    },
    {
        id: 'ring_of_power',
        name: 'Ring of Power',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 2, attack: 2, block: 2 },
        advancedEffect: { type: 'influence', value: 4, attack: 4, block: 4 },
        description: 'Boosts all abilities.',
        image: 'ring_of_power.png'
    },
    {
        id: 'banner_of_fear',
        name: 'Banner of Fear',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 5, condition: 'reputation_loss' },
        advancedEffect: { type: 'influence', value: 10, condition: 'reputation_loss' },
        description: 'Inspires fear, great influence.',
        image: 'banner_of_fear.png'
    },
    {
        id: 'circlet_of_command',
        name: 'Circlet of Command',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'command', value: 1 },
        advancedEffect: { type: 'command', value: 2 },
        description: 'Increases command limit.',
        image: 'circlet_of_command.png'
    },
    {
        id: 'rune_sword',
        name: 'Rune Sword',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 4, element: 'ice' },
        advancedEffect: { type: 'attack', value: 8, element: 'ice' },
        description: 'Cold steel strikes.',
        image: 'rune_sword.png'
    },
    {
        id: 'horn_of_valor',
        name: 'Horn of Valor',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 4, attack: 3 },
        advancedEffect: { type: 'influence', value: 8, attack: 6 },
        description: 'Rallies troops for battle.',
        image: 'horn_of_valor.png'
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
    },

    // ============================================
    // ARTIFACTS (Gold cards - Equip for permanent effects)
    // ============================================
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
    },
    {
        id: 'crystal_of_insight',
        name: 'Crystal of Insight',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'mana_token', value: 2 },
        advancedEffect: { type: 'mana_token', value: 4 },
        description: 'Generates mana crystals.',
        image: 'crystal_of_insight.png'
    },
    {
        id: 'staff_of_asar',
        name: 'Staff of Asar',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 3, element: 'fire' },
        advancedEffect: { type: 'attack', value: 6, element: 'fire' },
        description: 'Channels fire magic.',
        image: 'staff_of_asar.png'
    },
    {
        id: 'dragon_heart',
        name: 'Dragon Heart',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 5, element: 'cold_fire' },
        advancedEffect: { type: 'attack', value: 10, element: 'cold_fire' },
        description: 'Grants cold fire attack.',
        image: 'dragon_heart.png'
    },
    {
        id: 'boots_of_flight',
        name: 'Boots of Flight',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'move', value: 4 },
        advancedEffect: { type: 'move', value: 8 },
        description: 'Allows rapid movement.',
        image: 'boots_of_flight.png'
    },
    {
        id: 'amulet_of_protection',
        name: 'Amulet of Protection',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'block', value: 6 },
        advancedEffect: { type: 'block', value: 12 },
        description: 'Provides strong protection.',
        image: 'amulet_of_protection.png'
    },
    {
        id: 'ring_of_power',
        name: 'Ring of Power',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 2, attack: 2, block: 2 },
        advancedEffect: { type: 'influence', value: 4, attack: 4, block: 4 },
        description: 'Boosts all abilities.',
        image: 'ring_of_power.png'
    },
    {
        id: 'banner_of_fear',
        name: 'Banner of Fear',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 5, condition: 'reputation_loss' },
        advancedEffect: { type: 'influence', value: 10, condition: 'reputation_loss' },
        description: 'Inspires fear, great influence.',
        image: 'banner_of_fear.png'
    },
    {
        id: 'circlet_of_command',
        name: 'Circlet of Command',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'command', value: 1 },
        advancedEffect: { type: 'command', value: 2 },
        description: 'Increases command limit.',
        image: 'circlet_of_command.png'
    },
    {
        id: 'rune_sword',
        name: 'Rune Sword',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'attack', value: 4, element: 'ice' },
        advancedEffect: { type: 'attack', value: 8, element: 'ice' },
        description: 'Cold steel strikes.',
        image: 'rune_sword.png'
    },
    {
        id: 'horn_of_valor',
        name: 'Horn of Valor',
        type: CARD_TYPES.ARTIFACT,
        color: CARD_COLORS.GOLD,
        cost: 0,
        basicEffect: { type: 'influence', value: 4, attack: 3 },
        advancedEffect: { type: 'influence', value: 8, attack: 6 },
        description: 'Rallies troops for battle.',
        image: 'horn_of_valor.png'
    }
];
