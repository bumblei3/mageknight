import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockElement, createSpy } from './test-mocks.js';

describe('Game UI Boost', () => {
    let game;
    let originalGetElementById, originalQuerySelector, originalQuerySelectorAll, originalCreateElement;

    beforeEach(() => {
        originalGetElementById = global.document.getElementById;
        originalQuerySelector = global.document.querySelector;
        originalQuerySelectorAll = global.document.querySelectorAll;
        originalCreateElement = global.document.createElement;

        const elements = {};
        global.document.getElementById = (id) => {
            if (!elements[id]) {
                elements[id] = createMockElement('div');
                elements[id].id = id;
                if (id.includes('modal')) {
                    elements[id].style = { display: 'none' };
                }
            }
            return elements[id];
        };

        global.document.querySelector = (sel) => createMockElement('div');
        global.document.querySelectorAll = (sel) => [createMockElement('div')];
        global.document.createElement = (tag) => createMockElement(tag);

        game = new MageKnightGame();

        // Mock managers
        game.achievementManager = {
            getProgress: () => ({ unlocked: 5, total: 10, percentage: 50 }),
            achievements: {
                'ach1': { id: 'ach1', name: 'Test 1', description: 'Desc 1', category: 'combat', icon: '⚔️' },
                'ach2': { id: 'ach2', name: 'Test 2', description: 'Desc 2', category: 'exploration' }
            },
            isUnlocked: (id) => id === 'ach1',
            unlockedAchievements: new Map([['ach1', Date.now()]])
        };

        game.statisticsManager = {
            getAll: () => ({
                gamesPlayed: 10,
                gamesWon: 5,
                gamesLost: 5,
                enemiesDefeated: 100,
                highestLevel: 10,
                perfectCombats: 3
            })
        };
    });

    afterEach(() => {
        global.document.getElementById = originalGetElementById;
        global.document.querySelector = originalQuerySelector;
        global.document.querySelectorAll = originalQuerySelectorAll;
        global.document.createElement = originalCreateElement;
    });

    it('should render achievements correctly', () => {
        game.renderAchievements('all');
        const list = document.getElementById('achievements-list');
        expect(list.children.length).toBe(2);

        const card1 = list.children[0];
        expect(card1.className).toContain('unlocked');
        expect(card1.innerHTML).toContain('Test 1');
    });

    it('should filter achievements by category', () => {
        game.renderAchievements('combat');
        const list = document.getElementById('achievements-list');
        expect(list.children.length).toBe(1);
        expect(list.children[0].innerHTML).toContain('Test 1');
    });

    it('should render global statistics', () => {
        game.renderStatistics('global');
        const grid = document.getElementById('statistics-grid');
        expect(grid.children.length).toBe(6);
        expect(grid.children[0].innerHTML).toContain('10'); // gamesPlayed
    });

    it('should render session statistics', () => {
        game.hero.fame = 50;
        game.renderStatistics('session');
        const grid = document.getElementById('statistics-grid');
        // Check for value in one of the cards
        const values = Array.from(grid.children).map(c => c.querySelector('.value').innerHTML);
        expect(values).toContain('50');
    });

    it('should handle modal toggle buttons', () => {
        const statsBtn = document.getElementById('statistics-btn');
        const statsModal = document.getElementById('statistics-modal');

        game.setupUIListeners();

        statsBtn.click();
        expect(statsModal.style.display).toBe('block');
    });
});
