import { describe, it, expect, beforeEach } from './testRunner.js';
import { AchievementManager, ACHIEVEMENTS } from '../js/achievements.js';

describe('AchievementManager', () => {
    let achievementManager;

    beforeEach(() => {
        localStorage.clear();
        achievementManager = new AchievementManager();
        achievementManager.reset();
    });

    it('should initialize with no unlocked achievements', () => {
        expect(achievementManager.getUnlocked().length).toBe(0);
    });

    it('should unlock achievement when condition is met', () => {
        // Mock stats that satisfy FIRST_BLOOD
        const stats = {
            enemiesDefeated: 1
        };

        const newAchievements = achievementManager.checkAchievements(stats);

        expect(newAchievements.length).toBe(1);
        expect(newAchievements[0].id).toBe('first_blood');
        expect(achievementManager.unlockedAchievements.has('first_blood')).toBe(true);
    });

    it('should not unlock achievement when condition is not met', () => {
        const stats = {
            enemiesDefeated: 0
        };

        const newAchievements = achievementManager.checkAchievements(stats);

        expect(newAchievements.length).toBe(0);
    });

    it('should not unlock already unlocked achievement', () => {
        const stats = {
            enemiesDefeated: 1
        };

        // First unlock
        achievementManager.checkAchievements(stats);

        // Second check
        const newAchievements = achievementManager.checkAchievements(stats);

        expect(newAchievements.length).toBe(0);
    });

    it('should track multiple achievements', () => {
        const stats = {
            enemiesDefeated: 10, // Unlocks FIRST_BLOOD and SLAYER
            level: 2 // Unlocks LEVEL_UP
        };

        const newAchievements = achievementManager.checkAchievements(stats);

        // Should unlock 3 achievements
        expect(newAchievements.length).toBe(3);

        const ids = newAchievements.map(a => a.id);
        expect(ids).toContain('first_blood');
        expect(ids).toContain('slayer');
        expect(ids).toContain('level_up');
    });

    it('should persist unlocked achievements', () => {
        achievementManager.unlock('first_blood');

        // Create new instance
        const newManager = new AchievementManager();
        expect(newManager.unlockedAchievements.has('first_blood')).toBe(true);
    });

    it('should calculate progress', () => {
        const total = Object.keys(ACHIEVEMENTS).length;

        achievementManager.unlock('first_blood');

        const progress = achievementManager.getProgress();
        expect(progress.unlocked).toBe(1);
        expect(progress.total).toBe(total);
        expect(progress.percentage).toBe(Math.round(100 / total));
    });
});
