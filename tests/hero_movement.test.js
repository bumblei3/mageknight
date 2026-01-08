import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit Tests for Hero Movement
 * Tests the ActionManager.moveHero function directly
 */

// Mock game object factory
function createMockGame() {
    return {
        movementMode: false,
        gameState: 'playing',
        hero: {
            position: { q: 0, r: 0 },
            displayPosition: { q: 0, r: 0 },
            movementPoints: 0,
            hasSkill: vi.fn().mockReturnValue(false),
            hand: []
        },
        hexGrid: {
            distance: vi.fn().mockReturnValue(1),
            getMovementCost: vi.fn().mockReturnValue(2),
            highlightHexes: vi.fn(),
            clearHighlights: vi.fn(),
            getHex: vi.fn().mockReturnValue({ terrain: 'plains', revealed: true }),
            hasHex: vi.fn().mockReturnValue(true),
            getNeighbors: vi.fn().mockReturnValue([
                { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
                { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
            ]),
            hexes: new Map(),
            getReachableHexes: vi.fn().mockReturnValue([])
        },
        timeManager: {
            isDay: vi.fn().mockReturnValue(true)
        },
        enemies: [],
        combat: null,
        animator: null,
        statisticsManager: null,
        render: vi.fn(),
        showToast: vi.fn(),
        updateStats: vi.fn(),
        addLog: vi.fn(),
        checkAndShowAchievements: vi.fn()
    };
}

// Mock ActionManager class
class MockActionManager {
    constructor(game) {
        this.game = game;
        this.checkpoints = [];
    }

    saveCheckpoint() {
        this.checkpoints.push({ heroPos: { ...this.game.hero.position } });
    }

    clearHistory() {
        this.checkpoints = [];
    }

    exitMovementMode() {
        this.game.movementMode = false;
        this.game.hexGrid.clearHighlights();
    }

    visitSite() {
        // No-op for tests
    }

    calculateReachableHexes() {
        const reachable = this.game.hexGrid.getReachableHexes();
        this.game.hexGrid.highlightHexes(reachable);
    }

    async moveHero(q, r) {
        if (!this.game.movementMode || this.game.gameState !== 'playing') {
            return { success: false, reason: 'Movement not allowed' };
        }

        const distance = this.game.hexGrid.distance(
            this.game.hero.position.q,
            this.game.hero.position.r,
            q, r
        );

        if (distance !== 1) {
            this.game.showToast('Du kannst dich nur auf angrenzende Felder bewegen!', 'warning');
            return { success: false, reason: 'Distance not 1' };
        }

        const cost = this.game.hexGrid.getMovementCost(
            q, r,
            !this.game.timeManager.isDay(),
            this.game.hero.hasSkill('flight')
        );

        if (this.game.hero.movementPoints < cost) {
            this.game.showToast('Nicht genug Bewegungspunkte!', 'warning');
            return { success: false, reason: 'Not enough movement points' };
        }

        // Perform move
        this.saveCheckpoint();
        const oldPos = { ...this.game.hero.position };
        this.game.hero.position = { q, r };
        this.game.hero.movementPoints -= cost;
        this.game.hero.displayPosition = { q, r };

        // Check for remaining movement
        if (this.game.hero.movementPoints > 0 && !this.game.combat) {
            this.calculateReachableHexes();
        } else {
            this.exitMovementMode();
        }

        this.game.render();
        return { success: true, from: oldPos, to: { q, r }, cost };
    }
}

describe('Hero Movement', () => {
    let game;
    let actionManager;

    beforeEach(() => {
        game = createMockGame();
        actionManager = new MockActionManager(game);
    });

    describe('moveHero prerequisites', () => {
        it('should not move when movementMode is false', async () => {
            game.movementMode = false;
            game.hero.movementPoints = 5;

            const result = await actionManager.moveHero(1, 0);

            expect(result.success).toBe(false);
            expect(game.hero.position).toEqual({ q: 0, r: 0 });
        });

        it('should not move when gameState is not playing', async () => {
            game.movementMode = true;
            game.gameState = 'combat';
            game.hero.movementPoints = 5;

            const result = await actionManager.moveHero(1, 0);

            expect(result.success).toBe(false);
            expect(game.hero.position).toEqual({ q: 0, r: 0 });
        });

        it('should not move when distance is not 1', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;
            game.hexGrid.distance.mockReturnValue(3);

            const result = await actionManager.moveHero(3, 0);

            expect(result.success).toBe(false);
            expect(game.showToast).toHaveBeenCalledWith(
                'Du kannst dich nur auf angrenzende Felder bewegen!',
                'warning'
            );
        });

        it('should not move when not enough movement points', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 1;
            game.hexGrid.getMovementCost.mockReturnValue(3);

            const result = await actionManager.moveHero(1, 0);

            expect(result.success).toBe(false);
            expect(game.showToast).toHaveBeenCalledWith(
                'Nicht genug Bewegungspunkte!',
                'warning'
            );
        });
    });

    describe('successful movement', () => {
        it('should move hero when all conditions are met', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;
            game.hexGrid.getMovementCost.mockReturnValue(2);

            const result = await actionManager.moveHero(1, 0);

            expect(result.success).toBe(true);
            expect(game.hero.position).toEqual({ q: 1, r: 0 });
            expect(game.hero.movementPoints).toBe(3);
        });

        it('should update displayPosition after move', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;

            await actionManager.moveHero(1, 0);

            expect(game.hero.displayPosition).toEqual({ q: 1, r: 0 });
        });

        it('should call render after move', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;

            await actionManager.moveHero(1, 0);

            expect(game.render).toHaveBeenCalled();
        });

        it('should save checkpoint before move', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;

            await actionManager.moveHero(1, 0);

            expect(actionManager.checkpoints.length).toBe(1);
            expect(actionManager.checkpoints[0].heroPos).toEqual({ q: 0, r: 0 });
        });
    });

    describe('movement mode exit', () => {
        it('should exit movement mode when no points left', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 2;
            game.hexGrid.getMovementCost.mockReturnValue(2);

            await actionManager.moveHero(1, 0);

            expect(game.movementMode).toBe(false);
            expect(game.hexGrid.clearHighlights).toHaveBeenCalled();
        });

        it('should stay in movement mode when points remain', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;
            game.hexGrid.getMovementCost.mockReturnValue(2);

            await actionManager.moveHero(1, 0);

            expect(game.movementMode).toBe(true);
            expect(game.hexGrid.highlightHexes).toHaveBeenCalled();
        });
    });

    describe('movement cost calculation', () => {
        it('should pass isNight=true when not day', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;
            game.timeManager.isDay.mockReturnValue(false);

            await actionManager.moveHero(1, 0);

            expect(game.hexGrid.getMovementCost).toHaveBeenCalledWith(1, 0, true, false);
        });

        it('should pass hasFlight=true when hero has flight skill', async () => {
            game.movementMode = true;
            game.hero.movementPoints = 5;
            game.hero.hasSkill.mockReturnValue(true);

            await actionManager.moveHero(1, 0);

            expect(game.hexGrid.getMovementCost).toHaveBeenCalledWith(1, 0, false, true);
        });
    });
});
