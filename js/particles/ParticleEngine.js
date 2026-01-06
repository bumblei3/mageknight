import { Particle } from './Particle.js';

export class ParticleEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.pool = [];
        this.maxParticles = 500;
        this.lastTime = 0;

        // Bind loop
        this.update = this.update.bind(this);
    }

    // --- Pooling System ---

    getParticle() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return new Particle();
    }

    recycleParticle(particle) {
        if (this.pool.length < this.maxParticles) {
            this.pool.push(particle);
        }
    }

    // --- Core Operations ---

    addParticle(x, y, options) {
        if (this.particles.length >= this.maxParticles) return;

        const p = this.getParticle();
        this.resetParticle(p, x, y, options);
        this.particles.push(p);
    }

    resetParticle(particle, x, y, options = {}) {
        // Default values
        particle.x = x;
        particle.y = y;
        particle.vx = (Math.random() - 0.5) * (options.speed || 2);
        particle.vy = (Math.random() - 0.5) * (options.speed || 2);
        particle.life = 1.0;
        particle.decay = options.decay || 0.02;
        particle.color = options.color || '#ffffff';
        particle.size = options.size || 3;
        particle.gravity = options.gravity || 0;

        // Advanced Overrides
        if (options.vx !== undefined) particle.vx = options.vx;
        if (options.vy !== undefined) particle.vy = options.vy;
    }

    burst(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            this.addParticle(x, y, options);
        }
    }

    // --- Loop ---

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const isAlive = p.update();

            if (!isAlive) {
                this.recycleParticle(p);
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // Optional: Clear logic can be handled externally or here
        // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        for (const p of this.particles) {
            p.draw(this.ctx);
        }
        this.ctx.restore();
    }

    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
