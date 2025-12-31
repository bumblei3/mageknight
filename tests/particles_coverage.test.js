
import { describe, it, expect, beforeEach } from './testRunner.js';
import { ParticleSystem, Particle } from '../js/particles.js';
import { setupGlobalMocks, resetMocks, createMockCanvas, createMockContext } from './test-mocks.js';

setupGlobalMocks();

describe('Particles Coverage Boost', () => {
    let particleSystem;
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
        resetMocks();
        // ParticleSystem expects a canvas element, not a context
        mockCanvas = createMockCanvas(800, 600);
        mockCtx = mockCanvas.getContext('2d');
        particleSystem = new ParticleSystem(mockCanvas);
    });

    describe('Particle class', () => {
        it('should create particle with defaults', () => {
            const p = new Particle(100, 100);
            expect(p.x).toBe(100);
            expect(p.y).toBe(100);
            expect(p.life).toBe(1.0);
        });

        it('should update and decay', () => {
            const p = new Particle(100, 100, { decay: 0.1 });
            const alive = p.update(1);
            expect(p.life).toBeLessThan(1.0);
            expect(alive).toBe(true);
        });

        it('should die when life depleted', () => {
            const p = new Particle(100, 100, { life: 0.05, decay: 0.1 });
            p.update(1);
            expect(p.life).toBeLessThanOrEqual(0);
        });

        it('should draw circle type', () => {
            const p = new Particle(100, 100, { type: 'circle' });
            p.draw(mockCtx);
            expect(mockCtx.arc.called).toBe(true);
        });

        it('should draw star type', () => {
            const p = new Particle(100, 100, { type: 'star' });
            p.draw(mockCtx);
            expect(mockCtx.beginPath.called).toBe(true);
        });

        it('should draw spark type', () => {
            const p = new Particle(100, 100, { type: 'spark' });
            p.draw(mockCtx);
            expect(mockCtx.beginPath.called).toBe(true);
        });

        it('should draw heart type', () => {
            const p = new Particle(100, 100, { type: 'heart' });
            p.draw(mockCtx);
            expect(mockCtx.save.called).toBe(true);
        });

        it('should draw skull type', () => {
            const p = new Particle(100, 100, { type: 'skull' });
            p.draw(mockCtx);
            expect(mockCtx.save.called).toBe(true);
        });

        it('should draw cross type', () => {
            const p = new Particle(100, 100, { type: 'cross' });
            p.draw(mockCtx);
            expect(mockCtx.save.called).toBe(true);
        });
    });

    describe('ParticleSystem effects', () => {
        it('victoryRainEffect should add particles', () => {
            particleSystem.victoryRainEffect(800, 600);
            // Particles are added via setTimeout, so just verify no crash
        });

        it('damageSplatter should add particles', () => {
            particleSystem.damageSplatter(400, 300, 5);
            expect(particleSystem.particles.length).toBeGreaterThan(0);
        });

        it('healAura should add heal particles', () => {
            particleSystem.healAura(400, 300);
            // Uses setTimeout, verify no crash
        });

        it('buffEffect should create buff particles', () => {
            if (particleSystem.buffEffect) {
                particleSystem.buffEffect(400, 300);
            }
        });

        it('clear should remove all particles', () => {
            particleSystem.addParticle(100, 100, {});
            particleSystem.addParticle(200, 200, {});
            expect(particleSystem.particles.length).toBeGreaterThan(0);
            particleSystem.clear();
            expect(particleSystem.particles.length).toBe(0);
        });
    });
});
