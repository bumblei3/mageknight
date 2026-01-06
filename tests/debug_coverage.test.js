
import { describe, it, expect, beforeEach } from 'vitest';
import { DebugManager } from '../js/debug.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM, createSpy } from './test-mocks.js';

setupGlobalMocks();

describe('Debug Manager Coverage Boost', () => {
    let debugManager;
    let mockGame;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();

        mockGame = {
            hero: {
                crystals: { red: 0, blue: 0, green: 0, white: 0 },
                gainFame: createSpy(),
                changeReputation: createSpy(),
                influencePoints: 0,
                wounds: [],
                units: [],
                position: { q: 0, r: 0 },
                hand: [],
                discard: [],
                drawCard: createSpy(() => ({ name: 'TestCard' })),
                drawCards: createSpy(),
                addUnit: createSpy(() => true)
            },
            hexGrid: { debugMode: false },
            enemies: [],
            addLog: createSpy(),
            updateStats: createSpy(),
            renderHand: createSpy(),
            render: createSpy(),
            debugTeleport: false
        };

        debugManager = new DebugManager(mockGame);
    });

    describe('Cheat functions', () => {
        it('addCrystals should add crystals to hero', () => {
            debugManager.addCrystals();
            expect(mockGame.hero.crystals.red).toBe(5);
            expect(mockGame.hero.crystals.blue).toBe(5);
            expect(mockGame.updateStats.called).toBe(true);
        });

        it('addFame should call gainFame', () => {
            debugManager.addFame();
            expect(mockGame.hero.gainFame.called).toBe(true);
        });

        it('addReputation should call changeReputation', () => {
            debugManager.addReputation();
            expect(mockGame.hero.changeReputation.called).toBe(true);
        });

        it('addInfluence should add influence points', () => {
            debugManager.addInfluence();
            expect(mockGame.hero.influencePoints).toBe(10);
        });

        it('healAll should clear wounds', () => {
            mockGame.hero.wounds = [1, 2, 3];
            debugManager.healAll();
            expect(mockGame.hero.wounds.length).toBe(0);
        });

        it('drawCard should draw and log', () => {
            debugManager.drawCard();
            expect(mockGame.hero.drawCard.called).toBe(true);
            expect(mockGame.addLog.called).toBe(true);
        });

        it('drawCard should log warning when deck empty', () => {
            mockGame.hero.drawCard = createSpy(() => null);
            debugManager.drawCard();
            expect(mockGame.addLog.calledWith('Debug: Deck empty', 'warning')).toBe(true);
        });

        it('resetHand should reset and redraw', () => {
            mockGame.hero.hand = [{ name: 'Card1' }];
            debugManager.resetHand();
            expect(mockGame.hero.drawCards.called).toBe(true);
        });

        it('toggleCoordinates should toggle debug mode', () => {
            expect(debugManager.showCoordinates).toBe(false);
            debugManager.toggleCoordinates();
            expect(debugManager.showCoordinates).toBe(true);
            expect(mockGame.hexGrid.debugMode).toBe(true);
        });

        it('revealMap should log not implemented', () => {
            debugManager.revealMap();
            expect(mockGame.addLog.called).toBe(true);
        });

        it('teleportMode should enable teleport flag', () => {
            debugManager.teleportMode();
            expect(mockGame.debugTeleport).toBe(true);
        });

        it('spawnEnemy should add enemy to array', () => {
            expect(mockGame.enemies.length).toBe(0);
            debugManager.spawnEnemy();
            expect(mockGame.enemies.length).toBe(1);
        });

        it('killEnemies should clear enemies array', () => {
            mockGame.enemies = [{ name: 'Enemy1' }];
            debugManager.killEnemies();
            expect(mockGame.enemies.length).toBe(0);
        });
    });

    describe('UI Panel', () => {
        it('togglePanel should toggle hidden class', () => {
            expect(debugManager.panel.classList.contains('hidden')).toBe(true);
            debugManager.togglePanel();
            expect(debugManager.panel.classList.contains('hidden')).toBe(false);
        });
    });
});
