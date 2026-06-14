import { describe, it, expect, vi } from 'vitest';
import { getRandomSkills, SKILLS, SKILL_TYPES } from '../js/skills.js';

describe('getRandomSkills - Branch Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('typeof countOrExcludeSet === "number"', () => {
        it('should return correct number of skills when count is number', () => {
            const skills = getRandomSkills('GOLDYX', 3);
            expect(skills.length).toBe(3);
        });

        it('should return 1 skill when count is 1', () => {
            const skills = getRandomSkills('GOLDYX', 1);
            expect(skills.length).toBe(1);
        });

        it('should return empty array when count is 0', () => {
            const skills = getRandomSkills('GOLDYX', 0);
            expect(skills).toEqual([]);
        });

        it('should return all available skills when count exceeds available', () => {
            const skills = getRandomSkills('GOLDYX', 20);
            expect(skills.length).toBe(SKILLS.GOLDYX.length);
        });

        it('should return skills without excluding when only count provided', () => {
            const skills = getRandomSkills('GOLDYX', 2);
            // Should not exclude any by default
            skills.forEach(skill => {
                expect(SKILLS.GOLDYX.map(s => s.id)).toContain(skill.id);
            });
        });
    });

    describe('countOrExcludeSet instanceof Set', () => {
        it('should exclude skills in the excludeSet', () => {
            const excludeSet = new Set(['flight', 'motivation']);
            const skills = getRandomSkills('GOLDYX', excludeSet, 2);
            
            skills.forEach(skill => {
                expect(excludeSet.has(skill.id)).toBe(false);
            });
        });

        it('should use countIfSet for number of skills to return', () => {
            const excludeSet = new Set(['flight']);
            const skills = getRandomSkills('GOLDYX', excludeSet, 1);
            expect(skills.length).toBe(1);
        });

        it('should return empty array when all skills excluded and count > 0', () => {
            // Get all skill IDs for GOLDYX
            const allIds = SKILLS.GOLDYX.map(s => s.id);
            const excludeSet = new Set(allIds);
            const skills = getRandomSkills('GOLDYX', excludeSet, 5);
            expect(skills).toEqual([]);
        });

        it('should handle empty excludeSet', () => {
            const excludeSet = new Set();
            const skills = getRandomSkills('GOLDYX', excludeSet, 2);
            expect(skills.length).toBe(2);
        });

        it('should not include excluded skills in result', () => {
            const excludeSet = new Set(['dragon_scales', 'crystal_mastery']);
            const skills = getRandomSkills('GOLDYX', excludeSet, 3);
            
            const excludedInResult = skills.some(s => excludeSet.has(s.id));
            expect(excludedInResult).toBe(false);
        });
    });

    describe('Edge cases', () => {
        it('should return empty array for unknown hero', () => {
            const skills = getRandomSkills('UNKNOWN_HERO', 2);
            expect(skills).toEqual([]);
        });

        it('should handle case-insensitive heroId', () => {
            const skills1 = getRandomSkills('goldyx', 2);
            const skills2 = getRandomSkills('GOLDYX', 2);
            expect(skills1.length).toBe(2);
            expect(skills2.length).toBe(2);
        });

        it('should work with NOROWAS hero', () => {
            const skills = getRandomSkills('NOROWAS', 2);
            expect(skills.length).toBe(2);
            skills.forEach(skill => {
                expect(SKILLS.NOROWAS.map(s => s.id)).toContain(skill.id);
            });
        });

        it('should not return duplicate skills', () => {
            const skills = getRandomSkills('GOLDYX', 8);
            const ids = skills.map(s => s.id);
            const uniqueIds = [...new Set(ids)];
            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should return skills with correct structure', () => {
            const skills = getRandomSkills('GOLDYX', 1);
            expect(skills[0]).toHaveProperty('id');
            expect(skills[0]).toHaveProperty('name');
            expect(skills[0]).toHaveProperty('type');
            expect(skills[0]).toHaveProperty('icon');
            expect(skills[0]).toHaveProperty('description');
            expect([SKILL_TYPES.PASSIVE, SKILL_TYPES.ACTIVE]).toContain(skills[0].type);
        });
    });

    describe('Randomness / sorting', () => {
        it('should return different orders on multiple calls (probabilistic)', () => {
            // This test is probabilistic but should pass most of the time
            const results = new Set();
            for (let i = 0; i < 10; i++) {
                const skills = getRandomSkills('GOLDYX', 3);
                results.add(skills.map(s => s.id).join(','));
            }
            // With random sort, we should see multiple orderings
            expect(results.size).toBeGreaterThan(1);
        });

        it('should respect finalCount when using Set exclude', () => {
            // Exclude all but 3 skills
            const allIds = new Set(SKILLS.GOLDYX.map(s => s.id));
            const keepIds = Array.from(allIds).slice(0, 3);
            const excludeSet = new Set(Array.from(allIds).filter(id => !keepIds.includes(id)));
            
            const skills = getRandomSkills('GOLDYX', excludeSet, 5);
            expect(skills.length).toBeLessThanOrEqual(5);
            // Only skills in keepIds should be returned (max 3 available)
            expect(skills.length).toBeLessThanOrEqual(3);
        });
    });
});