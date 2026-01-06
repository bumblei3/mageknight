import { describe, it, expect, beforeEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { ParticleSystem } from '../js/particles.js';
import { HexGrid } from '../js/hexgrid.js';
import { resetMocks, setupGlobalMocks } from './test-mocks.js';

describe('Performance Tests', () => {
    beforeEach(() => {
        setupGlobalMocks();
        resetMocks();
    });

    it('Performance: HexGrid Rendering Stress Test', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 800;
        const grid = new HexGrid(canvas);

        // Simulate a massive grid
        for (let q = -20; q <= 20; q++) {
            for (let r = -20; r <= 20; r++) {
                grid.setHex(q, r, { type: 'grass', revealed: true });
            }
        }

        const drawStart = performance.now();
        grid.render();
        const drawTime = performance.now() - drawStart;
        console.log(`Drew grid in ${drawTime.toFixed(2)}ms`);

        expect(drawTime).toBeLessThan(150);
        expect(grid.hexes.size).toBeGreaterThan(1000);
    });

    it('Performance: Particle System Stress Test', () => {
        const canvas = document.createElement('canvas');
        const ps = new ParticleSystem(canvas);

        const start = performance.now();
        // Blast thousands of particles
        for (let i = 0; i < 5000; i++) {
            ps.explosion(500, 400, '#ff0000', 1);
        }

        const updateStart = performance.now();
        ps.update();
        const updateTime = performance.now() - updateStart;
        console.log(`Updated all particles in ${updateTime.toFixed(2)}ms`);

        expect(updateTime).toBeLessThan(200);
        expect(ps.particles.length).toBe(500);
    });

    it('Resilience: Multi-Reset Memory Isolation', () => {
        const game = new MageKnightGame();

        const start = performance.now();
        // Simulate 50 game restarts rapidly
        for (let i = 0; i < 50; i++) {
            game.init();
            game.hero.drawCards();
            game.hero.gainFame(10);
            game.hero.levelUp();
        }
        const totalTime = performance.now() - start;
        console.log(`Completed 50 full game resets in ${totalTime.toFixed(2)}ms`);

        expect(totalTime).toBeLessThan(5000);
    });
});
