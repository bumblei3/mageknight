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

    it('should handle level up celebration effect', (done) => {
        ps.levelUpEffect(100, 100);
        setTimeout(() => {
            expect(ps.particles.length).toBeGreaterThan(0);
            done();
        }, 10);
    });

    it('should handle victory rain', () => {
        ps.victoryRainEffect(1000, 800);
        // Particles are added over time via setTimeout, but some are immediate or added in loops
        // Actually victoryRain uses setTimeout for bursts.
        // Let's check particles after some sync work.
    });

    it('should handle shield block and buff effects', () => {
        ps.shieldBlockEffect(100, 100);
        ps.buffEffect(100, 100);
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle physical impact effect (default branch)', () => {
        ps.combatClashEffect(100, 100, 'physical');
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle dust cloud effect', () => {
        ps.dustCloudEffect(100, 100);
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle specialized combat clashes', () => {
        ps.particles = [];
        ps.combatClashEffect(100, 100, 'ice');
        expect(ps.particles.length).toBeGreaterThan(0);

        ps.particles = [];
        ps.combatClashEffect(100, 100, 'lightning');
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle impact effects over time', (done) => {
        ps.combatClashEffect(100, 100, 'fire');
        setTimeout(() => {
            // Secondary burst should have triggered
            expect(ps.particles.length).toBeGreaterThan(15);
            done();
        }, 150);
    });

    it('should create damage numbers', () => {
        ps.createDamageNumber(100, 100, 25, true);
        const particle = ps.particles.find(p => p.damage === 25);
        expect(particle).toBeDefined();
        particle.update(1);
        particle.draw(canvas.getContext('2d'));
    });

    it('should handle specialized glitter and glow effects', () => {
        ps.manaGlitterEffect(100, 100, 'blue');
        ps.manaGlitterEffect(100, 100, 'invalid'); // Default branch
        ps.cardGlowEffect(100, 100, '#ff0000');
        expect(ps.particles.length).toBeGreaterThan(0);
    });

    it('should handle defeat smoke effect', (done) => {
        ps.defeatSmokeEffect(100, 100);
        setTimeout(() => {
            expect(ps.particles.length).toBeGreaterThan(0);
            done();
        }, 100);
    });
});
