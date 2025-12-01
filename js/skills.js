// Skills definition for Mage Knight

export const SKILL_TYPES = {
    PASSIVE: 'passive',
    ACTIVE: 'active', // Once per round
    ONCE_PER_TURN: 'once_per_turn'
};

export const SKILLS = {
    GOLDYX: [
        {
            id: 'flight',
            name: 'Flug',
            description: 'Bewegungskosten für alle Gelände sind 1. Ignoriert Feinde beim Bewegen.',
            type: SKILL_TYPES.PASSIVE,
            icon: '🦅'
        },
        {
            id: 'motivation',
            name: 'Motivation',
            description: 'Einmal pro Runde: Ziehe 2 Karten und erhalte 1 weißes Mana.',
            type: SKILL_TYPES.ACTIVE,
            icon: '⚡'
        },
        {
            id: 'crystal_mastery',
            name: 'Kristall-Meisterschaft',
            description: 'Du kannst Kristalle jeder Farbe als Joker verwenden.',
            type: SKILL_TYPES.PASSIVE,
            icon: '💎'
        },
        {
            id: 'glittering_fortune',
            name: 'Glitzerndes Glück',
            description: 'Erhalte zu Beginn jeder Runde 1 Kristall einer zufälligen Farbe.',
            type: SKILL_TYPES.PASSIVE,
            icon: '✨'
        },
        {
            id: 'dragon_scales',
            name: 'Drachenschuppen',
            description: '+1 Rüstung. Feuer-Angriffe machen halben Schaden.',
            type: SKILL_TYPES.PASSIVE,
            icon: '🐲'
        },
        {
            id: 'freezing_breath',
            name: 'Eis-Atem',
            description: 'Einmal pro Runde: Ein Feind erhält -3 Rüstung und verliert alle Angriffe.',
            type: SKILL_TYPES.ACTIVE,
            icon: '❄️'
        }
    ]
};

export function getRandomSkills(heroName, count = 2, currentSkills = []) {
    const heroSkills = SKILLS[heroName.toUpperCase()] || [];
    const available = heroSkills.filter(s => !currentSkills.some(cs => cs.id === s.id));

    // Shuffle and take count
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
