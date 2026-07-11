import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderController } from '../js/game/RenderController.js';

function makeGame(overrides = {}) {
    return {
        ui: {
            renderHandCards: vi.fn(),
            renderManaSource: vi.fn(),
            updateHeroStats: vi.fn(),
            updateMovementPoints: vi.fn(),
            renderUnits: vi.fn(),
            setButtonEnabled: vi.fn(),
            elements: {
                exploreBtn: { title: '', style: {} },
            },
        },
        hero: {
            hand: [{ name: 'Card1' }],
            units: [],
            wounds: 0,
            deck: [],
            discard: [],
            fame: 0,
            movementPoints: 0,
            position: { q: 0, r: 0 },
        },
        manaSource: {},
        interactionController: {
            handleCardClick: vi.fn(),
            handleCardRightClick: vi.fn(),
            handleManaClick: vi.fn(),
        },
        timeManager: { isNight: () => false },
        achievementManager: {
            getProgress: () => ({ unlocked: 2, total: 16, percentage: 12 }),
            achievements: {
                FIRST_BLOOD: { id: 'first_blood', name: 'Erster Sieg', description: 'x', category: 'combat', icon: '⚔️' },
                EXPLORER: { id: 'explorer', name: 'Forscher', description: 'y', category: 'exploration', icon: '🗺️' },
            },
            isUnlocked: (id) => id === 'first_blood',
        },
        statisticsManager: {
            getAll: () => ({
                gamesPlayed: 3, gamesWon: 1, gamesLost: 2, enemiesDefeated: 5,
                highestLevel: 4, perfectCombats: 2,
            }),
        },
        turnNumber: 7,
        combat: null,
        movementMode: false,
        mapManager: { canExplore: () => true },
        hexGrid: { getHex: () => null },
        ...overrides,
    };
}

