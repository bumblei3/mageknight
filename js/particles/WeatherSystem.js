/**
 * WeatherSystem - Manages environmental effects like rain, snow, fog.
 */
// import { Particle } from './Particle.js';

export class WeatherSystem {
    constructor(particleEngine, canvas) {
        this.engine = particleEngine;
        this.canvas = canvas;
        this.currentWeather = 'clear'; // clear, rain, snow, fog, ash
        this.intensity = 0;
        this.maxParticles = 200;
        this.active = false;
    }

    setWeather(type, intensity = 1.0) {
        this.currentWeather = type;
        this.intensity = intensity;
        this.active = type !== 'clear';

        // Clear existing weather particles instantly if switching to clear
        if (!this.active) {
            // Optional: loop through engine particles and remove type=weather?
            // For now, let them decay naturally.
        }
    }

    update(_deltaTime) {
        if (!this.active) return;

        // Spawn new particles based on weather type
        this.spawnParticles();
    }

    spawnParticles() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const spawnCount = Math.ceil(this.intensity * 2); // Particles per frame

        if (this.currentWeather === 'rain') {
            for (let i = 0; i < spawnCount; i++) {
                this.engine.addParticle(Math.random() * width, -10, {
                    type: 'rain',
                    color: '#a5b4fc', // Light Indigo
                    vx: 1 + (Math.random() - 0.5), // Slight wind
                    vy: 10 + Math.random() * 5, // Fast fall
                    size: 2,
                    life: 1.5,
                    decay: 0.01
                });
            }
        }
        else if (this.currentWeather === 'snow') {
            for (let i = 0; i < Math.ceil(spawnCount / 2); i++) {
                this.engine.addParticle(Math.random() * width, -10, {
                    type: 'snow',
                    color: '#ffffff',
                    vx: Math.sin(Date.now() / 1000) + (Math.random() - 0.5), // Drifting
                    vy: 2 + Math.random() * 2, // Slow fall
                    size: 3,
                    life: 4.0,
                    decay: 0.005
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
}
