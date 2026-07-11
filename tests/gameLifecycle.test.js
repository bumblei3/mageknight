import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { eventBus } from '../js/eventBus.js';
import { GAME_EVENTS, TIME_OF_DAY } from '../js/constants.js';
import { store } from '../js/store.js';
import { createSpy } from './test-mocks.js';

function makeGame() {
    document.body.innerHTML = `
        <canvas id="game-board"></canvas>
        <div id="game-log"></div>
        <div id="hand-cards"></div>
        <div id="mana-source"></div>
        <div id="fame-value">0</div>
        <div id="reputation-value">0</div>
        <div id="hero-armor">0</div>
        <div id="hero-handlimit">0</div>
        <div id="hero-wounds">0</div>
        <div id="hero-name">Hero</div>
        <div id="movement-points">0</div>
        <div id="skill-list"></div>
        <div id="healing-points">0</div>
        <div id="mana-bank"></div>
        <div id="particle-layer" class="canvas-layer"></div>
        <div id="game-container" style="position: relative;"></div>
    `;
    const game = new MageKnightGame();
    // Mock UI to avoid DOM side effects
    game.ui = {
        addLog: createSpy(),
        showCombatPanel: createSpy(),
        hideCombatPanel: createSpy(),
        updateCombatInfo: createSpy(),
        updatePhaseIndicator: createSpy(),
        updateStats: createSpy(),
        renderHand: createSpy(),
        renderHandCards: createSpy(),
        updateHeroStats: createSpy(),
        updateMovementPoints: createSpy(),
        renderUnits: createSpy(),
        setButtonEnabled: createSpy(),
        showScenarioSelection: createSpy(() => Promise.resolve()),
        showHeroSelection: createSpy(() => Promise.resolve()),
        showSaveLoad: createSpy(() => Promise.resolve(null)),
        showSettings: createSpy(() => Promise.resolve()),
        showShortcuts: createSpy(() => Promise.resolve()),
        refreshTranslations: createSpy(),
        setupHelpSystem: createSpy(),
        setupParticleSystem: createSpy(() => null),
        destroy: createSpy(),
        elements: {
            playedCards: { getBoundingClientRect: () => ({ top: 0, right: 0 }) },
            handCards: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 100 }) },
            exploreBtn: { style: {} },
            visitBtn: { style: {} },
            gameContainer: { style: { position: 'relative' } },
        },
    };
    return game;
}

