import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhaseManager } from '../js/game/PhaseManager.js';

function makeGame(overrides = {}) {
    return {
        gameState: 'playing',
        turnNumber: 1,
        turnManager: { endTurn: vi.fn() },
        statisticsManager: { increment: vi.fn() },
        checkAndShowAchievements: vi.fn(),
        addLog: vi.fn(),
        saveGame: vi.fn(),
        combat: null,
        movementMode: false,
        timeManager: null,
        hero: { movementPoints: 5, rest: vi.fn() },
        render: vi.fn(),
        setGameTimeout: vi.fn((fn) => fn && fn()),
        hexGrid: null,
        enemyAI: null,
        enemies: [],
        ...overrides,
    };
}

describe('PhaseManager', () => {
    let game;
    let pm;

    beforeEach(() => {
        game = makeGame();
        pm = new PhaseManager(game);
    });

    describe('endTurn', () => {
        it('delegates to turnManager, increments stats, logs, emits, autosaves', () => {
            pm.endTurn();
            expect(game.turnManager.endTurn).toHaveBeenCalledOnce();
            expect(game.statisticsManager.increment).toHaveBeenCalledWith('turns');
            expect(game.checkAndShowAchievements).toHaveBeenCalledOnce();
            expect(game.addLog).toHaveBeenCalledWith('Zug beendet.', 'info');
            expect(game.saveGame).toHaveBeenCalledWith('auto');
        });

        it('does nothing when gameState is not playing/combat', () => {
            game.gameState = 'gameover';
            pm.endTurn();
            expect(game.turnManager.endTurn).not.toHaveBeenCalled();
            expect(game.saveGame).not.toHaveBeenCalled();
        });

        it('skips turnManager when absent', () => {
            game.turnManager = null;
            expect(() => pm.endTurn()).not.toThrow();
            expect(game.saveGame).toHaveBeenCalledWith('auto');
        });

        it('works in combat state', () => {
            game.gameState = 'combat';
            pm.endTurn();
            expect(game.turnManager.endTurn).toHaveBeenCalledOnce();
        });
    });

    describe('rest', () => {
        it('ends turn on successful rest', () => {
            game.hero.rest = vi.fn().mockReturnValue({ success: true, message: 'Ruhst dich aus' });
            pm.rest();
            expect(game.addLog).toHaveBeenCalledWith('Ruhst dich aus', 'success');
            expect(game.turnManager.endTurn).toHaveBeenCalledOnce();
        });

        it('logs error and does not end turn on failed rest', () => {
            game.hero.rest = vi.fn().mockReturnValue({ success: false, message: 'Kann nicht' });
            pm.rest();
            expect(game.addLog).toHaveBeenCalledWith('Kann nicht', 'error');
            expect(game.turnManager.endTurn).not.toHaveBeenCalled();
        });

        it('does nothing when gameState is not playing', () => {
            game.gameState = 'combat';
            pm.rest();
            expect(game.hero.rest).not.toHaveBeenCalled();
        });
    });

    describe('updatePhaseIndicator', () => {
        it('updates combat phase text and hint', () => {
            game.combat = { phase: 'block' };
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            pm.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toBe('Block-Phase');
            expect(document.querySelector('#phase-hint').textContent).toContain('blaue');
        });

        it('updates movement phase when in movement mode', () => {
            game.movementMode = true;
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            pm.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toBe('Bewegung');
            expect(document.querySelector('#phase-hint').textContent).toContain('5 Punkte');
        });

        it('updates exploration phase with day icon', () => {
            game.timeManager = { isDay: () => true };
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            pm.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toContain('Erkundung');
            expect(document.querySelector('.phase-text').textContent).toContain('☀️');
        });

        it('updates exploration phase with night icon', () => {
            game.timeManager = { isDay: () => false };
            document.body.innerHTML = '<div class="phase-text"></div><div id="phase-hint"></div>';
            pm.updatePhaseIndicator();
            expect(document.querySelector('.phase-text').textContent).toContain('🌙');
        });

        it('returns early when phase elements missing (no throw)', () => {
            document.body.innerHTML = '';
            expect(() => pm.updatePhaseIndicator()).not.toThrow();
        });
    });

    describe('setupTimeListener', () => {
        it('returns early without timeManager', () => {
            pm.setupTimeListener();
            expect(game.timeManager).toBeNull();
        });

        it('registers a listener that toggles night visuals', () => {
            const listener = vi.fn();
            game.timeManager = {
                addListener: (cb) => { listener.mockImplementation(cb); },
                getState: () => ({ timeOfDay: 'day', round: 3 }),
            };
            document.body.innerHTML = '<div id="day-night-overlay"></div><div id="day-night-message"></div><div id="time-icon"></div><div id="round-number"></div>';
            pm.setupTimeListener();
            // invoke the registered listener with night state
            listener({ timeOfDay: 'night', round: 4 });
            expect(document.getElementById('time-icon').textContent).toBe('🌙');
            expect(document.getElementById('round-number').textContent).toBe('4');
        });
    });

    describe('updateTimeUI', () => {
        it('returns early without timeManager', () => {
            pm.updateTimeUI();
            expect(game.timeManager).toBeNull();
        });

        it('updates icons for day', () => {
            game.timeManager = { getState: () => ({ timeOfDay: 'day', round: 2 }) };
            document.body.innerHTML = '<div id="time-icon"></div><div id="round-number"></div>';
            pm.updateTimeUI();
            expect(document.getElementById('time-icon').textContent).toBe('☀️');
            expect(document.getElementById('round-number').textContent).toBe('2');
        });

        it('updates icons for night (numeric 1)', () => {
            game.timeManager = { getState: () => ({ timeOfDay: 1, round: 5 }) };
            document.body.innerHTML = '<div id="time-icon"></div><div id="round-number"></div>';
            pm.updateTimeUI();
            expect(document.getElementById('time-icon').textContent).toBe('🌙');
        });
    });
});
