import { describe, it, expect } from './testRunner.js';
import { SKILL_TYPES, SKILLS, getRandomSkills } from '../js/skills.js';

describe('Skills System', () => {
    describe('SKILL_TYPES Constants', () => {
        it('should define all skill types', () => {
            expect(SKILL_TYPES.PASSIVE).toBe('passive');
            expect(SKILL_TYPES.ACTIVE).toBe('active');
            expect(SKILL_TYPES.ONCE_PER_TURN).toBe('once_per_turn');
        });
    });

    describe('SKILLS.GOLDYX', () => {
        it('should have skills defined for GOLDYX', () => {
            expect(SKILLS.GOLDYX).toBeDefined();
            expect(Array.isArray(SKILLS.GOLDYX)).toBe(true);
            expect(SKILLS.GOLDYX.length).toBeGreaterThan(0);
        });

        it('should have correctly structured skills', () => {
            SKILLS.GOLDYX.forEach(skill => {
                expect(skill).toHaveProperty('id');
                expect(skill).toHaveProperty('name');
                expect(skill).toHaveProperty('description');
                expect(skill).toHaveProperty('type');
                expect(skill).toHaveProperty('icon');

                // Type must be valid
                expect([
                    SKILL_TYPES.PASSIVE,
                    SKILL_TYPES.ACTIVE,
                    SKILL_TYPES.ONCE_PER_TURN
                ]).toContain(skill.type);
            });
        });

        it('should have specific skills defined', () => {
            const skillIds = SKILLS.GOLDYX.map(s => s.id);

            expect(skillIds).toContain('flight');
            expect(skillIds).toContain('motivation');
            expect(skillIds).toContain('crystal_mastery');
            expect(skillIds).toContain('glittering_fortune');
            expect(skillIds).toContain('dragon_scales');
            expect(skillIds).toContain('freezing_breath');
        });

        it('should have unique skill IDs', () => {
            const ids = SKILLS.GOLDYX.map(s => s.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should have non-empty descriptions', () => {
            SKILLS.GOLDYX.forEach(skill => {
                expect(skill.description.length).toBeGreaterThan(0);
            });
        });
    });

    describe('getRandomSkills', () => {
        it('should return requested number of skills', () => {
            const skills = getRandomSkills('GOLDYX', 2);

            expect(skills).toBeDefined();
            expect(skills.length).toBe(2);
        });

        it('should return default 2 skills when count not specified', () => {
            const skills = getRandomSkills('GOLDYX');

            expect(skills.length).toBe(2);
        });

        it('should not return duplicate skills', () => {
            const skills = getRandomSkills('GOLDYX', 3);
            const ids = skills.map(s => s.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should exclude already owned skills', () => {
            const currentSkills = [
                { id: 'flight', name: 'Flug' }
            ];

            const newSkills = getRandomSkills('GOLDYX', 2, currentSkills);

            expect(newSkills.length).toBe(2);
            expect(newSkills.every(s => s.id !== 'flight')).toBe(true);
        });

        it('should handle requesting more skills than available', () => {
            const currentSkills = SKILLS.GOLDYX.slice(0, 4); // Have 4 skills
            const availableCount = SKILLS.GOLDYX.length - 4;

            const newSkills = getRandomSkills('GOLDYX', 10, currentSkills);

            // Should return only what's available
            expect(newSkills.length).toBe(availableCount);
        });

        it('should handle unknown hero name gracefully', () => {
            const skills = getRandomSkills('UNKNOWN_HERO', 2);

            expect(skills).toBeDefined();
            expect(skills.length).toBe(0);
        });

        it('should handle case insensitive hero names', () => {
            const skills1 = getRandomSkills('goldyx', 2);
            const skills2 = getRandomSkills('GOLDYX', 2);
            const skills3 = getRandomSkills('Goldyx', 2);

            expect(skills1.length).toBe(2);
            expect(skills2.length).toBe(2);
            expect(skills3.length).toBe(2);
        });

        it('should return different skills on multiple calls (randomization)', () => {
            // Run multiple times to test randomization
            const results = [];
            for (let i = 0; i < 10; i++) {
                const skills = getRandomSkills('GOLDYX', 2);
                results.push(skills.map(s => s.id).sort().join(','));
            }

            // At least some results should be different (randomized)
            const uniqueResults = [...new Set(results)];
            expect(uniqueResults.length).toBeGreaterThan(1);
        });

        it('should return valid skill objects', () => {
            const skills = getRandomSkills('GOLDYX', 3);

            skills.forEach(skill => {
                expect(skill).toHaveProperty('id');
                expect(skill).toHaveProperty('name');
                expect(skill).toHaveProperty('description');
                expect(skill).toHaveProperty('type');
                expect(skill).toHaveProperty('icon');
            });
        });
    });
});
