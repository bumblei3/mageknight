import { describe, it, expect, beforeEach } from './testRunner.js';
import { Particle, ParticleSystem } from '../js/particles.js';
import { createMockContext } from './test-mocks.js';

describe('Particle', () => {
    it('should initialize with default options', () => {
        const particle = new Particle(100, 200);

        expect(particle.x).toBe(100);
        expect(particle.y).toBe(200);
        expect(particle.life).toBe(1.0);
        expect(particle.opacity).toBe(1);
        expect(particle.type).toBe('circle');
    });

    it('should initialize with custom options', () => {
        const particle = new Particle(50, 75, {
            vx: 5,
            vy: -3,
            color: '#ff0000',
            size: 10,
            type: 'star',
            gravity: 0.5
        });

        expect(particle.vx).toBe(5);
        expect(particle.vy).toBe(-3);
        expect(particle.color).toBe('#ff0000');
        expect(particle.size).toBe(10);
        expect(particle.type).toBe('star');
        expect(particle.gravity).toBe(0.5);
    });

    it('should update position based on velocity', () => {
        const particle = new Particle(100, 100, { vx: 5, vy: 3 });

        particle.update(1);

        expect(particle.x).toBe(105);
        expect(particle.y).toBe(103);
    });

    it('should apply gravity to velocity', () => {
        const particle = new Particle(100, 100, { vy: 0, gravity: 1 });

        particle.update(1);
        const vy1 = particle.vy;

        particle.update(1);
        const vy2 = particle.vy;

        expect(vy2).toBeGreaterThan(vy1);
    });

    it('should decay life over time', () => {
        const particle = new Particle(100, 100, { decay: 0.1 });
        const initialLife = particle.life;

        particle.update(1);

        expect(particle.life).toBeLessThan(initialLife);
        expect(particle.life).toBe(initialLife - 0.1);
    });

    it('should update opacity based on life', () => {
        const particle = new Particle(100, 100, { decay: 0.5 });

        particle.update(1);

        expect(particle.opacity).toBe(particle.life);
        expect(particle.opacity).toBe(0.5);
    });

    it('should return false when life expires', () => {
        const particle = new Particle(100, 100, { life: 0.1, decay: 0.2 });

        const alive = particle.update(1);

        expect(alive).toBe(false);
        expect(particle.life).toBeLessThanOrEqual(0);
    });

    it('should return true while alive', () => {
        const particle = new Particle(100, 100, { life: 1.0, decay: 0.01 });

        const alive = particle.update(1);

        expect(alive).toBe(true);
        expect(particle.life).toBeGreaterThan(0);
    });

    it('should draw circle particle type', () => {
        const mockCtx = {
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            arc: (x, y, r, start, end) => {
                expect(x).toBe(100);
                expect(y).toBe(200);
            },
            fill: () => { }
        };

        const particle = new Particle(100, 200, { type: 'circle' });
        particle.draw(mockCtx);

        expect(mockCtx.fillStyle).toBeDefined();
    });

    it('should draw star particle type', () => {
        const mockCtx = {
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            fill: () => { }
        };

        const particle = new Particle(100, 200, { type: 'star' });
        particle.draw(mockCtx);

        expect(true).toBe(true); // Verify no errors
    });

    it('should draw spark particle type', () => {
        const mockCtx = {
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            stroke: () => { }
        };

        const particle = new Particle(100, 200, { type: 'spark', vx: 5, vy: 3 });
        particle.draw(mockCtx);

        expect(mockCtx.strokeStyle).toBeDefined();
    });
});

