import { ParticleEngine } from './ParticleEngine';

export class EnvironmentEffects {
    private engine: ParticleEngine;

    constructor(engine: ParticleEngine) {
        this.engine = engine;
    }

    trailEffect(x: number, y: number, color: string = '#8b5cf6'): void {
        this.engine.addParticle(x, y, {
            color: color,
            speed: 0,
            vx: 0,
            vy: 0,
            size: 4,
            decay: 0.1
        } as any);
    }

    dustCloudEffect(x: number, y: number): void {
        this.engine.burst(x, y, 5, {
            color: '#a8a29e', // Dust gray
            speed: 1,
            size: 5,
            decay: 0.02
        } as any);
    }

    explosion(x: number, y: number, color: string = '#ec4899', count: number = 30): void {
        this.engine.burst(x, y, count, {
            color: color,
            speed: 6,
            size: 5,
            decay: 0.02
        } as any);
    }

    levelUpEffect(x: number, y: number): void {
        // Multi-stage explosion
        this.explosion(x, y, '#fbbf24', 50); // Gold center
        setTimeout(() => this.explosion(x, y, '#ffffff', 30), 100); // White flash

        // Ring
        for (let i = 0; i < 36; i++) {
            const angle = (Math.PI * 2 * i) / 36;
            const speed = 4;
            this.engine.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#f59e0b',
                size: 4,
                decay: 0.015
            });
        }
    }

    discoveryEffect(x: number, y: number): void {
        this.engine.burst(x, y, 20, {
            type: 'star',
            color: '#fbbf24', // Gold
            speed: 4,
            size: 5,
            decay: 0.02,
            gravity: 0.1
        } as any);
    }

    victoryRainEffect(canvasWidth: number, _canvasHeight: number): void {
        // Confetti
        for (let i = 0; i < 5; i++) {
            this.engine.addParticle(Math.random() * canvasWidth, -10, {
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 3 + 2,
                size: Math.random() * 5 + 3,
                decay: 0.005,
                gravity: 0.05
            });
        }
    }

    defeatSmokeEffect(x: number, y: number): void {
        this.engine.addParticle(x + (Math.random() - 0.5) * 20, y, {
            color: '#57534e', // Dark smoke
            vx: (Math.random() - 0.5),
            vy: -2,
            size: 6,
            decay: 0.01
        });
    }
}
