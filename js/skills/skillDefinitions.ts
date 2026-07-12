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
                cooldown: 'round'
            },
            {
                id: 'crystal_mastery',
                name: 'Kristall-Meisterschaft',
                type: 'passive',
                description: 'Erhalte zu Beginn jeder Runde 1 Grünen Kristall.', // Gain 1 Green Crystal per round
                icon: '💎'
            },
            {
                id: 'fire_breath',
                name: 'Feueratem',
                type: 'active',
                description: 'Fernkampf-Feuer-Angriff 3.',
                icon: '🔥',
                cooldown: 'round'
            },
            {
                id: 'dragon_scales',
                name: 'Drachenschuppen',
                type: 'passive',
                description: '+1 Rüstung.',
                icon: '🛡️'
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
                cooldown: 'round'
            },
            {
                id: 'forward_march',
                name: 'Vorwärts Marsch',
                type: 'passive',
                description: 'Bewegungskosten -1 für alle Felder (min 1).',
                icon: '🥾'
            },
            {
                id: 'healing_touch',
                name: 'Heilende Hände',
                type: 'active',
                description: 'Heile 2 Schaden (von Held oder Einheit).',
                icon: '✨',
                cooldown: 'round'
            },
            {
                id: 'noble_manners',
                name: 'Edle Manieren',
                type: 'passive',
                description: '+2 Einfluss in Dörfern und Klöstern.',
                icon: '👑'
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
