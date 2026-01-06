
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatisticsManager } from '../js/statistics.js';

describe('StatisticsManager', () => {
    let stats;
    let mockStorage;

    beforeEach(() => {
        // Mock localStorage
        mockStorage = {};
        global.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => mockStorage[key] = val,
            removeItem: (key) => delete mockStorage[key]
        };

        stats = new StatisticsManager();
    });

    afterEach(() => {
        delete global.localStorage;
    });

    describe('Initialization', () => {
        it('should initialize with default stats', () => {
            expect(stats.get('gamesPlayed')).toBe(0);
            expect(stats.get('totalDamageDealt')).toBe(0);
            expect(stats.get('victory')).toBe(false);
        });

        it('should load stats from storage on init', () => {
            const savedStats = { gamesPlayed: 5, gamesWon: 2 };
            mockStorage['mageKnight_statistics'] = JSON.stringify({ stats: savedStats });

            const newStats = new StatisticsManager();
            expect(newStats.get('gamesPlayed')).toBe(5);
            expect(newStats.get('gamesWon')).toBe(2);
        });
    });

    describe('Tracking', () => {
        it('should increment stats', () => {
            stats.increment('gamesPlayed');
            expect(stats.get('gamesPlayed')).toBe(1);

            stats.increment('gamesPlayed', 2);
            expect(stats.get('gamesPlayed')).toBe(3);
        });

        it('should set stats explicitly', () => {
            stats.set('level', 5);
            expect(stats.get('level')).toBe(5);
        });

        it('should track card played', () => {
            stats.trackCardPlayed({ color: 'red' });

            expect(stats.get('cardsPlayed')).toBe(1);
            expect(stats.get('attackCardsPlayed')).toBe(1);
            expect(stats.get('blockCardsPlayed')).toBe(0);
        });

        it('should track enemy defeated', () => {
            stats.trackEnemyDefeated({ type: 'orc' });
            expect(stats.get('enemiesDefeated')).toBe(1);
            expect(stats.get('dragonsDefeated')).toBe(0);

            stats.trackEnemyDefeated({ type: 'dragon' });
            expect(stats.get('enemiesDefeated')).toBe(2);
            expect(stats.get('dragonsDefeated')).toBe(1);
        });

        it('should track combat results', () => {
            stats.trackCombat(true, 0); // Won, perfect
            expect(stats.get('combatsWon')).toBe(1);
            expect(stats.get('perfectCombats')).toBe(1);

            stats.trackCombat(false, 3); // Lost
            expect(stats.get('combatsLost')).toBe(1);
        });

        it('should track mana usage', () => {
            stats.trackManaUsed('blue');
            expect(stats.get('manaUsed')).toBe(1);
            expect(stats.getAll().manaByColor.blue).toBe(1);
            expect(stats.getAll().manaByColor.red).toBe(0);
        });
    });

    describe('Game Flow', () => {
        it('should handle game start', () => {
            stats.set('gamesPlayed', 10);
            stats.set('turns', 50); // Current game stat

            stats.startGame();

            expect(stats.get('gamesPlayed')).toBe(11); // incremented
            expect(stats.get('turns')).toBe(0); // reset
        });

        it('should handle game end victory', () => {
            stats.endGame(true);

            expect(stats.get('victory')).toBe(true);
            expect(stats.get('gamesWon')).toBe(1);
        });

        it('should handle game end loss', () => {
            stats.endGame(false);

            expect(stats.get('victory')).toBe(false);
            expect(stats.get('gamesLost')).toBe(1);
        });
    });

    describe('Analysis', () => {
        it('should calculate win rate', () => {
            stats.set('gamesWon', 6);
            stats.set('gamesLost', 4);
            // Total 10, won 6 => 60%
            expect(stats.getWinRate()).toBe(60);
        });

        it('should determine favorite color', () => {
            stats.trackManaUsed('red');
            stats.trackManaUsed('red');
            stats.trackManaUsed('blue');

            expect(stats.getFavoriteColor()).toBe('red');
        });

        it('should return summary', () => {
            const summary = stats.getSummary();
            expect(summary).toBeDefined();
            expect(summary.winRate).toBeDefined();
            expect(summary.favoriteColor).toBeDefined();
        });
    });

    describe('Persistence', () => {
        it('should save to storage', () => {
            stats.increment('gamesPlayed');
            // stats.save() is called automatically by increment/set

            const stored = JSON.parse(mockStorage['mageKnight_statistics']);
            expect(stored.stats.gamesPlayed).toBe(1);
        });

        it('should reset stats', () => {
            stats.increment('gamesPlayed');
            stats.reset();
            expect(stats.get('gamesPlayed')).toBe(0);
        });

        it('should export stats as JSON', () => {
            stats.increment('gamesPlayed');
            const exported = stats.export();
            expect(exported).toContain('gamesPlayed');
            expect(exported).toContain('1');
        });
    });

    describe('Additional Tracking', () => {
        it('should track exploration', () => {
            stats.trackExploration();
            expect(stats.get('tilesExplored')).toBe(1);
        });

        it('should track site visit', () => {
            stats.trackSiteVisit();
            expect(stats.get('sitesVisited')).toBe(1);
        });

        it('should track movement', () => {
            stats.trackMovement(3);
            expect(stats.get('hexesMoved')).toBe(1);
            expect(stats.get('totalMovement')).toBe(3);
        });

        it('should track turn', () => {
            stats.trackTurn();
            expect(stats.get('turns')).toBe(1);
        });

        it('should track level up', () => {
            stats.trackLevelUp(3);
            expect(stats.get('level')).toBe(3);
        });
    });

    describe('Additional Analysis', () => {
        it('should calculate average turns', () => {
            stats.set('gamesPlayed', 4);
            stats.set('turns', 20);
            expect(stats.getAverageTurns()).toBe(5);
        });

        it('should handle zero games for average turns', () => {
            expect(stats.getAverageTurns()).toBe(0);
        });

        it('should calculate combat success rate', () => {
            stats.set('combatsWon', 7);
            stats.set('combatsLost', 3);
            expect(stats.getCombatSuccessRate()).toBe(70);
        });

        it('should handle zero combats for success rate', () => {
            expect(stats.getCombatSuccessRate()).toBe(0);
        });

        it('should handle zero games/losses for win rate', () => {
            expect(stats.getWinRate()).toBe(0);
        });

        it('should return none for favorite color when no mana used', () => {
            expect(stats.getFavoriteColor()).toBe('none');
        });
    });

    describe('Edge Cases', () => {
        it('should ignore invalid stat names for increment', () => {
            stats.increment('invalidStat');
            expect(stats.get('invalidStat')).toBeUndefined();
        });

        it('should ignore invalid stat names for set', () => {
            stats.set('invalidStat', 10);
            expect(stats.get('invalidStat')).toBeUndefined();
        });

        it('should track card without color', () => {
            stats.trackCardPlayed({});
            expect(stats.get('cardsPlayed')).toBe(1);
        });

        it('should handle invalid mana color', () => {
            stats.trackManaUsed('invalid');
            expect(stats.get('manaUsed')).toBe(1);
            // Invalid color should not crash
        });

        it('should track combat with wounds taken (non-perfect)', () => {
            stats.trackCombat(true, 2);
            expect(stats.get('combatsWon')).toBe(1);
            expect(stats.get('perfectCombats')).toBe(0);
        });
    });
});
