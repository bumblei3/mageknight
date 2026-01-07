/**
 * WeatherSystem - Manages environmental effects like rain, snow, fog.
 */
import { ParticleEngine } from './ParticleEngine';

export class WeatherSystem {
    private engine: ParticleEngine;
    private canvas: HTMLCanvasElement;
    public currentWeather: string;
    public intensity: number;
    public maxParticles: number;
    public active: boolean;

    constructor(particleEngine: ParticleEngine, canvas: HTMLCanvasElement) {
        this.engine = particleEngine;
        this.canvas = canvas;
        this.currentWeather = 'clear'; // clear, rain, snow, fog, ash
        this.intensity = 0;
        this.maxParticles = 200;
        this.active = false;
    }

    setWeather(type: string, intensity: number = 1.0): void {
        this.currentWeather = type;
        this.intensity = intensity;
        this.active = type !== 'clear';

        // Clear existing weather particles instantly if switching to clear
        if (!this.active) {
            // Optional: loop through engine particles and remove type=weather?
            // For now, let them decay naturally.
        }
    }

    update(_deltaTime: number): void {
        if (!this.active) return;

        // Spawn new particles based on weather type
        this.spawnParticles();
    }

    spawnParticles(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const spawnCount = Math.ceil(this.intensity * 2); // Particles per frame

        // Ground usually at bottom for screen-space weather
        const groundLevel = height - 20;

        if (this.currentWeather === 'rain') {
            for (let i = 0; i < spawnCount; i++) {
                this.engine.addParticle(Math.random() * width, -10, {
                    type: 'rain',
                    color: '#a5b4fc', // Light Indigo
                    vx: 1 + (Math.random() - 0.5), // Slight wind
                    vy: 12 + Math.random() * 5, // Fast fall
                    size: 2,
                    life: 2.0,
                    decay: 0.005,
                    ground: groundLevel,
                    onGroundHit: (x, y) => this.createSplash(x, y, '#a5b4fc')
                });
            }
        }
        else if (this.currentWeather === 'snow') {
            for (let i = 0; i < Math.ceil(spawnCount / 2); i++) {
                this.engine.addParticle(Math.random() * width, -10, {
                    type: 'snow',
                    color: '#ffffff',
                    vx: Math.sin(Date.now() / 1000 + i) * 2, // Drifting
                    vy: 1.5 + Math.random() * 2, // Slow fall
                    size: 3,
                    life: 5.0,
                    decay: 0.002,
                    ground: groundLevel + 10,
                    onGroundHit: (x, y) => this.createSplash(x, y, '#ffffff', 2)
                });
            }
        }
        else if (this.currentWeather === 'ash') {
            if (Math.random() > 0.5) return; // Sparse
            this.engine.addParticle(Math.random() * width, Math.random() * height, {
                type: 'ash',
                color: '#4b5563', // Grey
                vx: 0.5 + (Math.random() - 0.5),
                vy: -0.5 + (Math.random() - 0.5), // Floating usually
                size: 2 + Math.random() * 2,
                life: 3.0,
                decay: 0.01
            });
        }
    }

    createSplash(x: number, y: number, color: string, count: number = 3): void {
        this.engine.burst(x, y, count, {
            color: color,
            speed: 2,
            size: 1.5,
            decay: 0.1,
            gravity: 0.2
        } as any);
    }
}
