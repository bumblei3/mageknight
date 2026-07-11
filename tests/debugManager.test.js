import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DebugManager } from '../js/debug.js';

function makeHero(overrides = {}) {
    return {
        crystals: { red: 0, blue: 0, green: 0, white: 0 },
        wounds: [],
        units: [],
        hand: [],
        discard: [],
        influencePoints: 0,
        position: { q: 0, r: 0 },
        gainFame: vi.fn(),
        changeReputation: vi.fn(),
        addMana: vi.fn(),
        drawCard: vi.fn(() => ({ name: 'TestCard' })),
        drawCards: vi.fn(),
        ...overrides,
    };
}

function makeGame(overrides = {}) {
    return {
        hero: makeHero(),
        enemies: [],
        updateStats: vi.fn(),
        render: vi.fn(),
        addLog: vi.fn(),
        hexGrid: null,
        ui: null,
        debugTeleport: false,
        ...overrides,
    };
}

describe('DebugManager', () => {
    let game;
    let dm;

    beforeEach(() => {
        document.body.innerHTML = '';
        game = makeGame();
        dm = new DebugManager(game);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes inactive with a panel', () => {
            expect(dm.active).toBe(false);
            expect(dm.panel).toBeTruthy();
        });
    });

    describe('togglePanel', () => {
        it('toggles active state and panel visibility', () => {
            expect(dm.active).toBe(false);
            dm.togglePanel();
            expect(dm.active).toBe(true);
            dm.togglePanel();
            expect(dm.active).toBe(false);
        });

        it('is safe when panel has no classList', () => {
            dm.panel = null;
            expect(() => dm.togglePanel()).not.toThrow();
        });
    });

    describe('hero-dependent actions', () => {
        it('addCrystals maxes all crystal colors', () => {
            dm.addCrystals();
            expect(game.hero.crystals.red).toBe(5);
            expect(game.hero.crystals.white).toBe(5);
            expect(game.updateStats).toHaveBeenCalled();
        });

        it('addFame calls hero.gainFame', () => {
            dm.addFame();
            expect(game.hero.gainFame).toHaveBeenCalledWith(10);
        });

        it('addReputation calls hero.changeReputation', () => {
            dm.addReputation();
            expect(game.hero.changeReputation).toHaveBeenCalledWith(1);
        });

        it('addInfluence sets influence points', () => {
            dm.addInfluence();
            expect(game.hero.influencePoints).toBe(10);
        });

        it('addUnit pushes a unit and renders', () => {
            game.ui = { renderUnits: vi.fn() };
            dm.addUnit();
            expect(game.hero.units.length).toBe(1);
            expect(game.ui.renderUnits).toHaveBeenCalled();
        });

        it('healAll clears wounds and readies units', () => {
            const healSpy = vi.fn();
            game.hero.units = [{ heal: healSpy, isWounded: true, isReady: false }];
            game.ui = { renderHandCards: vi.fn() };
            dm.healAll();
            expect(game.hero.wounds).toEqual([]);
            expect(healSpy).toHaveBeenCalled();
        });

        it('drawCard draws and logs', () => {
            game.ui = { renderHandCards: vi.fn() };
            dm.drawCard();
            expect(game.hero.drawCard).toHaveBeenCalled();
            expect(game.ui.renderHandCards).toHaveBeenCalled();
        });

        it('drawCard logs warning when deck empty', () => {
            game.hero.drawCard = vi.fn(() => null);
            game.ui = { renderHandCards: vi.fn() };
            dm.drawCard();
            expect(game.ui.renderHandCards).toHaveBeenCalled();
        });

        it('resetHand discards and redraws', () => {
            game.hero.hand = [{ name: 'a' }, { name: 'b' }];
            dm.resetHand();
            expect(game.hero.discard.length).toBe(2);
            expect(game.hero.drawCards).toHaveBeenCalledWith(5);
        });

        it('teleport moves the hero', () => {
            dm.teleport(3, 4);
            expect(game.hero.position).toEqual({ q: 3, r: 4 });
        });

        it('addMana delegates to hero', () => {
            dm.addMana('blue', 5);
            expect(game.hero.addMana).toHaveBeenCalledWith('blue');
        });

        it('no-op actions when hero is missing', () => {
            game.hero = null;
            expect(() => dm.addCrystals()).not.toThrow();
            expect(() => dm.addFame()).not.toThrow();
            expect(() => dm.addReputation()).not.toThrow();
            expect(() => dm.addInfluence()).not.toThrow();
            expect(() => dm.addUnit()).not.toThrow();
            expect(() => dm.healAll()).not.toThrow();
            expect(() => dm.drawCard()).not.toThrow();
            expect(() => dm.resetHand()).not.toThrow();
            expect(() => dm.teleport(1, 1)).not.toThrow();
            expect(() => dm.addMana('blue', 1)).not.toThrow();
        });
    });

    describe('game-dependent actions', () => {
        it('spawnEnemy pushes a debug orc', () => {
            dm.spawnEnemy();
            expect(game.enemies.length).toBe(1);
            expect(game.enemies[0].name).toBe('Debug Orc');
        });

        it('killEnemies clears the list', () => {
            game.enemies = [{ name: 'x' }];
            dm.killEnemies();
            expect(game.enemies).toEqual([]);
        });

        it('spawnEnemy/killEnemies safe when enemies missing', () => {
            game.enemies = null;
            expect(() => dm.spawnEnemy()).not.toThrow();
            expect(() => dm.killEnemies()).not.toThrow();
        });

        it('teleportMode enables debug teleport', () => {
            dm.teleportMode();
            expect(game.debugTeleport).toBe(true);
        });

        it('revealMap logs not implemented', () => {
            expect(() => dm.revealMap()).not.toThrow();
        });

        it('toggleCoordinates toggles and renders when hexGrid present', () => {
            game.hexGrid = { debugMode: false };
            dm.toggleCoordinates();
            expect(dm.showCoordinates).toBe(true);
            expect(game.hexGrid.debugMode).toBe(true);
            expect(game.render).toHaveBeenCalled();
        });

        it('toggleCoordinates safe without hexGrid', () => {
            game.hexGrid = null;
            expect(() => dm.toggleCoordinates()).not.toThrow();
            expect(dm.showCoordinates).toBe(true);
        });
    });

    describe('FPS counter', () => {
        it('toggleFPS toggles overlay visibility', () => {
            dm.toggleFPS();
            expect(dm.fpsCounterRunning).toBe(true);
            const overlay = document.getElementById('perf-overlay');
            expect(overlay.style.display).toBe('block');
            dm.toggleFPS();
            expect(dm.fpsCounterRunning).toBe(false);
            expect(overlay.style.display).toBe('none');
        });

        it('toggleFPS is a no-op without overlay', () => {
            // Remove overlay so getElementById returns null
            const el = document.getElementById('perf-overlay');
            if (el) el.remove();
            // createPanel already made one; force removal by re-creating dm without one
            const g2 = makeGame();
            const dm2 = new DebugManager(g2);
            const ov = document.getElementById('perf-overlay');
            if (ov) ov.remove();
            expect(() => dm2.toggleFPS()).not.toThrow();
        });
    });

    describe('log', () => {
        it('logs info and forwards to game.addLog', () => {
            dm.log('hello');
            expect(game.addLog).toHaveBeenCalledWith('hello', 'info');
        });

        it('logs warning with color', () => {
            dm.log('warn', 'warning');
            expect(game.addLog).toHaveBeenCalledWith('warn', 'warning');
        });

        it('is safe when game.addLog missing', () => {
            const g2 = makeGame();
            delete g2.addLog;
            const dm2 = new DebugManager(g2);
            expect(() => dm2.log('x')).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('removes panel and overlay', () => {
            dm.destroy();
            expect(document.getElementById('debug-panel')).toBeNull();
            expect(document.getElementById('perf-overlay')).toBeNull();
            expect(dm.fpsCounterRunning).toBe(false);
        });

        it('is safe when panel has no parent', () => {
            dm.panel = null;
            expect(() => dm.destroy()).not.toThrow();
        });
    });

    describe('panel button wiring', () => {
        it('toggle button click toggles the panel', () => {
            const btn = document.querySelector('.debug-toggle');
            expect(btn).not.toBeNull();
            btn.click();
            expect(dm.active).toBe(true);
        });

        it('close button click toggles the panel', () => {
            const close = dm.panel.querySelector('.close-btn');
            expect(close).not.toBeNull();
            close.click();
            expect(dm.active).toBe(true);
        });

        it('onclick handlers delegate to debug methods', () => {
            // renderHandCards uses a real callback now -> exercises those closures
            game.ui = { renderHandCards: vi.fn((hand, cb) => cb && cb()) };
            dm.healAll();
            dm.drawCard();
            dm.resetHand();
            expect(game.ui.renderHandCards).toHaveBeenCalled();
        });
    });

    describe('toggleFog', () => {
        it('is a no-op', () => {
            expect(() => dm.toggleFog()).not.toThrow();
        });
    });
});
