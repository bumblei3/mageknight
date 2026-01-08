
export const SKILL_TYPES = {
    PASSIVE: 'passive',
    ACTIVE: 'active'
} as const;

export type SkillType = typeof SKILL_TYPES[keyof typeof SKILL_TYPES];

export interface Skill {
    id: string;
    name: string;
    type: SkillType;
    icon: string;
    description: string;
}

export const SKILLS: Record<string, Skill[]> = {
    GOLDYX: [
        { id: 'flight', name: 'Flug', type: SKILL_TYPES.ACTIVE, icon: '🦅', description: 'Bewege dich 2 Felder weit und ignoriere Geländekosten.' },
        { id: 'motivation', name: 'Motivation', type: SKILL_TYPES.ACTIVE, icon: '🚩', description: '+2 Karten, +1 Weißes Mana' },
        { id: 'dragon_scales', name: 'Drachenschuppen', type: SKILL_TYPES.PASSIVE, icon: '🛡️', description: '+1 Rüstung.' },
        { id: 'freezing_breath', name: 'Eis-Atem', type: SKILL_TYPES.ACTIVE, icon: '❄️', description: 'Friere Feinde ein' },
        { id: 'crystal_mastery', name: 'Kristall-Meisterschaft', type: SKILL_TYPES.PASSIVE, icon: '💎', description: 'Erhalte zu Beginn jeder Runde 1 Grünen Kristall.' },
        { id: 'glittering_fortune', name: 'Glitzerndes Glück', type: SKILL_TYPES.PASSIVE, icon: '✨', description: 'Runden-Kristall' },
        { id: 'siege_mastery', name: 'Belagerungs-Meister', type: SKILL_TYPES.PASSIVE, icon: '🏹', description: '+2 Belagerung' },
        { id: 'essence_flow', name: 'Essenz-Fluss', type: SKILL_TYPES.PASSIVE, icon: '🌊', description: 'Karte + Mana' }
    ],
    NOROWAS: [
        { id: 'motivation', name: 'Motivation', type: SKILL_TYPES.ACTIVE, icon: '🚩', description: 'Mache eine verbrauchte Einheit wieder bereit.' },
        { id: 'forward_march', name: 'Vorwärts Marsch', type: SKILL_TYPES.PASSIVE, icon: '🥾', description: 'Bewegungskosten -1.' },
        { id: 'healing_touch', name: 'Heilende Hände', type: SKILL_TYPES.ACTIVE, icon: '✨', description: 'Heile 2 Schaden.' },
        { id: 'noble_manners', name: 'Edle Manieren', type: SKILL_TYPES.PASSIVE, icon: '👑', description: '+2 Einfluss.' }
    ]
};

/**
 * Get random skills for a hero class.
 */
export function getRandomSkills(heroId: string, countOrExcludeSet: number | Set<string> = 2, countIfSet: number = 2): Skill[] {
    const list = SKILLS[heroId.toUpperCase()] || [];

    let excludeSet = new Set<string>();
    let finalCount = 2;

    if (typeof countOrExcludeSet === 'number') {
        finalCount = countOrExcludeSet;
    } else if (countOrExcludeSet instanceof Set) {
        excludeSet = countOrExcludeSet;
        finalCount = countIfSet;
    }

    const available = list.filter(s => !excludeSet.has(s.id));
    return [...available].sort(() => 0.5 - Math.random()).slice(0, finalCount);
}

export default {
    SKILL_TYPES,
    SKILLS,
    getRandomSkills
};
