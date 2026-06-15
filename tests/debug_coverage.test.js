import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebugManager } from '../js/debug.js';
import { setupGlobalMocks } from './test-mocks.js';

describe('DebugManager - Coverage Boost', () => {
    let debugManager;
    let mockGame;

    beforeEach(() => {
        setupGlobalMocks();
        // Mock document
        document.body.innerHTML = '';
        
        mockGame = {
            hero: {
                crystals: { red: 0, blue: 0, green: 0, white: 0 },
                fame: 0,
                reputation: 0,
                influencePoints: 0,
                wounds: [],
                units: [],
                hand: [],
                discard: [],
                drawCard: vi.fn().mockReturnValue({ name: 'Test Card' }),
                drawCards: vi.fn(),
                gainFame: vi.fn(),
                changeReputation: vi.fn(),
                addMana: vi.fn()
            },
            enemies: [],
            hexGrid: {
                debugMode: false
            },
            updateStats: vi.fn(),
            render: vi.fn(),
            addLog: vi.fn(),
            ui: {
                renderUnits: vi.fn(),
                renderHandCards: vi.fn()
            },
            debugTeleport: false
        };

        // Mock performance
        global.performance = { now: vi.fn().mockReturnValue(1000) };
        
        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb) => {
            setTimeout(cb, 0);
            return 1;
        });
        
        debugManager = new DebugManager(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        if (debugManager && typeof debugManager.destroy === 'function') {
            debugManager.destroy();
        }
    });

    describe('constructor', () => {
        it('should initialize with game and expose to window', () => {
            expect(debugManager).toBeDefined();
            expect(debugManager.game).toBe(mockGame);
            expect(debugManager.active).toBe(false);
            expect(debugManager.showCoordinates).toBe(false);
            // window.game is set in constructor
            expect(window.game).toBe(mockGame);
        });

        it('should create panel in non-browser environment', () => {
            // This tests the early return path for missing document
            const originalDocument = global.document;
            global.document = undefined;
            
            const dm = new DebugManager(mockGame);
            expect(dm.panel).toBeDefined();
            expect(dm.panel.classList).toBeDefined();
            
            // Restore document before destroy to avoid errors
            global.document = originalDocument;
            dm.destroy();
        });

        it('should create panel with correct structure', () => {
            expect(document.getElementById('debug-panel')).not.toBeNull();
            expect(document.querySelector('.debug-toggle')).not.toBeNull();
            expect(document.getElementById('perf-overlay')).not.toBeNull();
        });

        it('should remove existing debug panel on re-init', () => {
            const oldPanel = document.getElementById('debug-panel');
            expect(oldPanel).not.toBeNull();
            
            // Re-initialize
            const newManager = new DebugManager(mockGame);
            expect(newManager.panel).not.toBe(oldPanel);
            newManager.destroy();
        });
    });

    describe('togglePanel', () => {
        it('should toggle active state and panel visibility', () => {
            expect(debugManager.active).toBe(false);
            expect(debugManager.panel.classList.contains('hidden')).toBe(true);
            
            debugManager.togglePanel();
            
            expect(debugManager.active).toBe(true);
            expect(debugManager.panel.classList.contains('hidden')).toBe(false);
            
            debugManager.togglePanel();
            
            expect(debugManager.active).toBe(false);
            expect(debugManager.panel.classList.contains('hidden')).toBe(true);
        });

        it('should handle missing panel gracefully', () => {
            debugManager.panel = null;
            expect(() => debugManager.togglePanel()).not.toThrow();
        });
    });

    describe('toggleFPS', () => {
        it('should enable FPS counter when off', () => {
            expect(debugManager.fpsCounterRunning).toBe(false);
            
            const overlay = document.getElementById('perf-overlay');
            overlay.style.display = 'none';
            
            debugManager.toggleFPS();
            
            expect(debugManager.fpsCounterRunning).toBe(true);
            expect(overlay.style.display).toBe('block');
        });

        it('should disable FPS counter when on', () => {
            debugManager.fpsCounterRunning = true;
            const overlay = document.getElementById('perf-overlay');
            overlay.style.display = 'block';
            
            debugManager.toggleFPS();
            
            expect(debugManager.fpsCounterRunning).toBe(false);
            expect(overlay.style.display).toBe('none');
        });

        it('should handle missing overlay gracefully', () => {
            const overlay = document.getElementById('perf-overlay');
            overlay.parentNode.removeChild(overlay);
            
            expect(() => debugManager.toggleFPS()).not.toThrow();
        });

        it('should start updateFPS loop when enabled', () => {
            debugManager.toggleFPS();
            
            expect(debugManager.lastTime).toBe(1000);
            // frameCount becomes 1 because updateFPS is called once in toggleFPS
            expect(debugManager.frameCount).toBe(1);
        });
    });

    describe('updateFPS', () => {
        it('should not run when counter disabled', () => {
            debugManager.fpsCounterRunning = false;
            debugManager.updateFPS();
            // Should return early
        });

        it('should update FPS display after 1 second', () => {
            debugManager.fpsCounterRunning = true;
            debugManager.lastTime = 1000;
            debugManager.frameCount = 60;
            
            global.performance.now = vi.fn().mockReturnValue(2000);
            
            const fpsEl = document.getElementById('fps-value');
            debugManager.updateFPS();
            
            // frameCount is incremented before calculation: 60 -> 61, then fps = 61
            expect(fpsEl.textContent).toBe('61');
        });

        it('should continue loop via requestAnimationFrame', () => {
            debugManager.fpsCounterRunning = true;
            debugManager.updateFPS();
            
            // Should call requestAnimationFrame
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });

        it('should handle missing fps-value element', () => {
            const fpsEl = document.getElementById('fps-value');
            fpsEl.parentNode.removeChild(fpsEl);
            
            debugManager.fpsCounterRunning = true;
            debugManager.lastTime = 1000;
            debugManager.frameCount = 60;
            global.performance.now = vi.fn().mockReturnValue(2000);
            
            expect(() => debugManager.updateFPS()).not.toThrow();
        });
    });

    describe('addUnit', () => {
        it('should add unit to hero and log', () => {
            debugManager.addUnit();
            
            expect(mockGame.hero.units.length).toBe(1);
            expect(mockGame.hero.units[0].name).toBe('Debug Unit');
            expect(mockGame.addLog).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
            expect(mockGame.ui.renderUnits).toHaveBeenCalled();
        });

        it('should do nothing when no hero', () => {
            const originalHero = mockGame.hero;
            mockGame.hero = undefined;
            
            expect(() => debugManager.addUnit()).not.toThrow();
            // log is a private method, verify no error thrown and hero unchanged
            mockGame.hero = originalHero;
        });

        it('should create unit with correct stats', () => {
            debugManager.addUnit();
            
            const unit = mockGame.hero.units[0];
            expect(unit.stats.attack).toBe(3);
            expect(unit.stats.block).toBe(3);
            expect(unit.stats.armor).toBe(3);
            expect(unit.isReady).toBe(true);
            expect(unit.isWounded).toBe(false);
        });
    });

    describe('log', () => {
        it('should log to console', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            debugManager.log('Test message');
            
            expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
            consoleSpy.mockRestore();
        });

        it('should update debug UI log container', () => {
            const logContainer = document.getElementById('debug-log-container');
            debugManager.log('UI test');
            
            expect(logContainer.childElementCount).toBeGreaterThan(0);
            const lastEntry = logContainer.lastElementChild;
            expect(lastEntry.textContent).toContain('UI test');
        });

        it('should use correct color for error level', () => {
            const logContainer = document.getElementById('debug-log-container');
            debugManager.log('Error test', 'error');
            
            const lastEntry = logContainer.lastElementChild;
            expect(lastEntry.style.color).toBe('#ff4d4d');
        });

        it('should use correct color for warning level', () => {
            const logContainer = document.getElementById('debug-log-container');
            debugManager.log('Warning test', 'warning');
            
            const lastEntry = logContainer.lastElementChild;
            expect(lastEntry.style.color).toBe('#ffcc00');
        });

        it('should use default color for info level', () => {
            const logContainer = document.getElementById('debug-log-container');
            debugManager.log('Info test', 'info');
            
            const lastEntry = logContainer.lastElementChild;
            expect(lastEntry.style.color).toBe('#fff');
        });

        it('should limit log entries to 20', () => {
            const logContainer = document.getElementById('debug-log-container');
            
            // Add 25 entries
            for (let i = 0; i < 25; i++) {
                debugManager.log(`Message ${i}`);
            }
            
            expect(logContainer.childElementCount).toBe(20);
        });

        it('should call game.addLog when available', () => {
            debugManager.log('Game log test');
            expect(mockGame.addLog).toHaveBeenCalledWith('Game log test', 'info');
        });

        it('should handle missing game gracefully', () => {
            const originalGame = debugManager.game;
            debugManager.game = undefined;
            
            expect(() => debugManager.log('Test')).not.toThrow();
            debugManager.game = originalGame;
        });
    });

    describe('addCrystals', () => {
        it('should set all crystals to 5', () => {
            debugManager.addCrystals();
            
            expect(mockGame.hero.crystals.red).toBe(5);
            expect(mockGame.hero.crystals.blue).toBe(5);
            expect(mockGame.hero.crystals.green).toBe(5);
            expect(mockGame.hero.crystals.white).toBe(5);
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Maxed crystals', 'info');
            expect(mockGame.updateStats).toHaveBeenCalled();
        });

        it('should do nothing when no hero', () => {
            mockGame.hero = undefined;
            
            expect(() => debugManager.addCrystals()).not.toThrow();
            
            mockGame.hero = { crystals: {} };
        });
    });

    describe('addFame', () => {
        it('should add 10 fame', () => {
            debugManager.addFame();
            
            expect(mockGame.hero.gainFame).toHaveBeenCalledWith(10);
            expect(mockGame.addLog).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
        });

        it('should do nothing when no hero', () => {
            mockGame.hero = undefined;
            expect(() => debugManager.addFame()).not.toThrow();
        });
    });

    describe('addReputation', () => {
        it('should add 1 reputation', () => {
            debugManager.addReputation();
            
            expect(mockGame.hero.changeReputation).toHaveBeenCalledWith(1);
            expect(mockGame.addLog).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
        });
    });

    describe('addInfluence', () => {
        it('should set influence to 10', () => {
            debugManager.addInfluence();
            
            expect(mockGame.hero.influencePoints).toBe(10);
            expect(mockGame.addLog).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
        });
    });

    describe('healAll', () => {
        it('should clear hero wounds and heal units', () => {
            mockGame.hero.wounds = ['wound1', 'wound2'];
            mockGame.hero.units = [
                { heal: vi.fn(), isWounded: true, isReady: false }
            ];
            
            debugManager.healAll();
            
            expect(mockGame.hero.wounds).toEqual([]);
            expect(mockGame.hero.units[0].heal).toHaveBeenCalled();
            expect(mockGame.hero.units[0].isWounded).toBe(false);
            expect(mockGame.hero.units[0].isReady).toBe(true);
            expect(mockGame.addLog).toHaveBeenCalled();
            expect(mockGame.updateStats).toHaveBeenCalled();
            expect(mockGame.ui.renderHandCards).toHaveBeenCalled();
        });

        it('should do nothing when no hero', () => {
            mockGame.hero = undefined;
            expect(() => debugManager.healAll()).not.toThrow();
        });
    });

    describe('drawCard', () => {
        it('should draw card and log', () => {
            const result = debugManager.drawCard();
            
            expect(mockGame.hero.drawCard).toHaveBeenCalled();
            // drawCard doesn't return the card, it just logs it
            expect(result).toBeUndefined();
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Drew Test Card', 'info');
            expect(mockGame.ui.renderHandCards).toHaveBeenCalled();
        });

        it('should log warning when deck empty', () => {
            mockGame.hero.drawCard.mockReturnValue(null);
            
            debugManager.drawCard();
            
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Deck empty', 'warning');
        });
    });

    describe('resetHand', () => {
        it('should move hand to discard and redraw', () => {
            mockGame.hero.hand = [{ id: '1' }, { id: '2' }];
            mockGame.hero.discard = [];
            
            debugManager.resetHand();
            
            expect(mockGame.hero.hand).toEqual([]);
            expect(mockGame.hero.discard.length).toBe(2);
            expect(mockGame.hero.drawCards).toHaveBeenCalledWith(5);
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Reset hand', 'info');
            expect(mockGame.ui.renderHandCards).toHaveBeenCalled();
        });
    });

    describe('toggleCoordinates', () => {
        it('should toggle showCoordinates and hexGrid debugMode', () => {
            expect(debugManager.showCoordinates).toBe(false);
            
            debugManager.toggleCoordinates();
            
            expect(debugManager.showCoordinates).toBe(true);
            expect(mockGame.hexGrid.debugMode).toBe(true);
            
            debugManager.toggleCoordinates();
            
            expect(debugManager.showCoordinates).toBe(false);
            expect(mockGame.hexGrid.debugMode).toBe(false);
        });

        it('should handle missing hexGrid', () => {
            mockGame.hexGrid = undefined;
            expect(() => debugManager.toggleCoordinates()).not.toThrow();
        });
    });

    describe('revealMap', () => {
        it('should log not implemented', () => {
            debugManager.revealMap();
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: revealMap not implemented', 'info');
        });
    });

    describe('teleportMode', () => {
        it('should enable debug teleport and log', () => {
            expect(mockGame.debugTeleport).toBe(false);
            
            debugManager.teleportMode();
            
            expect(mockGame.debugTeleport).toBe(true);
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Teleport mode enabled', 'info');
        });
    });

    describe('spawnEnemy', () => {
        it('should add enemy to game.enemies and log', () => {
            debugManager.spawnEnemy();
            
            expect(mockGame.enemies.length).toBe(1);
            expect(mockGame.enemies[0].name).toBe('Debug Orc');
            expect(mockGame.enemies[0].type).toBe('orc');
            expect(mockGame.enemies[0].position).toEqual({ q: 0, r: 0 });
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Spawned Orc', 'info');
            expect(mockGame.render).toHaveBeenCalled();
        });

        it('should do nothing when no enemies array', () => {
            mockGame.enemies = undefined;
            expect(() => debugManager.spawnEnemy()).not.toThrow();
        });
    });

    describe('killEnemies', () => {
        it('should clear enemies and log', () => {
            mockGame.enemies = [{ name: 'Orc' }, { name: 'Goblin' }];
            
            debugManager.killEnemies();
            
            expect(mockGame.enemies).toEqual([]);
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Cleared enemies', 'info');
            expect(mockGame.render).toHaveBeenCalled();
        });

        it('should do nothing when no enemies array', () => {
            mockGame.enemies = undefined;
            expect(() => debugManager.killEnemies()).not.toThrow();
        });
    });

    describe('addMana', () => {
        it('should add mana and log', () => {
            debugManager.addMana('red', 1);
            
            expect(mockGame.hero.addMana).toHaveBeenCalledWith('red');
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Added red mana', 'info');
        });
    });

    describe('teleport', () => {
        it('should teleport hero and log', () => {
            mockGame.hero.position = { q: 0, r: 0 };
            
            debugManager.teleport(5, 10);
            
            expect(mockGame.hero.position).toEqual({ q: 5, r: 10 });
            expect(mockGame.addLog).toHaveBeenCalledWith('Debug: Teleported to 5,10', 'info');
            expect(mockGame.render).toHaveBeenCalled();
        });

        it('should do nothing when no hero', () => {
            mockGame.hero = undefined;
            expect(() => debugManager.teleport(1, 2)).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('should remove panel and overlay from DOM', () => {
            const panel = document.getElementById('debug-panel');
            const overlay = document.getElementById('perf-overlay');
            
            debugManager.destroy();
            
            // Elements should be removed from DOM tree (parentNode = null)
            expect(panel.parentNode).toBeNull();
            expect(overlay.parentNode).toBeNull();
            expect(debugManager.fpsCounterRunning).toBe(false);
        });

        it('should handle missing panel gracefully', () => {
            document.getElementById('debug-panel')?.remove();
            document.getElementById('perf-overlay')?.remove();
            
            expect(() => debugManager.destroy()).not.toThrow();
        });
    });
});