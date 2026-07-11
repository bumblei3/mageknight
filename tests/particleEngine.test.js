import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ParticleEngine } from '../js/particles/ParticleEngine.js';
import { Particle } from '../js/particles/Particle.js';

describe('ParticleEngine.recycleParticle', () => {
    let engine;

    beforeEach(() => {
        // jsdom returns null for getContext('2d'); stub it so the constructor succeeds
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} );
        const canvas = document.createElement('canvas');
        engine = new ParticleEngine(canvas);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a recycled particle from the pool on getParticle', () => {
        const p = new Particle(1, 2);
        engine.recycleParticle(p);
        expect(engine.pool.length).toBe(1);
        const got = engine.getParticle();
        expect(got).toBe(p); // reused from pool, not a fresh Particle
    });

    it('does not grow the pool beyond maxParticles', () => {
        // Fill the pool to the cap and verify extra recycles are dropped
        for (let i = 0; i < engine.maxParticles; i++) {
            engine.recycleParticle(new Particle(0, 0));
        }
        expect(engine.pool.length).toBe(engine.maxParticles);
        engine.recycleParticle(new Particle(9, 9));
        expect(engine.pool.length).toBe(engine.maxParticles);
    });

    it('getParticle creates a fresh Particle when pool is empty', () => {
        const first = engine.getParticle();
        expect(engine.pool.length).toBe(0);
        expect(first).toBeInstanceOf(Particle);
    });
});
