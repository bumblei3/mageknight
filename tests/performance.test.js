import { runner } from './testRunner.js';
import { expect } from './test-utils.js';
import { MageKnightGame } from '../js/game.js';
import { ParticleSystem } from '../js/particles.js';
import { HexGrid } from '../js/hexgrid.js';
import { resetMocks } from './test-mocks.js';
import './setup.js';

runner.test('Performance: HexGrid Rendering Stress Test', () => {
    resetMocks();
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 800;
    const grid = new HexGrid(60, canvas);

    // Simulate a massive grid
    const start = performance.now();
    for (let q = -20; q <= 20; q++) {
        for (let r = -20; r <= 20; r++) {
            grid.addHex(q, r, { type: 'grass' });
        }
    }
    const buildTime = performance.now() - start;
    console.log(`Bilt grid with ${grid.hexes.size} hexes in ${buildTime.toFixed(2)}ms`);

    const drawStart = performance.now();
    grid.draw();
    const drawTime = performance.now() - drawStart;
    console.log(`Drew grid in ${drawTime.toFixed(2)}ms`);

    expect(drawTime).toBeLessThan(50); // Target < 50ms for a huge grid in mock env
    expect(grid.hexes.size).toBeGreaterThan(1000);
});

runner.test('Performance: Particle System Stress Test', () => {
    resetMocks();
    const canvas = document.createElement('canvas');
    const ps = new ParticleSystem(canvas);

    const start = performance.now();
    // Blast thousands of particles
    for (let i = 0; i < 5000; i++) {
        ps.createExplosion(500, 400, '#ff0000', 1);
    }
    const createTime = performance.now() - start;
    console.log(`Created 5000 explosions (${ps.particles.length} particles) in ${createTime.toFixed(2)}ms`);

    const updateStart = performance.now();
    ps.update();
    const updateTime = performance.now() - updateStart;
    console.log(`Updated all particles in ${updateTime.toFixed(2)}ms`);

    expect(updateTime).toBeLessThan(100);
    expect(ps.particles.length).toBeGreaterThan(5000);
});

runner.test('Resilience: Multi-Reset Memory Isolation', () => {
    resetMocks();
    const game = new MageKnightGame();

    const start = performance.now();
    // Simulate 50 game restarts rapidly to check for explosion/leak issues
    for (let i = 0; i < 50; i++) {
        game.init();
        // Trigger some activities
        game.hero.drawCards();
        game.hero.gainFame(10);
        game.hero.levelUp();
    }
    const totalTime = performance.now() - start;
    console.log(`Completed 50 full game resets in ${totalTime.toFixed(2)}ms`);

    expect(totalTime).toBeLessThan(2000); // Should be very fast
    expect(game.hero.level).toBe(2); // Sanity check latest state
});
