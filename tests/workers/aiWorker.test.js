// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('aiWorker MCTS (pure functions)', () => {
    it('exports calculateMoves, getBestMove, mctsSelectMove, simulatePlayout', async () => {
        const mod = await import('../../js/workers/aiWorker.js');
        expect(typeof mod.calculateMoves).toBe('function');
        expect(typeof mod.getBestMove).toBe('function');
        expect(typeof mod.mctsSelectMove).toBe('function');
        expect(typeof mod.simulatePlayout).toBe('function');
        expect(typeof mod.simulateGameState).toBe('function');
    });

    it('calculateMoves returns moves for a roaming enemy with iterations', async () => {
        const { calculateMoves } = await import('../../js/workers/aiWorker.js');
        const hexes = {};
        for (let q = -1; q <= 1; q++) {
            for (let r = -1; r <= 1; r++) {
                hexes[`${q},${r}`] = { terrain: 'plains' };
            }
        }
        const enemies = [{ id: 'e1', name: 'Orc', type: 'orc', position: { q: 0, r: 0 }, isDefeated: false, aiPersonality: 'aggressive' }];
        const res = calculateMoves(enemies, { q: 1, r: 0 }, hexes, 1, 5);
        expect(res).toHaveProperty('newPositions');
        expect(res).toHaveProperty('moveLog');
    });

    it('simulatePlayout returns a non-negative distance', async () => {
        const { simulatePlayout } = await import('../../js/workers/aiWorker.js');
        const hexes = {};
        for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) hexes[`${q},${r}`] = { terrain: 'plains' };
        const config = { chaseWeight: 0.95, wanderWeight: 0.3, terrainAvoidance: 0.2 };
        const d = simulatePlayout({ q: 1, r: 0 }, { q: 2, r: 0 }, hexes, config);
        expect(typeof d).toBe('number');
        expect(d).toBeGreaterThanOrEqual(0);
    });

    it('simulateGameState returns a non-negative distance', async () => {
        const { simulateGameState } = await import('../../js/workers/aiWorker.js');
        const hexes = {};
        for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) hexes[`${q},${r}`] = { terrain: 'plains' };
        const config = { chaseWeight: 0.95, wanderWeight: 0.3, terrainAvoidance: 0.2 };
        const d = simulateGameState({ q: 1, r: 0 }, { q: 2, r: 0 }, hexes, config, 4);
        expect(typeof d).toBe('number');
        expect(d).toBeGreaterThanOrEqual(0);
    });

    it('mctsSelectMove returns one of the candidate moves', async () => {
        const { mctsSelectMove } = await import('../../js/workers/aiWorker.js');
        const hexes = {};
        for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) hexes[`${q},${r}`] = { terrain: 'plains' };
        const moves = [{ q: 1, r: 0 }, { q: 0, r: 1 }];
        const enemy = { type: 'orc', aiPersonality: 'aggressive' };
        const config = { chaseWeight: 0.95, wanderWeight: 0.3, terrainAvoidance: 0.2, flockingWeight: 0.4 };
        const chosen = mctsSelectMove(enemy, { q: 2, r: 0 }, moves, hexes, config, 10);
        expect(moves).toContainEqual(chosen);
    });
});
