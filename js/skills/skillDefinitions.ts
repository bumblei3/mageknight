/**
 * Hero Skill Definitions
 * Defines available skills for each hero class.
 */

export interface Skill {
    id: string;
    name: string;
    type: 'active' | 'passive';
    description: string;
    icon: string;
    cooldown?: 'round';
    /**
     * Magnitude of the rule, so the data declares what the engine applies
     * (like a card's `value`). Passive: the bonus amount. Active: the effect
     * size (attack/block/draw/...).
     */
    value?: number;
    /** Wounds the hero takes as the cost of using the skill. */
    selfWound?: number;
}

export const SKILL_TYPES = {
    PASSIVE: 'passive',
    ACTIVE: 'active'
} as const;

export type SkillType = typeof SKILL_TYPES[keyof typeof SKILL_TYPES];

export interface HeroSkills {
    [key: string]: {
        common: Skill[];
    };
}

export const HERO_SKILLS: HeroSkills = {
    // Draconum (Goldyx) - Magic, Flight, Elements
    goldyx: {
        common: [
            {
                id: 'flight',
                name: 'Flug',
                type: 'active',
                description: 'Bewege dich 2 Felder weit und ignoriere Geländekosten.', // Move 2 spaces, ignore terrain
                icon: '🦅',
                value: 2,
                cooldown: 'round'
            },
            {
                id: 'crystal_mastery',
                name: 'Kristall-Meisterschaft',
                type: 'passive',
                description: 'Erhalte zu Beginn jeder Runde 1 Grünen Kristall.', // Gain 1 Green Crystal per round
                icon: '💎',
                value: 1
            },
            {
                id: 'fire_breath',
                name: 'Feueratem',
                type: 'active',
                description: 'Fernkampf-Feuer-Angriff 3.',
                icon: '🔥',
                value: 3,
                cooldown: 'round'
            },
            {
                id: 'dragon_scales',
                name: 'Drachenschuppen',
                type: 'passive',
                description: '+1 Rüstung.',
                icon: '🛡️',
                value: 1
            }
        ]
    },
    // Leader (Norowas) - Units, Healing, Influence
    norowas: {
        common: [
            {
                id: 'motivation',
                name: 'Motivation',
                type: 'active',
                description: 'Mache eine verbrauchte Einheit wieder bereit.',
                icon: '🚩',
                value: 2,
                cooldown: 'round'
            },
            {
                id: 'forward_march',
                name: 'Vorwärts Marsch',
                type: 'passive',
                description: 'Bewegungskosten -1 für alle Felder (min 1).',
                icon: '🥾',
                value: 1
            },
            {
                id: 'healing_touch',
                name: 'Heilende Hände',
                type: 'active',
                description: 'Heile 2 Schaden (von Held oder Einheit).',
                icon: '✨',
                value: 2,
                cooldown: 'round'
            },
            {
                id: 'noble_manners',
                name: 'Edle Manieren',
                type: 'passive',
                description: '+2 Einfluss in Dörfern und Klöstern.',
                icon: '👑',
                value: 2
            },
            {
                id: 'glittering_fortune',
                name: 'Glitzerndes Glück',
                type: 'passive',
                description: 'Erhalte zu Beginn jeder Runde 1 zufälligen Kristall.',
                icon: '✨',
                value: 1
            }
        ]
    },
    // Chaos Blood Witch (Arythea) - Aggression, Pain, Risk
    arythea: {
        common: [
            {
                id: 'blood_rage',
                name: 'Blutrausch',
                type: 'active',
                description: 'Angriff +3 in dieser Kampfphase (verursacht aber 1 eigene Wunde).',
                icon: '🩸',
                value: 3,
                selfWound: 1,
                cooldown: 'round'
            },
            {
                id: 'pain_weave',
                name: 'Schmerzgewebe',
                type: 'passive',
                description: 'Für jede Wunde des Helden +1 Angriff (max +3).',
                icon: '🕸️',
                value: 3
            },
            {
                id: 'dark_pact',
                name: 'Dunkler Pakt',
                type: 'active',
                description: 'Ziehe 2 Karten, nimm aber 1 Wunde.',
                icon: '🌑',
                value: 2,
                selfWound: 1,
                cooldown: 'round'
            },
            {
                id: 'chaos_embrace',
                name: 'Umarmung des Chaos',
                type: 'passive',
                description: 'Erleidest 1 Wunde weniger pro Kampf (min 0).',
                icon: '🌀',
                value: 1
            }
        ]
    },
    // Imperial Tactician (Tovak) - Defense, Block, Tactics
    tovak: {
        common: [
            {
                id: 'iron_wall',
                name: 'Eiserne Mauer',
                type: 'active',
                description: 'Block +4 in dieser Kampfphase.',
                icon: '🛡️',
                value: 4,
                cooldown: 'round'
            },
            {
                id: 'tactical_read',
                name: 'Taktische Lesart',
                type: 'passive',
                description: 'Bei Kampfbeginn: sieh die Gegner-Werte voraus (+1 Info).',
                icon: '📖',
                value: 1
            },
            {
                id: 'counter_strike',
                name: 'Konterangriff',
                type: 'active',
                description: 'Wenn voll blockt wurde: +2 Angriff als Vergeltung.',
                icon: '⚔️',
                value: 2,
                cooldown: 'round'
            },
            {
                id: 'bulwark',
                name: 'Bollwerk',
                type: 'passive',
                description: '+1 Rüstung gegen Fernkampf- und Belagerungsangriffe.',
                icon: '🏰',
                value: 1
            }
        ]
    }
};

/**
 * Get random skills for a hero class, excluding already owned ones.
 */
export function getRandomSkills(
    heroId: string,
    ownedSkillIds: Set<string>,
    count: number = 2
): Skill[] {
    const classSkills = HERO_SKILLS[heroId]?.common || [];
    const available = classSkills.filter(s => !ownedSkillIds.has(s.id));

    // Shuffle and slice
    return available.sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Uppercase-keyed skill table (mirrors HERO_SKILLS) for test/consumer convenience.
 */
export const SKILLS: Record<string, Skill[]> = Object.fromEntries(
    Object.entries(HERO_SKILLS).map(([key, value]) => [key.toUpperCase(), value.common])
);