describe('RenderController', () => {
    let game;
    let rc;

    beforeEach(() => {
        document.body.innerHTML = '';
        game = makeGame();
        rc = new RenderController(game);
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('renderHand', () => {
        it('delegates to ui.renderHandCards with click handlers', () => {
            rc.renderHand();
            expect(game.ui.renderHandCards).toHaveBeenCalled();
            const args = game.ui.renderHandCards.mock.calls[0];
            expect(args[0]).toBe(game.hero.hand);
            expect(typeof args[1]).toBe('function');
            expect(typeof args[2]).toBe('function');
            // Exercise the click callbacks -> delegate to interactionController
            args[1](2, { name: 'C' });
            args[2](3, { name: 'D' });
            expect(game.interactionController.handleCardClick).toHaveBeenCalledWith(2, { name: 'C' });
            expect(game.interactionController.handleCardRightClick).toHaveBeenCalledWith(3, { name: 'D' });
        });

        it('is a no-op without ui', () => {
            game.ui = null;
            expect(() => rc.renderHand()).not.toThrow();
        });
    });

    describe('renderMana', () => {
        it('delegates to ui.renderManaSource with night flag', () => {
            rc.renderMana();
            expect(game.ui.renderManaSource).toHaveBeenCalled();
            const args = game.ui.renderManaSource.mock.calls[0];
            expect(args[0]).toBe(game.manaSource);
            expect(args[2]).toBe(false); // isNight
            // Exercise the mana click callback -> delegate to interactionController
            expect(typeof args[1]).toBe('function');
            args[1](1, 'blue');
            expect(game.interactionController.handleManaClick).toHaveBeenCalledWith(1, 'blue');
        });

        it('is a no-op without ui', () => {
            game.ui = null;
            expect(() => rc.renderMana()).not.toThrow();
        });
    });

    describe('renderAchievements', () => {
        it('renders all achievements when category is all', () => {
            document.body.innerHTML = '<div id="achievements-list"></div>';
            rc.renderAchievements('all');
            const list = document.getElementById('achievements-list');
            expect(list.children.length).toBe(2);
        });

        it('filters by category', () => {
            document.body.innerHTML = '<div id="achievements-list"></div>';
            rc.renderAchievements('combat');
            const list = document.getElementById('achievements-list');
            expect(list.children.length).toBe(1);
            expect(list.children[0].className).toContain('unlocked');
        });

        it('updates progress bar and text when present', () => {
            document.body.innerHTML = `
                <div id="achievements-list"></div>
                <div id="achievements-progress-bar"></div>
                <div id="achievements-progress-text"></div>`;
            rc.renderAchievements('all');
            const bar = document.getElementById('achievements-progress-bar');
            const text = document.getElementById('achievements-progress-text');
            expect(bar.style.width).toContain('12%');
            expect(text.textContent).toBeTruthy();
        });

        it('is a no-op when list missing', () => {
            document.body.innerHTML = '';
            expect(() => rc.renderAchievements('all')).not.toThrow();
        });
    });

    describe('renderStatistics', () => {
        it('renders global stats', () => {
            document.body.innerHTML = '<div id="statistics-grid"></div>';
            rc.renderStatistics('global');
            const grid = document.getElementById('statistics-grid');
            expect(grid.children.length).toBeGreaterThan(0);
        });

        it('renders session stats using hero/game data', () => {
            document.body.innerHTML = '<div id="statistics-grid"></div>';
            game.hero.fame = 9;
            game.hero.wounds = 2;
            game.hero.units = [{}, {}];
            rc.renderStatistics('session');
            const grid = document.getElementById('statistics-grid');
            expect(grid.children.length).toBe(5);
        });

        it('is a no-op when grid missing', () => {
            document.body.innerHTML = '';
            expect(() => rc.renderStatistics('global')).not.toThrow();
        });
    });

    describe('updatePhaseIndicator', () => {
        it('is a no-op without phase elements', () => {
            document.body.innerHTML = '';
            expect(() => rc.updatePhaseIndicator()).not.toThrow();
        });

        it('shows combat phase when in combat', () => {
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            game.combat = { phase: 'attack' };
            rc.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toBeTruthy();
        });

        it('shows movement phase when movementMode', () => {
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            game.movementMode = true;
            game.hero.movementPoints = 3;
            rc.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toBeTruthy();
            expect(document.getElementById('phase-hint').textContent).toBeTruthy();
        });

        it('shows exploration phase by default', () => {
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            rc.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toBeTruthy();
        });
    });

    describe('updateStats', () => {
        it('is a no-op without ui', () => {
            game.ui = null;
            expect(() => rc.updateStats()).not.toThrow();
        });

        it('updates hero stats, movement points, units', () => {
            rc.updateStats();
            expect(game.ui.updateHeroStats).toHaveBeenCalledWith(game.hero);
            expect(game.ui.updateMovementPoints).toHaveBeenCalledWith(0);
            expect(game.ui.renderUnits).toHaveBeenCalledWith(game.hero.units);
        });

        it('enables explore button when can explore and has points', () => {
            game.hero.movementPoints = 3;
            rc.updateStats();
            expect(game.ui.setButtonEnabled).toHaveBeenCalledWith(game.ui.elements.exploreBtn, true);
        });

        it('disables explore button when no points', () => {
            game.hero.movementPoints = 0;
            rc.updateStats();
            expect(game.ui.setButtonEnabled).toHaveBeenCalledWith(game.ui.elements.exploreBtn, false);
        });

        it('shows visit button when on a site', () => {
            document.body.innerHTML = '<button id="visit-btn"></button>';
            game.hexGrid.getHex = () => ({ site: { getName: () => 'Mine' } });
            rc.updateStats();
            const btn = document.getElementById('visit-btn');
            expect(game.ui.setButtonEnabled).toHaveBeenCalledWith(btn, true);
            expect(btn.style.display).toBe('inline-block');
            expect(btn.textContent).toContain('Mine');
        });

        it('disables explore and visit while in combat', () => {
            document.body.innerHTML = '<button id="visit-btn"></button>';
            game.combat = { phase: 'block' };
            game.hero.movementPoints = 5;
            game.hexGrid.getHex = () => ({ site: { getName: () => 'Mine' } });
            rc.updateStats();
            // explore disabled due to combat
            expect(game.ui.setButtonEnabled).toHaveBeenCalledWith(game.ui.elements.exploreBtn, false);
            const btn = document.getElementById('visit-btn');
            // visit disabled due to combat (even though site present)
            expect(game.ui.setButtonEnabled).toHaveBeenCalledWith(btn, false);
        });

        it('hides visit button when no site present', () => {
            document.body.innerHTML = '<button id="visit-btn"></button>';
            game.hexGrid.getHex = () => ({ site: null });
            rc.updateStats();
            const btn = document.getElementById('visit-btn');
            expect(btn.style.display).toBe('none');
        });
    });

    describe('_getExploreTitle', () => {
        it('returns explore message when able', () => {
            expect(rc['_getExploreTitle'](true, true)).toContain('Erkunden');
        });

        it('returns no-unknown-terrain message when cannot explore', () => {
            expect(rc['_getExploreTitle'](false, true)).toContain('angrenzend');
        });

        it('returns not-enough-points message when no points', () => {
            expect(rc['_getExploreTitle'](true, false)).toContain('Bewegungspunkte');
        });
    });
});
