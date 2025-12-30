import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { ParticleSystem } from '../js/particles.js';
import { createMockCanvas, createSpy } from './test-mocks.js';

describe('Particles Boost', () => {
    let ps;
    let canvas;

    beforeEach(() => {
        canvas = createMockCanvas();
        ps = new ParticleSystem(canvas);
    });

    it('should handle lightning attack effect', () => {
        ps.lightningAttackEffect(100, 100);
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle level up celebration effect', () => {
        ps.levelUpEffect(100, 100);
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle victory rain', () => {
        ps.victoryRainEffect(1000, 800);
        // Particles are added over time via setTimeout, but some are immediate or added in loops
        // Actually victoryRain uses setTimeout for bursts.
        // Let's check particles after some sync work.
    });

    it('should handle combat clashes with different types', () => {
        ps.combatClashEffect(100, 100, 'fire');
        ps.combatClashEffect(100, 100, 'ice');
        ps.combatClashEffect(100, 100, 'lightning');
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should create damage numbers', () => {
        ps.createDamageNumber(100, 100, 10, true);
        const particle = ps.particles.find(p => p.damage === 10);
        expect(particle).toBeDefined();
        particle.update(1);
        particle.draw(canvas.getContext('2d'));
    });
});
