
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { AchievementManager, ACHIEVEMENTS } from '../js/achievements.js';
import { createMockUI, createMockLocalStorage, createSpy as createSpyMock } from './test-mocks.js';

describe('Achievements Coverage Boost', () => {
    let achievementManager;
    let mockUI;

    beforeEach(() => {
        global.localStorage = createMockLocalStorage();
        mockUI = createMockUI();
        mockUI.showAchievementToast = createSpyMock('showAchievementToast');

        // We can pass null/mock game as it seems unused in constructor based on file usage
        // But constructor takes no args in the file I saw? 
        // "constructor() { ... }" - Yes.
        achievementManager = new AchievementManager();

        // Mock addNotification to verify unlocks without UI dependency if needed
        // But better to check internal state or spy on it
    });

    afterEach(() => {
        global.localStorage.clear();
    });

    describe('Initialization', () => {
        it('should initialize with default locked state', () => {
            const unlocked = achievementManager.getUnlocked();
            expect(unlocked.length).toBe(0);
        });

        it('should load unlocked achievements from storage', () => {
            const savedData = { unlocked: ['first_blood'] };
            localStorage.setItem('mageKnight_achievements', JSON.stringify(savedData));

            const newManager = new AchievementManager();
            const unlocked = newManager.getUnlocked();
            expect(unlocked.length).toBe(1);
            expect(unlocked[0].id).toBe('first_blood');
        });
    });

    describe('Unlock Validation', () => {
        it('should unlock "first_blood" when outcome condition met', () => {
            const stats = { enemiesDefeated: 1 };
            const unlocked = achievementManager.checkAchievements(stats);

            expect(unlocked.length).toBe(1);
            expect(unlocked[0].id).toBe('first_blood');
            expect(achievementManager.unlockedAchievements.has('first_blood')).toBe(true);
        });

        it('should not unlock "first_blood" twice', () => {
            const stats = { enemiesDefeated: 1 };
            achievementManager.checkAchievements(stats);

            // Clear notifications or track new unlocks
            const secondUnlock = achievementManager.checkAchievements(stats);
            expect(secondUnlock.length).toBe(0);
        });

        it('should unlock "level_up" when hero reaches level 2', () => {
            const stats = { level: 2 };
            const unlocked = achievementManager.checkAchievements(stats);
            expect(unlocked.some(a => a.id === 'level_up')).toBe(true);
        });

        it('should unlock "slayer" after 10 enemies defeated', () => {
            const stats = { enemiesDefeated: 10 };
            const unlocked = achievementManager.checkAchievements(stats);
            expect(unlocked.some(a => a.id === 'slayer')).toBe(true);
        });

        it('should unlock "explorer" after 3 tiles explored', () => {
            const stats = { tilesExplored: 3 };
            const unlocked = achievementManager.checkAchievements(stats);
            expect(unlocked.some(a => a.id === 'explorer')).toBe(true);
        });

        it('should unlock "deck_builder" with 20 cards', () => {
            const stats = { totalCards: 20 };
            const unlocked = achievementManager.checkAchievements(stats);
            expect(unlocked.some(a => a.id === 'deck_builder')).toBe(true);
        });
    });

    describe('Notifications', () => {
        it('should add notification on unlock', () => {
            achievementManager.unlock('first_blood');
            const notifications = achievementManager.getPendingNotifications();
            expect(notifications.length).toBe(1);
            expect(notifications[0].achievement.id).toBe('first_blood');
        });

        it('should limit notifications history', () => {
            for (let i = 0; i < 15; i++) {
                // Manually add diverse notifications
                achievementManager.addNotification({ id: `test_${i}` });
            }
            expect(achievementManager.notifications.length).toBeLessThanOrEqual(10);
        });
    });

    describe('Progress & Categories', () => {
        it('should calculate progress correctly', () => {
            achievementManager.unlock('first_blood');
            const progress = achievementManager.getProgress();
            expect(progress.unlocked).toBe(1);
            expect(progress.percentage).toBeGreaterThan(0);
        });

        it('should filter by category', () => {
            const combatAchievements = achievementManager.getByCategory('combat');
            expect(combatAchievements.length).toBeGreaterThan(0);
            expect(combatAchievements[0].category).toBe('combat');
        });
    });
});
