import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { UI } from '../js/ui.js';
import { AchievementManager } from '../js/achievements.js';
import { StatisticsManager } from '../js/statistics.js';
import { MockHTMLElement } from './test-mocks.js';

describe('Coverage Boost V3', () => {
    let game;
    let ui;

    beforeEach(() => {
        // Global setup.js handles basic mocks, but we might need specific things
        game = new MageKnightGame();
        ui = game.ui;
    });

    describe('Game & UI Integration', () => {
        it('should handle modal outside clicks', () => {
            const achievementsModal = document.getElementById('achievements-modal');
            const statsModal = document.getElementById('statistics-modal');

            achievementsModal.style.display = 'block';
            statsModal.style.display = 'block';

            // Simulate click on achievements modal (outside content)
            const clickEvent = { target: achievementsModal };
            window.dispatchEvent(new CustomEvent('click', { detail: clickEvent }));
            // Since our mock window listener doesn't perfectly match browser behavior for 'target', 
            // we call the listener manually or ensure dispatchEvent passes the target correctly.
            // In game.js: window.addEventListener('click', (e) => { ... if (e.target === achievementsModal) ... })

            // Trigger the listener directly if dispatchEvent is not enough
            // But let's try dispatchEvent first if it's set up in setup.js/test-mocks.js
            window.dispatchEvent({ type: 'click', target: achievementsModal });
            expect(achievementsModal.style.display).toBe('none');

            window.dispatchEvent({ type: 'click', target: statsModal });
            expect(statsModal.style.display).toBe('none');
        });

        it('should render global statistics', () => {
            // Ensure elements exist in mock DOM
            const grid = document.createElement('div');
            grid.id = 'statistics-grid';
            document.body.appendChild(grid);

            game.renderStatistics('global');

            // Check if cards were created
            expect(grid.children.length).toBeGreaterThan(0);
            expect(grid.innerHTML).toContain('Spiele gespielt');
            expect(grid.innerHTML).toContain('Siege');
        });

        it('should trigger DOMContentLoaded logic', () => {
            // We can't easily re-run the module level listener, but we can verify the constructor works
            const newGame = new MageKnightGame();
            expect(newGame).toBeDefined();
            expect(window.game).toBeDefined();
        });

        it('should handle achievement rewards', () => {
            const mockAchievement = {
                name: 'Test Achievement',
                description: 'Test Desc',
                reward: { fame: 10 }
            };

            // Mock checkAchievements to return our test achievement
            const originalCheck = game.achievementManager.checkAchievements;
            game.achievementManager.checkAchievements = () => [mockAchievement];

            const initialFame = game.hero.fame;
            game.checkAndShowAchievements();

            expect(game.hero.fame).toBe(initialFame + 10);
            game.achievementManager.checkAchievements = originalCheck;
        });
    });

    describe('UI Detailed Interactions', () => {
        it('should handle unit card hover effects', () => {
            const units = [{
                getName: () => 'Peasant',
                getIcon: () => 'P',
                level: 1,
                isReady: () => true,
                wounds: 0,
                getAbilities: () => [],
                armor: 2
            }];

            ui.renderUnits(units);
            const unitCard = ui.elements.heroUnits.querySelector('.unit-card');

            expect(unitCard).toBeDefined();

            // Simulate mouseenter
            unitCard.dispatchEvent({ type: 'mouseenter' });
            expect(unitCard.style.transform).toBe('translateY(-2px)');

            // Simulate mouseleave
            unitCard.dispatchEvent({ type: 'mouseleave' });
            expect(unitCard.style.transform).toBe('translateY(0)');
        });

        it('should style unit combat cards based on status', () => {
            const units = [
                {
                    getName: () => 'ReadyUnit',
                    getIcon: () => 'R',
                    isReady: () => true,
                    getAbilities: () => [{ type: 'attack', text: 'Strike' }]
                },
                {
                    getName: () => 'ExhaustedUnit',
                    getIcon: () => 'E',
                    isReady: () => false,
                    getAbilities: () => [{ type: 'attack', text: 'Strike' }]
                }
            ];

            ui.renderUnitsInCombat(units, 'attack');

            const cards = ui.elements.combatUnits.querySelectorAll('.unit-combat-card');
            expect(cards.length).toBe(2);

            expect(cards[0].style.opacity).toBe('1');
            expect(cards[1].style.opacity).toBe('0.5');
            expect(cards[1].style.filter).toContain('grayscale');
        });

        it('should filter unit abilities by combat phase', () => {
            const unit = {
                getName: () => 'VersatileUnit',
                getIcon: () => 'V',
                isReady: () => true,
                getAbilities: () => [
                    { type: 'attack', text: 'Strike' },
                    { type: 'block', text: 'Guard' }
                ]
            };

            // Attack phase
            ui.renderUnitsInCombat([unit], 'attack');
            expect(ui.elements.combatUnits.innerHTML).toContain('Strike');
            expect(ui.elements.combatUnits.innerHTML).not.toContain('Guard');

            // Block phase
            ui.renderUnitsInCombat([unit], 'block');
            expect(ui.elements.combatUnits.innerHTML).toContain('Guard');
            expect(ui.elements.combatUnits.innerHTML).not.toContain('Strike');
        });
    });

    describe('Achievements & Statistics Resilience', () => {
        let originalConsoleError;

        beforeEach(() => {
            originalConsoleError = console.error;
            console.error = () => { };
        });

        afterEach(() => {
            console.error = originalConsoleError;
        });

        it('should handle localStorage errors in AchievementManager', () => {
            const originalGetItem = localStorage.getItem;
            const originalSetItem = localStorage.setItem;

            // Mock localStorage to throw
            localStorage.getItem = () => { throw new Error('Storage Full'); };
            localStorage.setItem = () => { throw new Error('Storage Full'); };

            const am = new AchievementManager();
            // Should not crash during load
            am.load();

            // Should not crash during save
            am.save();

            localStorage.getItem = originalGetItem;
            localStorage.setItem = originalSetItem;
        });

        it('should handle localStorage errors in StatisticsManager', () => {
            const originalGetItem = localStorage.getItem;
            const originalSetItem = localStorage.setItem;

            // Mock localStorage to return garbage or throw
            localStorage.getItem = () => { return 'invalid-json'; };

            const sm = new StatisticsManager();
            // Should not crash, and use defaults
            expect(sm.get('gamesPlayed')).toBe(0);

            localStorage.setItem = () => { throw new Error('Quota Exceeded'); };
            sm.save(); // Should catch error

            localStorage.getItem = originalGetItem;
            localStorage.setItem = originalSetItem;
        });
    });
});
