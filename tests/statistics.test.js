import { describe, it, expect, beforeEach } from './testRunner.js';
import { StatisticsManager } from '../js/statistics.js';

describe('StatisticsManager', () => {
    let statsManager;

    beforeEach(() => {
        localStorage.clear();
        statsManager = new StatisticsManager();
        statsManager.reset();
    });

    it('should initialize with default stats', () => {
        const stats = statsManager.getAll();
        expect(stats.gamesPlayed).toBe(0);
        expect(stats.enemiesDefeated).toBe(0);
        expect(stats.level).toBe(1);
    });

    it('should increment simple stats', () => {
        statsManager.increment('enemiesDefeated');
        expect(statsManager.get('enemiesDefeated')).toBe(1);

        statsManager.increment('enemiesDefeated', 5);
        expect(statsManager.get('enemiesDefeated')).toBe(6);
    });

    it('should track card plays by color', () => {
        const redCard = { color: 'red', name: 'Attack' };
        const blueCard = { color: 'blue', name: 'Block' };

        statsManager.trackCardPlayed(redCard);
        statsManager.trackCardPlayed(blueCard);
        statsManager.trackCardPlayed(redCard);

        const stats = statsManager.getAll();
        expect(stats.cardsPlayed).toBe(3);
        expect(stats.attackCardsPlayed).toBe(2);
        expect(stats.blockCardsPlayed).toBe(1);
    });

    it('should track combat results', () => {
        // Win with 0 wounds
        statsManager.trackCombat(true, 0);
        expect(statsManager.get('combatsWon')).toBe(1);
        expect(statsManager.get('perfectCombats')).toBe(1);

        // Win with 2 wounds
        statsManager.trackCombat(true, 2);
        expect(statsManager.get('combatsWon')).toBe(2);
        expect(statsManager.get('perfectCombats')).toBe(1);

        // Loss
        statsManager.trackCombat(false, 0);
        expect(statsManager.get('combatsLost')).toBe(1);
    });

    it('should persist to localStorage', () => {
        statsManager.increment('gamesPlayed');

        // Create new instance to simulate reload
        const newManager = new StatisticsManager();
        expect(newManager.get('gamesPlayed')).toBe(1);
    });

    it('should calculate summary stats', () => {
        statsManager.increment('gamesWon');
        statsManager.increment('gamesLost');
        statsManager.set('turns', 20);
        statsManager.increment('gamesPlayed', 2); // Total 2 games

        const summary = statsManager.getSummary();
        expect(summary.winRate).toBe(50); // 1 win, 1 loss
        expect(summary.averageTurns).toBe(10); // 20 turns / 2 games
    });
});
