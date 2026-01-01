// Hero Skills for Mage Knight
import { t } from './i18n/index.js';

export const SKILL_TYPES = {
    PASSIVE: 'passive',
    ACTIVE: 'active', // Once per round
    ONCE_PER_TURN: 'once_per_turn'
};

export const SKILLS = {
    GOLDYX: [
        {
            id: 'flight',
            get name() { return t('skills.flight.name'); },
            get description() { return t('skills.flight.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '🕊️'
        },
        {
            id: 'motivation',
            get name() { return t('skills.motivation.name'); },
            get description() { return t('skills.motivation.desc'); },
            type: SKILL_TYPES.ACTIVE,
            icon: '📣'
        },
        {
            id: 'crystal_mastery',
            get name() { return t('skills.crystal_mastery.name'); },
            get description() { return t('skills.crystal_mastery.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '💎'
        },
        {
            id: 'glittering_fortune',
            get name() { return t('skills.glittering_fortune.name'); },
            get description() { return t('skills.glittering_fortune.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '✨'
        },
        {
            id: 'dragon_scales',
            get name() { return t('skills.dragon_scales.name'); },
            get description() { return t('skills.dragon_scales.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '🛡️'
        },
        {
            id: 'freezing_breath',
            get name() { return t('skills.freezing_breath.name'); },
            get description() { return t('skills.freezing_breath.desc'); },
            type: SKILL_TYPES.ACTIVE,
            icon: '❄️'
        },
        {
            id: 'siege_mastery',
            get name() { return t('skills.siege_mastery.name'); },
            get description() { return t('skills.siege_mastery.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '🏰'
        },
        {
            id: 'essence_flow',
            get name() { return t('skills.essence_flow.name'); },
            get description() { return t('skills.essence_flow.desc'); },
            type: SKILL_TYPES.ACTIVE,
            icon: '🌀'
        },
        {
            id: 'natural_healing',
            get name() { return t('skills.natural_healing.name'); },
            get description() { return t('skills.natural_healing.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '🌿'
        },
        {
            id: 'noble_manners',
            get name() { return t('skills.noble_manners.name'); },
            get description() { return t('skills.noble_manners.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '👑'
        },
        {
            id: 'avenging_spirit',
            get name() { return t('skills.avenging_spirit.name'); },
            get description() { return t('skills.avenging_spirit.desc'); },
            type: SKILL_TYPES.PASSIVE,
            icon: '👻'
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
