import { ParticleEngine } from './ParticleEngine';

export class MagicEffects {
    private engine: ParticleEngine;

    constructor(engine: ParticleEngine) {
        this.engine = engine;
    }

    manaEffect(x: number, y: number, color: string): void {
        this.engine.burst(x, y, 12, {
            color: color,
            speed: 2,
            size: 3,
            decay: 0.03,
            gravity: -0.05 // Float up slightly
        } as any);
    }

    manaGlitterEffect(x: number, y: number, color: string): void {
        // Continuous gentle spawn
        for (let i = 0; i < 3; i++) {
            this.engine.addParticle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, {
                color: color,
                speed: 0.5,
                size: Math.random() * 3,
                decay: 0.02,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5 - 0.5 // Drift up
            } as any);
        }
    }

    healEffect(x: number, y: number): void {
        for (let i = 0; i < 15; i++) {
            this.engine.addParticle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, {
                color: '#4ade80', // Green
                speed: 1,
                vx: 0,
                vy: -2, // Rise up
                size: 4,
                decay: 0.02
            } as any); // speed is custom
        }
    }

    cardGlowEffect(x: number, y: number, color: string = '#8b5cf6'): void {
        this.engine.addParticle(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 140, {
            color: color,
            speed: 0.5,
            size: 2,
            decay: 0.05
        } as any);
    }

    playCardEffect(x: number, y: number, color: string): void {
        // Spin effect
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 50;
            this.engine.addParticle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, {
                color: color || '#ffffff',
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 3,
                decay: 0.03
            });
        }
    }
}
