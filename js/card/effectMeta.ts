/**
 * effectMeta — single source of truth for what a declared card effect means.
 *
 * Card data (`js/card/CardDefinitions.ts`) declares effects as
 * `{ type: 'move', value: 2 }` plus optional extra keys (`move: 2`,
 * `draw: 1`, `condition: 'reputation_loss'`, `type2`/`value2`, …).
 * Everything that *consumes* an effect (Hero.playCard, card tooltips, the
 * hand log, the play preview) works on direct properties: `movement`,
 * `attack`, `draw`, `mana`, `crystal`, `handLimitBonus`.
 *
 * `Card.normalizeEffect()` lifts the declared keys onto those properties
 * using the maps below, so a value declared in the data is either applied
 * or explicitly listed as not implemented yet — never silently dropped.
 */

export interface EffectField {
    /** Direct property on the normalized effect object. */
    key: string;
    icon: string;
    /** German UI label. */
    label: string;
}

/** `effect.type` → direct property carrying `effect.value`. */
export const EFFECT_TYPE_TO_KEY: Record<string, string> = {
    move: 'movement',
    movement: 'movement',
    attack: 'attack',
    block: 'block',
    influence: 'influence',
    heal: 'healing',
    healing: 'healing',
    ranged: 'ranged',
    siege: 'siege',
    draw: 'draw',
    mana: 'mana',
    mana_token: 'mana',
    crystal: 'crystal',
    crystal_effect: 'crystal',
    hand_limit: 'handLimitBonus',
    enhance_next: 'enhanceNext',
    summon_unit: 'summonUnit',
    destroy_enemy: 'destroyEnemy',
    wish: 'wish',
    copy_card: 'copyCard',
    extra_turn: 'extraTurn'
};

/**
 * Effect types whose payload already lives on direct properties (there is no
 * `value` to lift) or that are applied outside `Hero.playCard()`.
 */
export const EFFECT_TYPES_HANDLED_ELSEWHERE: string[] = [
    // attack/block/move/influence arrive as direct keys
    'versatile',
    // applied on artifact equip (Hero.applyArtifactEffects)
    'command'
];

/**
 * Effect types that exist in the card data but have no engine handler yet.
 * They need a player choice (copy a card, cast any spell, …) or touch systems
 * that do not exist yet (extra turn, destroy enemy). Labelled here so the gap
 * is visible in the UI and testable instead of silent.
 */
export const UNHANDLED_EFFECT_LABELS: Record<string, string> = {
    spell_effect: 'Beliebigen Zauber wirken'
};

/**
 * Effects that stop to ask the player (`CardChoiceFlow`): the value is the
 * number of picks the card grants.
 */
export const CHOICE_EFFECT_KEYS: string[] = ['wish', 'copyCard'];

/**
 * Boolean/string flags that modify an effect (no numeric value of their own).
 * They are applied by the combat engine and shown as extra tooltip rows.
 */
export interface EffectFlag {
    key: string;
    icon: string;
    label: string;
    /** Only render when the value matches. */
    matches?: (value: unknown) => boolean;
}

export const EFFECT_FLAGS: EffectFlag[] = [
    { key: 'area', icon: '🎯', label: 'Trifft jeden Feind', matches: (value) => value === true },
    { key: 'target', icon: '👥', label: 'Alle Feinde', matches: (value) => value === 'all' },
    {
        key: 'element',
        icon: '🔮',
        label: 'Element',
        matches: (value) => typeof value === 'string' && value !== 'physical'
    }
];

export const UNHANDLED_EFFECT_TYPES: string[] = [
    ...Object.keys(UNHANDLED_EFFECT_LABELS),
    'none'
];

/** Numeric fields that are applied by Hero/UI — in display order. */
export const EFFECT_FIELDS: EffectField[] = [
    { key: 'movement', icon: '👣', label: 'Bewegung' },
    { key: 'attack', icon: '⚔️', label: 'Angriff' },
    { key: 'ranged', icon: '🏹', label: 'Fernkampf' },
    { key: 'siege', icon: '🏰', label: 'Belagerung' },
    { key: 'block', icon: '🛡️', label: 'Block' },
    { key: 'influence', icon: '💬', label: 'Einfluss' },
    { key: 'healing', icon: '💚', label: 'Heilung' },
    { key: 'draw', icon: '🎴', label: 'Karten ziehen' },
    { key: 'mana', icon: '💎', label: 'Mana-Token' },
    { key: 'crystal', icon: '💠', label: 'Manakristall' },
    { key: 'handLimitBonus', icon: '🖐️', label: 'Handkarten-Limit' },
    { key: 'enhanceNext', icon: '🚀', label: 'Bonus auf nächste Karte' },
    { key: 'summonUnit', icon: '👻', label: 'Einheiten beschwören' },
    { key: 'destroyEnemy', icon: '✨', label: 'Feind vernichten' },
    { key: 'wish', icon: '🪄', label: 'Wunsch (Auswahl)' },
    { key: 'copyCard', icon: '📋', label: 'Karte aus der Ablage' },
    { key: 'extraTurn', icon: '⏳', label: 'Zusätzliche Züge' }
];

/**
 * `effect.type` → direct property for a *secondary* typed effect
 * (`type2` + `value2`, e.g. Agility: Block 3 and Move 2).
 */
export function secondaryEffectKey(type: string | undefined): string | undefined {
    if (!type) return undefined;
    return EFFECT_TYPE_TO_KEY[type];
}

/**
 * Order in which a "boost the next card" effect (Concentrate) picks its target:
 * the first of these that the next card actually carries gets the bonus.
 */
export const PRIMARY_EFFECT_ORDER: string[] = EFFECT_FIELDS.map((field) => field.key);

/** True when the data declares an effect type the engine knows about. */
export function isKnownEffectType(type: string | undefined): boolean {
    if (!type) return true;
    return (
        type in EFFECT_TYPE_TO_KEY ||
        EFFECT_TYPES_HANDLED_ELSEWHERE.includes(type) ||
        UNHANDLED_EFFECT_TYPES.includes(type)
    );
}

/**
 * `effect.condition === 'reputation_loss'` → reputation change on play.
 * Kept here so card data, engine, and UI agree on the value.
 */
export const CONDITION_REPUTATION_LOSS = 'reputation_loss';
export const REPUTATION_LOSS_PER_PLAY = -1;
