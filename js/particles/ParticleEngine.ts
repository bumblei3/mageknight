import { Particle, ParticleOptions } from './Particle';

export class ParticleEngine {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public particles: Particle[];
    private pool: Particle[];
    private maxParticles: number;
    public lastTime: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = context;
        this.particles = [];
        this.pool = [];
        this.maxParticles = 500;
        this.lastTime = 0;

        // Bind loop
        this.update = this.update.bind(this);
    }

    // --- Pooling System ---

    getParticle(): Particle {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        // Create new particle with default values (0,0) - will be reset immediately
        return new Particle(0, 0);
    }

    recycleParticle(particle: Particle): void {
        if (this.pool.length < this.maxParticles) {
            this.pool.push(particle);
        }
    }

    // --- Core Operations ---

    addParticle(x: number, y: number, options: ParticleOptions): void {
        if (this.particles.length >= this.maxParticles) return;

        const p = this.getParticle();
        this.resetParticle(p, x, y, options);
        this.particles.push(p);
    }

    resetParticle(particle: Particle, x: number, y: number, options: ParticleOptions = {}): void {
        // Default values
        particle.x = x;
        particle.y = y;
        particle.vx = options.vx ?? ((Math.random() - 0.5) * ((options as any)['speed'] || 2)); // 'speed' might be passed in options but not in interface?
        particle.vy = options.vy ?? ((Math.random() - 0.5) * ((options as any)['speed'] || 2));
        particle.life = options.life ?? 1.0;
        particle.decay = options.decay ?? 0.02;
        particle.color = options.color ?? '#ffffff';
        particle.size = options.size ?? 3;
        particle.gravity = options.gravity ?? 0;
        particle.ground = options.ground;
        particle.onGroundHit = options.onGroundHit;
        particle.type = options.type ?? 'circle';
    }

    burst(x: number, y: number, count: number, options: ParticleOptions = {}): void {
        for (let i = 0; i < count; i++) {
            this.addParticle(x, y, options);
        }
    }

    // --- Loop ---

    update(): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const isAlive = p.update();

            if (!isAlive) {
                this.recycleParticle(p);
                this.particles.splice(i, 1);
            }
        }
    }

    draw(): void {
        // Optional: Clear logic can be handled externally or here
        // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        for (const p of this.particles) {
            p.draw(this.ctx);
        }
        this.ctx.restore();
    }

    clear(): void {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
