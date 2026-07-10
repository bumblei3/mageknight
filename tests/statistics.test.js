import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatisticsManager } from '../js/statistics.js';

/**
 * Focused tests for js/statistics.ts (previously ~57% line coverage).
 * Exercises the tracking methods, derived stats (with divide-by-zero guards),
 * persistence (localStorage) and flat-state export.
 */

describe('StatisticsManager', () => {
    let stats;

    beforeEach(() => {
        localStorage.clear();
        stats = new StatisticsManager();
        // constructor loaded from cleared storage -> defaults
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('starts with default stats', () => {
        expect(stats.get('gamesPlayed')).toBe(0);
        expect(stats.get('turns')).toBe(0);
        expect(stats.get('fame')).toBe(0);
        expect(stats.get('manaByColor')).toEqual({
            red: 0, blue: 0, white: 0, green: 0, gold: 0, black: 0
        });
    });

    it('increment increases a numeric stat and persists', () => {
        stats.increment('turns');
        stats.increment('turns');
        expect(stats.get('turns')).toBe(2);
        expect(localStorage.getItem('mageKnight_statistics')).toBeTruthy();
    });

    it('increment ignores unknown stat names', () => {
        expect(() => stats.increment('notARealStat')).not.toThrow();
    });

    it('increment with custom amount', () => {
        stats.increment('totalDamageDealt', 15);
        expect(stats.get('totalDamageDealt')).toBe(15);
    });

    it('set assigns a value and persists', () => {
        stats.set('fame', 42);
        expect(stats.get('fame')).toBe(42);
    });

    it('set ignores unknown stat names', () => {
        expect(() => stats.set('nope', 1)).not.toThrow();
    });

    it('getAll returns a copy of all stats', () => {
        const all = stats.getAll();
        expect(all.turns).toBe(0);
        all.turns = 99;
        expect(stats.get('turns')).toBe(0); // original untouched
    });

    it('getState flattens nested manaByColor', () => {
        stats.trackManaUsed('red');
        const flat = stats.getState();
        expect(flat['manaByColor.red']).toBe(1);
        expect(flat['turns']).toBe(0);
        expect(flat['victory']).toBe(0); // boolean -> 0
    });

    it('tracks card played and buckets by color', () => {
        stats.trackCardPlayed({ color: 'red' });
        stats.trackCardPlayed({ color: 'blue' });
        stats.trackCardPlayed({ color: 'green' });
        stats.trackCardPlayed({ color: 'white' });
        stats.trackCardPlayed({ color: 'unknown' }); // no bucket
        expect(stats.get('cardsPlayed')).toBe(5);
        expect(stats.get('attackCardsPlayed')).toBe(1);
        expect(stats.get('blockCardsPlayed')).toBe(1);
        expect(stats.get('movementCardsPlayed')).toBe(1);
        expect(stats.get('influenceCardsPlayed')).toBe(1);
    });

    it('tracks enemy defeated and dragon subtype', () => {
        stats.trackEnemyDefeated({ type: 'goblin' });
        stats.trackEnemyDefeated({ type: 'dragon' });
        expect(stats.get('enemiesDefeated')).toBe(2);
        expect(stats.get('dragonsDefeated')).toBe(1);
    });

    it('tracks combat win with and without perfect flag', () => {
        stats.trackCombat(true, 0); // perfect
        stats.trackCombat(true, 3); // win, not perfect
        stats.trackCombat(false, 5); // loss
        expect(stats.get('combatsWon')).toBe(2);
        expect(stats.get('combatsLost')).toBe(1);
        expect(stats.get('perfectCombats')).toBe(1);
    });

    it('tracks mana usage per color', () => {
        stats.trackManaUsed('blue');
        stats.trackManaUsed('blue');
        stats.trackManaUsed('green');
        expect(stats.get('manaUsed')).toBe(3);
        expect(stats.get('manaByColor').blue).toBe(2);
        expect(stats.get('manaByColor').green).toBe(1);
    });

    it('tracks exploration, site visit, movement and turn', () => {
        stats.trackExploration();
        stats.trackSiteVisit();
        stats.trackMovement(3);
        stats.trackTurn();
        expect(stats.get('tilesExplored')).toBe(1);
        expect(stats.get('sitesVisited')).toBe(1);
        expect(stats.get('hexesMoved')).toBe(1);
        expect(stats.get('totalMovement')).toBe(3);
        expect(stats.get('turns')).toBe(1);
    });

    it('tracks level up', () => {
        stats.trackLevelUp(5);
        expect(stats.get('level')).toBe(5);
    });

    it('getWinRate handles zero games', () => {
        expect(stats.getWinRate()).toBe(0);
    });

    it('getWinRate computes rounded percentage', () => {
        stats.set('gamesWon', 3);
        stats.set('gamesLost', 1);
        // 3 / 4 = 75%
        expect(stats.getWinRate()).toBe(75);
    });

    it('getCombatSuccessRate handles zero combats', () => {
        expect(stats.getCombatSuccessRate()).toBe(0);
    });

    it('getCombatSuccessRate computes rounded percentage', () => {
        stats.set('combatsWon', 1);
        stats.set('combatsLost', 3);
        // 1 / 4 = 25%
        expect(stats.getCombatSuccessRate()).toBe(25);
    });

    it('getAverageTurns handles zero games', () => {
        expect(stats.getAverageTurns()).toBe(0);
    });

    it('getAverageTurns computes rounded average', () => {
        stats.set('turns', 10);
        stats.set('gamesPlayed', 3);
        // round(10 / 3) = 3
        expect(stats.getAverageTurns()).toBe(3);
    });

    it('getFavoriteColor returns the most-used color', () => {
        stats.trackManaUsed('red');
        stats.trackManaUsed('red');
        stats.trackManaUsed('blue');
        expect(stats.getFavoriteColor()).toBe('red');
    });

    it('getFavoriteColor returns "none" when nothing used', () => {
        expect(stats.getFavoriteColor()).toBe('none');
    });

    it('startGame resets current stats but keeps global counters', () => {
        stats.set('gamesWon', 7);
        stats.set('gamesLost', 2);
        stats.set('totalPlayTime', 12345);
        stats.trackTurn();
        stats.trackTurn();

        stats.startGame();
        // global preserved
        expect(stats.get('gamesWon')).toBe(7);
        expect(stats.get('gamesLost')).toBe(2);
        expect(stats.get('totalPlayTime')).toBe(12345);
        // current reset, but gamesPlayed incremented
        expect(stats.get('turns')).toBe(0);
        expect(stats.get('gamesPlayed')).toBe(1);
    });

    it('endGame records victory and win/loss counters', () => {
        stats.endGame(true);
        expect(stats.get('victory')).toBe(true);
        expect(stats.get('gamesWon')).toBe(1);

        stats.endGame(false);
        expect(stats.get('victory')).toBe(false);
        expect(stats.get('gamesLost')).toBe(1);
    });

    it('getSummary aggregates derived stats', () => {
        stats.set('gamesWon', 2);
        stats.set('gamesLost', 1);
        stats.set('turns', 9);
        stats.set('gamesPlayed', 2);
        stats.trackManaUsed('red');
        const summary = stats.getSummary();
        expect(summary.winRate).toBe(67); // round(2/3*100)
        expect(summary.averageTurns).toBe(5); // round(9/2)
        expect(summary.favoriteColor).toBe('red');
        expect(summary.combatSuccessRate).toBe(0); // no combats
        expect(summary.explorationProgress).toBe(0);
    });

    it('reset restores defaults and persists', () => {
        stats.set('fame', 100);
        stats.reset();
        expect(stats.get('fame')).toBe(0);
    });

    it('export returns a JSON string', () => {
        const out = stats.export();
        expect(typeof out).toBe('string');
        expect(JSON.parse(out).gamesPlayed).toBe(0);
    });

    it('loadState merges over defaults', () => {
        stats.loadState({ fame: 55, turns: 3 });
        expect(stats.get('fame')).toBe(55);
        expect(stats.get('turns')).toBe(3);
        // untouched stat still default
        expect(stats.get('level')).toBe(1);
    });

    it('loadState with null is a no-op', () => {
        stats.set('fame', 9);
        stats.loadState(null);
        expect(stats.get('fame')).toBe(9);
    });

    it('save handles missing localStorage gracefully', () => {
        const orig = global.localStorage;
        // simulate environment without localStorage
        global.localStorage = undefined;
        expect(() => stats.save()).not.toThrow();
        global.localStorage = orig;
    });

    it('load handles missing localStorage gracefully', () => {
        const orig = global.localStorage;
        global.localStorage = undefined;
        const s2 = new StatisticsManager();
        expect(s2.get('turns')).toBe(0);
        global.localStorage = orig;
    });

    it('load tolerates corrupt stored data', () => {
        localStorage.setItem('mageKnight_statistics', 'not-json{');
        const s2 = new StatisticsManager();
        expect(s2.get('turns')).toBe(0); // falls back to defaults
    });

    it('load reads previously saved state', () => {
        stats.set('fame', 77);
        stats.save();
        const s2 = new StatisticsManager();
        expect(s2.get('fame')).toBe(77);
    });
});
