
import { describe, it, expect } from 'vitest';
import { Card, CARD_TYPES, CARD_COLORS, createDeck, SAMPLE_SPELLS, SAMPLE_ARTIFACTS } from '../js/card.js';
import { SKILLS, getRandomSkills, SKILL_TYPES } from '../js/skills.js';

describe('Content Expansion', () => {

    it('should have new spells defined', () => {
        expect(SAMPLE_SPELLS.length).toBeGreaterThan(2);

        const iceBolt = SAMPLE_SPELLS.find(s => s.id === 'spell_ice_bolt');
        expect(iceBolt).toBeDefined();
        expect(iceBolt.type).toBe(CARD_TYPES.SPELL);
        expect(iceBolt.strongEffect.freeze).toBe(true);
    });

    it('should have artifacts defined', () => {
        expect(SAMPLE_ARTIFACTS.length).toBeGreaterThan(0);

        const horn = SAMPLE_ARTIFACTS.find(a => a.id === 'art_horn_of_wrath');
        expect(horn).toBeDefined();
        expect(horn.type).toBe(CARD_TYPES.ARTIFACT);
        expect(horn.strongEffect.brutal).toBe(true);
    });

    it('should be able to create artifact cards', () => {
        const artifacts = createDeck(SAMPLE_ARTIFACTS);
        expect(artifacts.length).toBe(SAMPLE_ARTIFACTS.length);
        expect(artifacts[0] instanceof Card).toBe(true);
        expect(artifacts[0].type).toBe(CARD_TYPES.ARTIFACT);
    });

    it('should have new skills defined', () => {
        const goldyxSkills = SKILLS.GOLDYX;
        expect(goldyxSkills.length).toBeGreaterThan(6); // Originally 6

        const siegeMastery = goldyxSkills.find(s => s.id === 'siege_mastery');
        expect(siegeMastery).toBeDefined();
        expect(siegeMastery.type).toBe(SKILL_TYPES.PASSIVE);
    });

    it('should retrieve random skills correctly', () => {
        const skills = getRandomSkills('GOLDYX', 3);
        expect(skills.length).toBe(3);

        // Ensure uniqueness if we ask for multiple
        const ids = new Set(skills.map(s => s.id));
        expect(ids.size).toBe(3);
    });
});