describe('MageKnightGame - visual effects, achievements, lifecycle', () => {
    let game;

    beforeEach(() => {
        store.clearListeners();
        store.reset();
        eventBus.clear();
        game = makeGame();
    });

    afterEach(() => {
        eventBus.clear();
        store.clearListeners();
        vi.restoreAllMocks();
    });

    describe('haptics', () => {
        it('vibrates when navigator.vibration is available', () => {
            const vib = vi.fn();
            navigator.vibration = vib;
            game.haptics(50);
            expect(vib).toHaveBeenCalledWith(50);
            delete navigator.vibration;
        });

        it('does nothing when navigator.vibration is missing', () => {
            const orig = navigator.vibration;
            delete navigator.vibration;
            expect(() => game.haptics(50)).not.toThrow();
            if (orig !== undefined) navigator.vibration = orig;
        });
    });

    describe('addLog', () => {
        it('emits LOG_ADDED for a non-empty message', () => {
            let captured = null;
            eventBus.on(GAME_EVENTS.LOG_ADDED, (d) => { captured = d; });
            game.addLog('Hallo Welt', 'info');
            expect(captured).not.toBeNull();
            expect(captured.message).toBe('Hallo Welt');
            expect(captured.type).toBe('info');
        });

        it('does not emit for an empty message', () => {
            let count = 0;
            eventBus.on(GAME_EVENTS.LOG_ADDED, () => { count++; });
            game.addLog('', 'info');
            expect(count).toBe(0);
        });
    });

    describe('setupVisualEffectsListeners', () => {
        beforeEach(() => {
            game.particleSystem = {
                triggerShake: vi.fn(),
                dustCloudEffect: vi.fn(),
                trailEffect: vi.fn(),
                shieldBlockEffect: vi.fn(),
                createFloatingText: vi.fn(),
                damageSplatter: vi.fn(),
                createDamageNumber: vi.fn(),
            };
            game.haptics = vi.fn();
            game.hexGrid = {
                axialToPixel: (q, r) => ({ x: q * 10, y: r * 10 }),
            };
        });

        it('LOG_ADDED error with Verletzung triggers shake + haptics', () => {
            eventBus.emit(GAME_EVENTS.LOG_ADDED, { type: 'error', message: 'Verletzung! -1' });
            expect(game.particleSystem.triggerShake).toHaveBeenCalled();
            expect(game.haptics).toHaveBeenCalled();
        });

        it('LOG_ADDED error without keyword does not shake', () => {
            eventBus.emit(GAME_EVENTS.LOG_ADDED, { type: 'error', message: 'Some other error' });
            expect(game.particleSystem.triggerShake).not.toHaveBeenCalled();
        });

        it('LOG_ADDED non-error does not shake', () => {
            eventBus.emit(GAME_EVENTS.LOG_ADDED, { type: 'info', message: 'Verletzung fake' });
            expect(game.particleSystem.triggerShake).not.toHaveBeenCalled();
        });

        it('HERO_MOVE_STEP triggers dust + trail', () => {
            eventBus.emit(GAME_EVENTS.HERO_MOVE_STEP, { from: { q: 0, r: 0 }, to: { q: 1, r: 0 } });
            expect(game.particleSystem.dustCloudEffect).toHaveBeenCalled();
            expect(game.particleSystem.trailEffect).toHaveBeenCalled();
        });

        it('COMBAT_BLOCK triggers shield + floating text', () => {
            eventBus.emit(GAME_EVENTS.COMBAT_BLOCK, { enemyPos: { q: 2, r: 1 } });
            expect(game.particleSystem.shieldBlockEffect).toHaveBeenCalled();
            expect(game.particleSystem.createFloatingText).toHaveBeenCalled();
        });

        it('COMBAT_DAMAGE with amount >= 3 triggers shake + haptics', () => {
            eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, { targetPos: { q: 1, r: 1 }, amount: 5 });
            expect(game.particleSystem.damageSplatter).toHaveBeenCalled();
            expect(game.particleSystem.triggerShake).toHaveBeenCalled();
            expect(game.haptics).toHaveBeenCalled();
        });

        it('COMBAT_DAMAGE with amount < 3 skips shake', () => {
            eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, { targetPos: { q: 1, r: 1 }, amount: 2 });
            expect(game.particleSystem.damageSplatter).toHaveBeenCalled();
            expect(game.particleSystem.triggerShake).not.toHaveBeenCalled();
            expect(game.haptics).not.toHaveBeenCalled();
        });
    });

    describe('triggerDamageFeedback', () => {
        it('calls particle effects when particleSystem present', () => {
            game.particleSystem = {
                createDamageNumber: vi.fn(),
                triggerShake: vi.fn(),
            };
            game.triggerDamageFeedback(10, 20, 4);
            expect(game.particleSystem.createDamageNumber).toHaveBeenCalled();
            expect(game.particleSystem.triggerShake).toHaveBeenCalled();
        });

        it('is a no-op when particleSystem is null', () => {
            game.particleSystem = null;
            expect(() => game.triggerDamageFeedback(10, 20, 4)).not.toThrow();
        });
    });

    describe('checkAndShowAchievements', () => {
        function mockSystems(achievements) {
            const stats = { gamesPlayed: 1 };
            const achievementManager = {
                checkAchievements: vi.fn(() => achievements),
                setGame: vi.fn(),
            };
            const statisticsManager = {
                getAll: vi.fn(() => stats),
            };
            game.achievementManager = achievementManager;
            game.statisticsManager = statisticsManager;

            let notification = null;
            eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, (d) => { notification = d; });
            return { getNotification: () => notification };
        }

        it('notifies and logs each unlocked achievement', () => {
            const { getNotification } = mockSystems([
                { name: 'First Blood', description: 'Win a battle', reward: null },
            ]);
            const result = game.checkAndShowAchievements();
            expect(result).toHaveLength(1);
            expect(getNotification()).not.toBeNull();
            expect(getNotification().message).toContain('First Blood');
        });

        it('plays sound when sound manager is available', () => {
            const soundSpy = vi.fn();
            game.sound = { achievement: soundSpy };
            mockSystems([{ name: 'A', description: 'd', reward: null }]);
            game.checkAndShowAchievements();
            expect(soundSpy).toHaveBeenCalled();
        });

        it('does not call sound when sound manager lacks achievement method', () => {
            game.sound = {};
            mockSystems([{ name: 'A', description: 'd', reward: null }]);
            expect(() => game.checkAndShowAchievements()).not.toThrow();
        });

        it('applies fame reward and triggers level-up', () => {
            const levelUpSpy = vi.fn();
            game.levelUpManager.handleLevelUp = levelUpSpy;
            const gainFameSpy = vi.fn(() => ({ leveledUp: true, newLevel: 2 }));
            game.hero.gainFame = gainFameSpy;
            mockSystems([{ name: 'A', description: 'd', reward: { fame: 3 } }]);
            game.checkAndShowAchievements();
            expect(gainFameSpy).toHaveBeenCalledWith(3);
            expect(levelUpSpy).toHaveBeenCalled();
        });

        it('does not trigger level-up when reward has no fame', () => {
            game.levelUpManager.handleLevelUp = vi.fn();
            game.hero.gainFame = vi.fn(() => ({ leveledUp: false }));
            mockSystems([{ name: 'A', description: 'd', reward: { mana: 1 } }]);
            game.checkAndShowAchievements();
            expect(game.levelUpManager.handleLevelUp).not.toHaveBeenCalled();
        });
    });

    describe('handleResize', () => {
        it('resizes canvas when present', () => {
            const canvas = document.getElementById('game-board');
            game.handleResize();
            expect(canvas.width).toBe(window.innerWidth);
            expect(canvas.height).toBe(window.innerHeight);
        });

        it('does not crash when canvas is missing', () => {
            document.body.innerHTML = '';
            expect(() => game.handleResize()).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('cleans up subsystems that exist', () => {
            const uiDestroy = vi.fn();
            const touchDestroy = vi.fn();
            const interactionDestroy = vi.fn();
            const debugDestroy = vi.fn();
            game.ui = { destroy: uiDestroy };
            game.touchController = { destroy: touchDestroy };
            game.interactionController = { destroy: interactionDestroy };
            game.debug = { destroy: debugDestroy };
            expect(() => game.destroy()).not.toThrow();
            expect(uiDestroy).toHaveBeenCalled();
            expect(touchDestroy).toHaveBeenCalled();
        });

        it('skips missing subsystems safely', () => {
            game.ui = null;
            game.touchController = null;
            game.interactionController = null;
            game.debug = null;
            expect(() => game.destroy()).not.toThrow();
        });
    });

    describe('startNewGame', () => {
        it('loads a scenario when scenarioId provided', () => {
            const loadSpy = vi.fn();
            game.scenarioManager.loadScenario = loadSpy;
            game.startNewGame('conquest', 'goldyx');
            expect(loadSpy).toHaveBeenCalledWith('conquest');
        });

        it('resets turn number and game state', () => {
            game.startNewGame(null, 'goldyx');
            expect(game.turnNumber).toBe(0);
            expect(game.gameState).toBe('playing');
        });

        it('skips tutorial in test environment', () => {
            expect(game.isTestEnvironment).toBe(true);
            const startSpy = vi.fn();
            game.tutorial = { start: startSpy };
            // In test env, the setTimeout(() => this.tutorial.start()) must NOT fire
            vi.useFakeTimers();
            game.startNewGame(null, 'goldyx');
            vi.advanceTimersByTime(2000);
            vi.useRealTimers();
            expect(startSpy).not.toHaveBeenCalled();
        });
    });

    describe('helper delegators', () => {
        it('getter/setter combat totals proxy to orchestrator', () => {
            expect(game.combatAttackTotal).toBe(0);
            game.combatAttackTotal = 7;
            expect(game.combatAttackTotal).toBe(7);
            expect(game.combatBlockTotal).toBe(0);
            game.combatBlockTotal = 3;
            expect(game.combatBlockTotal).toBe(3);
            expect(game.combatRangedTotal).toBe(0);
            expect(game.combatSiegeTotal).toBe(0);
        });

        it('turnNumber getter/setter proxy to turnManager', () => {
            game.turnNumber = 5;
            expect(game.turnNumber).toBe(5);
        });

        it('sound getter lazily initializes SoundManager', () => {
            // Reset lazy cache
            game.sound = null;
            const s = game.sound;
            expect(s).toBeTruthy();
            // second access returns same instance
            expect(game.sound).toBe(s);
        });

        it('statisticsManager getter lazily initializes', () => {
            game.statisticsManager = null;
            expect(game.statisticsManager).toBeTruthy();
        });

        it('tutorial getter lazily initializes', () => {
            game.tutorial = null;
            expect(game.tutorial).toBeTruthy();
        });

        it('showTutorial starts tutorial when present', () => {
            const startSpy = vi.fn();
            game.tutorial = { start: startSpy };
            game.showTutorial();
            expect(startSpy).toHaveBeenCalled();
        });

        it('showToast and showNotification emit events', () => {
            let toast = null, note = null;
            eventBus.on(GAME_EVENTS.TOAST_SHOW, (d) => { toast = d; });
            eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, (d) => { note = d; });
            game.showToast('hi', 'warn');
            game.showNotification('yo', 'info');
            expect(toast.message).toBe('hi');
            expect(note.message).toBe('yo');
        });

        it('getPlayableCardsCount delegates to mana source', () => {
            const result = game.getPlayableCardsCount();
            expect(result).toHaveProperty('playable');
            expect(result).toHaveProperty('total');
        });

        it('reset opens scenario selection', () => {
            const spy = vi.fn();
            game.stateManager.openScenarioSelection = spy;
            game.reset();
            expect(spy).toHaveBeenCalled();
        });

        it('createGameBoard delegates to mapManager', () => {
            const spy = vi.fn();
            game.mapManager.createStartingMap = spy;
            game.createGameBoard();
            expect(spy).toHaveBeenCalled();
        });
    });
});
