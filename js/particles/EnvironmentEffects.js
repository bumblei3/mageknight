export class EnvironmentEffects {
    constructor(engine) {
        this.engine = engine;
    }

    trailEffect(x, y, color = '#8b5cf6') {
        this.engine.addParticle(x, y, {
            color: color,
            speed: 0,
            vx: 0,
            vy: 0,
            size: 4,
            decay: 0.1
        });
    }

    dustCloudEffect(x, y) {
        this.engine.burst(x, y, 5, {
            color: '#a8a29e', // Dust gray
            speed: 1,
            size: 5,
            decay: 0.02
        });
    }

    explosion(x, y, color = '#ec4899', count = 30) {
        this.engine.burst(x, y, count, {
            color: color,
            speed: 6,
            size: 5,
            decay: 0.02
        });
    }

    levelUpEffect(x, y) {
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

    discoveryEffect(x, y) {
        this.engine.burst(x, y, 20, {
            color: '#facc15', // Yellow
            speed: 3,
            size: 3,
            decay: 0.03
        });
    }

    victoryRainEffect(canvasWidth, _canvasHeight) {
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

    defeatSmokeEffect(x, y) {
        this.engine.addParticle(x + (Math.random() - 0.5) * 20, y, {
            color: '#57534e', // Dark smoke
            vx: (Math.random() - 0.5),
            vy: -2,
            size: 6,
            decay: 0.01
        });
    }
}
