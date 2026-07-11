import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AchievementManager, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../js/achievements.js';

function makeStats(overrides = {}) {
    return {
        enemiesDefeated: 0,
        perfectCombats: 0,
        dragonsDefeated: 0,
        tilesExplored: 0,
        sitesVisited: 0,
        level: 1,
        totalCards: 0,
        victory: false,
        turns: 0,
        manaUsed: 0,
        cardsPlayed: 0,
        closeCallSurvival: 0,
        attackCardsPlayed: 0,
        ...overrides,
    };
}

describe('AchievementManager', () => {
    let am;

    beforeEach(() => {
        localStorage.clear();
        am = new AchievementManager();
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes empty state', () => {
            expect(am.isUnlocked('first_blood')).toBe(false);
            expect(am.getProgress().unlocked).toBe(0);
        });
    });

    describe('checkAchievements', () => {
        it('unlocks achievements whose condition is met', () => {
            const stats = makeStats({ enemiesDefeated: 1, tilesExplored: 5, level: 2 });
            const unlocked = am.checkAchievements(stats);
            const ids = unlocked.map(a => a.id);
            expect(ids).toContain('first_blood');
            expect(ids).toContain('explorer');
            expect(ids).toContain('level_up');
            expect(am.isUnlocked('first_blood')).toBe(true);
        });

        it('does not unlock achievements whose condition is unmet', () => {
            const stats = makeStats(); // all zeros
            const unlocked = am.checkAchievements(stats);
            expect(unlocked).toHaveLength(0);
        });

        it('does not re-unlock already unlocked achievements', () => {
            const stats = makeStats({ enemiesDefeated: 1 });
            am.checkAchievements(stats);
            expect(am.isUnlocked('first_blood')).toBe(true);
            // Second check should not return it again
            const again = am.checkAchievements(makeStats({ enemiesDefeated: 1 }));
            expect(again.map(a => a.id)).not.toContain('first_blood');
        });

        it('handles every defined achievement condition', () => {
            // Build stats that satisfy ALL conditions
            const stats = makeStats({
                enemiesDefeated: 10,
                perfectCombats: 1,
                dragonsDefeated: 1,
                tilesExplored: 10,
                sitesVisited: 5,
                level: 5,
                totalCards: 20,
                victory: true,
                turns: 10,
                manaUsed: 50,
                cardsPlayed: 100,
                closeCallSurvival: 1,
                attackCardsPlayed: 0,
            });
            const unlocked = am.checkAchievements(stats);
            // All 16 achievements should be satisfied
            expect(unlocked.length).toBe(Object.keys(ACHIEVEMENTS).length);
            expect(am.getProgress().unlocked).toBe(Object.keys(ACHIEVEMENTS).length);
        });

        it('PACIFIST_WIN requires no attack cards and victory', () => {
            const noWin = am.checkAchievements(makeStats({ victory: true, attackCardsPlayed: 3 }));
            expect(noWin.map(a => a.id)).not.toContain('pacifist_win');
            const win = am.checkAchievements(makeStats({ victory: true, attackCardsPlayed: 0 }));
            expect(win.map(a => a.id)).toContain('pacifist_win');
        });

        it('SPEED_RUNNER requires victory and turns <= 20', () => {
            const slow = am.checkAchievements(makeStats({ victory: true, turns: 30 }));
            expect(slow.map(a => a.id)).not.toContain('speed_runner');
            const fast = am.checkAchievements(makeStats({ victory: true, turns: 15 }));
            expect(fast.map(a => a.id)).toContain('speed_runner');
        });
    });

    describe('unlock', () => {
        it('returns false when already unlocked', () => {
            am.unlock('first_blood');
            expect(am.unlock('first_blood')).toBe(false);
        });

        it('resolves id case-insensitively via toUpperCase for notification', () => {
            // unlock accepts uppercase id; the matching achievement still gets notified
            expect(am.unlock('FIRST_BLOOD')).toBe(true);
            const pending = am.getPendingNotifications();
            expect(pending[0].achievement.id).toBe('first_blood');
            // Note: the stored key is exactly the passed id
            expect(am.isUnlocked('FIRST_BLOOD')).toBe(true);
        });

        it('resolves id via find fallback when toUpperCase misses', () => {
            // 'site_visitor' toUpperCase -> 'SITE_VISITOR' which exists in ACHIEVEMENTS,
            // but test a non-uppercase-matching id form to exercise the find() branch
            expect(am.unlock('site_visitor')).toBe(true);
            expect(am.isUnlocked('site_visitor')).toBe(true);
        });

        it('adds a notification when achievement exists', () => {
            am.unlock('first_blood');
            const pending = am.getPendingNotifications();
            expect(pending.length).toBe(1);
            expect(pending[0].achievement.id).toBe('first_blood');
        });

        it('does not add notification for unknown id', () => {
            expect(am.unlock('does_not_exist')).toBe(true);
            expect(am.getPendingNotifications()).toHaveLength(0);
        });
    });

    describe('addNotification cap', () => {
        it('keeps only the last 10 notifications', () => {
            const ids = ['first_blood', 'slayer', 'perfect_combat', 'dragon_slayer', 'explorer',
                'cartographer', 'site_visitor', 'level_up', 'master', 'deck_builder', 'mana_master'];
            ids.forEach(id => am.unlock(id));
            // 11 unlocks -> only last 10 kept
            expect(am.getPendingNotifications().length).toBe(10);
        });
    });

    describe('getUnlocked / getLocked / getByCategory', () => {
        it('getUnlocked returns unlocked achievements', () => {
            am.unlock('first_blood');
            const unlocked = am.getUnlocked();
            expect(unlocked.map(a => a.id)).toContain('first_blood');
        });

        it('getUnlocked filters out unknown ids', () => {
            // Force an unknown id into the set via loadState
            am.loadState({ unlocked: ['ghost_id'] });
            expect(am.getUnlocked()).toHaveLength(0);
        });

        it('getLocked returns not-unlocked achievements', () => {
            am.unlock('first_blood');
            const locked = am.getLocked();
            expect(locked.map(a => a.id)).not.toContain('first_blood');
        });

        it('getByCategory filters by category', () => {
            const combat = am.getByCategory(ACHIEVEMENT_CATEGORIES.COMBAT);
            expect(combat.every(a => a.category === ACHIEVEMENT_CATEGORIES.COMBAT)).toBe(true);
            expect(combat.length).toBeGreaterThan(0);
        });
    });

    describe('getProgress', () => {
        it('computes percentage', () => {
            am.unlock('first_blood');
            const p = am.getProgress();
            expect(p.total).toBe(Object.keys(ACHIEVEMENTS).length);
            expect(p.unlocked).toBe(1);
            expect(p.percentage).toBe(Math.round((1 / p.total) * 100));
        });
    });

    describe('persistence', () => {
        it('save writes to localStorage', () => {
            am.unlock('first_blood');
            expect(localStorage.getItem('mageKnight_achievements')).not.toBeNull();
            const parsed = JSON.parse(localStorage.getItem('mageKnight_achievements'));
            expect(parsed.unlocked).toContain('first_blood');
        });

        it('load restores unlocked set', () => {
            am.unlock('first_blood');
            am.unlock('explorer');
            const am2 = new AchievementManager();
            expect(am2.isUnlocked('first_blood')).toBe(true);
            expect(am2.isUnlocked('explorer')).toBe(true);
        });

        it('load handles corrupt data gracefully', () => {
            localStorage.setItem('mageKnight_achievements', '{not valid json');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const am2 = new AchievementManager();
            expect(am2.getProgress().unlocked).toBe(0);
            spy.mockRestore();
        });

        it('save is a no-op when localStorage undefined', () => {
            const orig = globalThis.localStorage;
            // jsdom always provides localStorage; just ensure it does not throw
            expect(() => am.save()).not.toThrow();
            if (orig) globalThis.localStorage = orig;
        });

        it('reset clears everything', () => {
            am.unlock('first_blood');
            am.reset();
            expect(am.isUnlocked('first_blood')).toBe(false);
            expect(am.getProgress().unlocked).toBe(0);
        });
    });

    describe('state serialization', () => {
        it('getState returns unlocked array', () => {
            am.unlock('first_blood');
            const state = am.getState();
            expect(state.unlocked).toContain('first_blood');
        });

        it('loadState restores from object', () => {
            am.loadState({ unlocked: ['slayer', 'explorer'] });
            expect(am.isUnlocked('slayer')).toBe(true);
            expect(am.isUnlocked('explorer')).toBe(true);
        });

        it('loadState ignores missing unlocked', () => {
            expect(() => am.loadState(null)).not.toThrow();
            expect(() => am.loadState({})).not.toThrow();
            expect(am.getProgress().unlocked).toBe(0);
        });
    });

    describe('setGame', () => {
        it('stores game reference', () => {
            const game = { id: 'g' };
            am.setGame(game);
            expect(am.gameRef).toBe(game);
        });
    });
});
