// Particle System for Mage Knight
// Canvas-based particle effects for mana, magic, and combat

export class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 2;
        this.vy = options.vy || (Math.random() - 0.5) * 2;
        this.life = options.life || 1.0;
        this.decay = options.decay || 0.01;
        this.size = options.size || 3;
        this.color = options.color || '#ffffff';
        this.gravity = options.gravity || 0;
        this.opacity = 1;
        this.type = options.type || 'circle'; // circle, star, spark
    }

    update(deltaTime = 1) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += this.gravity * deltaTime;
        this.life -= this.decay * deltaTime;
        this.opacity = Math.max(0, this.life);

        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        switch (this.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'star':
                this.drawStar(ctx);
                break;

            case 'spark':
                this.drawSpark(ctx);
                break;
        }

        ctx.restore();
    }

    drawStar(ctx) {
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    drawSpark(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.stroke();
    }
}

export class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.isRunning = false;
        this.lastTime = performance.now();
    }

    /**
     * Add a single particle
     */
    addParticle(x, y, options) {
        this.particles.push(new Particle(x, y, options));

        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * Create a burst of particles
     */
    burst(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = options.speed || 2;
            const vx = Math.cos(angle) * speed * (0.5 + Math.random() * 0.5);
            const vy = Math.sin(angle) * speed * (0.5 + Math.random() * 0.5);

            this.addParticle(x, y, {
                ...options,
                vx,
                vy
            });
        }
    }

    /**
     * Create mana-specific effects
     */
    manaEffect(x, y, color) {
        const colors = {
            'red': '#ef4444',
            'blue': '#3b82f6',
            'white': '#f9fafb',
            'green': '#10b981',
            'gold': '#fbbf24',
            'black': '#374151'
        };

        const particleColor = colors[color] || color;

        // Rising particles
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.addParticle(x, y, {
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -1 - Math.random() * 2,
                    color: particleColor,
                    size: 2 + Math.random() * 3,
                    decay: 0.02,
                    gravity: -0.02,
                    type: 'star'
                });
            }, i * 50);
        }
    }

    /**
     * Combat impact effect
     */
    impactEffect(x, y, color = '#ff4444') {
        this.burst(x, y, 15, {
            color,
            size: 3,
            speed: 3,
            decay: 0.03,
            gravity: 0.1,
            type: 'spark'
        });
    }

    /**
     * Heal/buff effect
     */
    healEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.addParticle(
                    x + (Math.random() - 0.5) * 20,
                    y + 20,
                    {
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: -2 - Math.random(),
                        color: '#10b981',
                        size: 2 + Math.random() * 2,
                        decay: 0.015,
                        type: 'circle'
                    }
                );
            }, i * 30);
        }
    }

    /**
     * Trail effect for movement
     */
    trailEffect(x, y, color = '#8b5cf6') {
        this.addParticle(x, y, {
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            color,
            size: 4,
            decay: 0.02,
            type: 'circle'
        });
    }

    /**
     * Explosion effect
     */
    explosion(x, y, color = '#ec4899', count = 30) {
        this.burst(x, y, count, {
            color,
            size: 3 + Math.random() * 3,
            speed: 2 + Math.random() * 3,
            decay: 0.02,
            gravity: 0.15,
            type: 'circle'
        });
    }

    /**
     * Update all particles
     */
    update() {
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2); // Cap at 2x for performance
        this.lastTime = currentTime;

        // Update and filter out dead particles
        this.particles = this.particles.filter(particle => particle.update(deltaTime));

        // Stop animation loop if no particles
        if (this.particles.length === 0) {
            this.stop();
        }
    }

    /**
     * Draw all particles
     */
    draw() {
        this.particles.forEach(particle => particle.draw(this.ctx));
    }

    /**
     * Animation loop
     */
    animate = () => {
        if (this.isRunning) {
            this.update();
            this.draw();
            requestAnimationFrame(this.animate);
        }
    }

    /**
     * Start the particle system
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this.animate);
        }
    }

    /**
     * Stop the particle system
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
        this.stop();
    }
}

export default ParticleSystem;