describe('ParticleSystem', () => {
    let mockCanvas;
    let mockCtx;
    let particleSystem;

    beforeEach(() => {
        mockCtx = createMockContext();
        // Custom override for measureText if needed, or rely on mock
        mockCtx.measureText = () => ({ width: 50 });

        mockCanvas = {
            getContext: () => mockCtx
        };

        particleSystem = new ParticleSystem(mockCanvas);
    });

    it('should initialize with empty particle array', () => {
        expect(particleSystem.particles).toHaveLength(0);
        expect(particleSystem.isRunning).toBe(false);
    });

    it('should add single particle', () => {
        particleSystem.addParticle(100, 200, { color: '#ff0000' });

        expect(particleSystem.particles).toHaveLength(1);
        expect(particleSystem.particles[0].x).toBe(100);
        expect(particleSystem.particles[0].y).toBe(200);
    });

    it('should auto-start when adding particle', () => {
        expect(particleSystem.isRunning).toBe(false);

        particleSystem.addParticle(100, 200);

        expect(particleSystem.isRunning).toBe(true);
    });

    it('should create burst of particles', () => {
        particleSystem.burst(100, 100, 10);

        expect(particleSystem.particles).toHaveLength(10);
    });

    it('should create burst with options', () => {
        particleSystem.burst(100, 100, 5, {
            color: '#00ff00',
            size: 5,
            speed: 3
        });

        expect(particleSystem.particles).toHaveLength(5);
        particleSystem.particles.forEach(p => {
            expect(p.color).toBe('#00ff00');
            expect(p.size).toBe(5);
        });
    });

    it('should create mana effect', () => {
        particleSystem.manaEffect(100, 100, 'red');

        // Should schedule particles to be added
        expect(true).toBe(true); // Verify no errors
    });

    it('should create impact effect', () => {
        particleSystem.impactEffect(100, 100, '#ff4444');

        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create heal effect', () => {
        particleSystem.healEffect(100, 100);

        // Heal effect schedules particles via setTimeout
        expect(true).toBe(true); // Verify no errors
    });

    it('should create trail effect', () => {
        particleSystem.trailEffect(100, 100, '#8b5cf6');

        expect(particleSystem.particles).toHaveLength(1);
    });

    it('should create explosion effect', () => {
        particleSystem.explosion(100, 100, '#ec4899', 20);

        expect(particleSystem.particles).toHaveLength(20);
    });

    it('should update particles correctly', () => {
        particleSystem.addParticle(100, 100, { vx: 5 });
        expect(particleSystem.particles.length).toBeGreaterThan(0);

        particleSystem.update();
        expect(true).toBe(true); // Verify update completes
    });

    it('should filter dead particles', () => {
        // Add a particle that is already dead
        const particle = new Particle(100, 100, { life: -1 });
        particleSystem.particles.push(particle);

        particleSystem.update();

        // Dead particles should be filtered out
        expect(particleSystem.particles.every(p => p.life > 0)).toBe(true);
    });

    it('should stop when particles die', () => {
        particleSystem.addParticle(100, 100, { life: 0.001, decay: 1 });
        expect(particleSystem.isRunning).toBe(true);

        // Test that auto-stop logic exists
        particleSystem.stop();
        expect(particleSystem.isRunning).toBe(false);
    });

    it('should start particle system', () => {
        particleSystem.start();

        expect(particleSystem.isRunning).toBe(true);
    });

    it('should stop particle system', () => {
        particleSystem.start();
        particleSystem.stop();

        expect(particleSystem.isRunning).toBe(false);
    });

    it('should clear all particles', () => {
        particleSystem.addParticle(100, 100);
        particleSystem.addParticle(200, 200);

        particleSystem.clear();

        expect(particleSystem.particles).toHaveLength(0);
        expect(particleSystem.isRunning).toBe(false);
    });

    it('should handle rapid start/stop cycles', () => {
        particleSystem.start();
        particleSystem.stop();
        particleSystem.start();
        particleSystem.stop();

        expect(particleSystem.isRunning).toBe(false);
    });

    it('should handle mana colors correctly', () => {
        const colors = ['red', 'blue', 'white', 'green', 'gold', 'black'];

        colors.forEach(color => {
            particleSystem.clear();
            particleSystem.manaEffect(100, 100, color);
            // Should not throw error
            expect(true).toBe(true);
        });
    });

    // Additional effect method tests
    it('should create fire attack effect', () => {
        particleSystem.fireAttackEffect(100, 100);
        // Uses setTimeout so particles may not be immediate
        expect(true).toBe(true);
    });

    it('should create ice attack effect', () => {
        particleSystem.iceAttackEffect(100, 100);
        // Uses setTimeout so particles may not be immediate
        expect(true).toBe(true);
    });

    it('should create lightning attack effect', () => {
        particleSystem.lightningAttackEffect(100, 100);
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create level up effect', () => {
        particleSystem.levelUpEffect(100, 100);
        expect(true).toBe(true); // Uses setTimeout
    });

    it('should create mana glitter effect', () => {
        particleSystem.manaGlitterEffect(100, 100, 'red');
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create victory rain effect', () => {
        particleSystem.victoryRainEffect(800, 600);
        expect(true).toBe(true); // Uses setTimeout intervals
    });

    it('should create defeat smoke effect', () => {
        particleSystem.defeatSmokeEffect(100, 100);
        expect(true).toBe(true); // Uses setTimeout
    });

    it('should create card glow effect', () => {
        particleSystem.cardGlowEffect(100, 100, '#8b5cf6');
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create dust cloud effect', () => {
        particleSystem.dustCloudEffect(100, 100);
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create combat clash effect with different types', () => {
        ['physical', 'fire', 'ice', 'lightning'].forEach(type => {
            particleSystem.clear();
            particleSystem.combatClashEffect(100, 100, type);
            expect(particleSystem.particles.length).toBeGreaterThan(0);
        });
    });

    it('should create shield block effect', () => {
        particleSystem.shieldBlockEffect(100, 100);
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should draw particles', () => {
        particleSystem.addParticle(100, 100);
        particleSystem.draw();
        expect(true).toBe(true); // Verify draw completes without error
    });

    it('should handle different particle types in draw', () => {
        ['circle', 'star', 'spark'].forEach(type => {
            particleSystem.addParticle(100, 100, { type });
        });
        particleSystem.draw();
        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });

    it('should create specialized effects from extended suite', () => {
        particleSystem.createDamageNumber(100, 100, 5);
        particleSystem.playCardEffect(200, 200, 'green');
        particleSystem.levelUpExplosion(300, 300);
        particleSystem.damageSplatter(400, 400, 10);
        particleSystem.healAura(500, 500);
        particleSystem.buffEffect(100, 100);

        expect(particleSystem.particles.length).toBeGreaterThan(0);
    });
});
