import { describe, it, expect, beforeEach } from 'vitest';
import { getRandomSkills, HERO_SKILLS } from '../js/skills/skillDefinitions.js';

describe('skillDefinitions - Branch Coverage', () => {
    beforeEach(() => {
        // No setup needed
    });

    describe('getRandomSkills', () => {
        it('should return empty array for unknown hero', () => {
            const skills = getRandomSkills('UNKNOWN_HERO', new Set(), 2);
            expect(skills).toEqual([]);
        });

        it('should return correct number of skills for goldyx', () => {
            const skills = getRandomSkills('goldyx', new Set(), 2);
            expect(skills.length).toBe(2);
            // Should be from goldyx common skills
            const goldyxIds = HERO_SKILLS.goldyx.common.map(s => s.id);
            skills.forEach(skill => {
                expect(goldyxIds).toContain(skill.id);
            });
        });

        it('should return correct number of skills for norowas', () => {
            const skills = getRandomSkills('norowas', new Set(), 1);
            expect(skills.length).toBe(1);
            const norowasIds = HERO_SKILLS.norowas.common.map(s => s.id);
            skills.forEach(skill => {
                expect(norowasIds).toContain(skill.id);
            });
        });

        it('should exclude owned skills', () => {
            const ownedSkillIds = new Set(['flight', 'crystal_mastery']);
            const skills = getRandomSkills('goldyx', ownedSkillIds, 2);
            skills.forEach(skill => {
                expect(ownedSkillIds.has(skill.id)).toBe(false);
            });
        });

        it('should return empty array when all skills owned', () => {
            const allIds = new Set(HERO_SKILLS.goldyx.common.map(s => s.id));
            const skills = getRandomSkills('goldyx', allIds, 5);
            expect(skills).toEqual([]);
        });

        it('should return up to count skills when fewer available', () => {
            const ownedSkillIds = new Set(['flight', 'crystal_mastery', 'fire_breath']);
            const skills = getRandomSkills('goldyx', ownedSkillIds, 5);
            // Only 1 skill left (dragon_scales)
            expect(skills.length).toBeLessThanOrEqual(1);
        });

        it('should return correct skill structure', () => {
            const skills = getRandomSkills('goldyx', new Set(), 1);
            const skill = skills[0];
            expect(skill).toHaveProperty('id');
            expect(skill).toHaveProperty('name');
            expect(skill).toHaveProperty('type');
            expect(skill).toHaveProperty('icon');
            expect(skill).toHaveProperty('description');
            expect(['active', 'passive']).toContain(skill.type);
        });

        it('should be case-sensitive for heroId (keys are lowercase)', () => {
            const skills1 = getRandomSkills('goldyx', new Set(), 1);
            const skills2 = getRandomSkills('GOLDYX', new Set(), 1);
            expect(skills1.length).toBe(1);
            // GOLDYX (uppercase) is not a valid key, returns empty array
            expect(skills2.length).toBe(0);
        });
    });
});