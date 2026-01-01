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
        this.type = options.type || 'circle'; // circle, star, spark, heart, skull, cross
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

        case 'heart':
            this.drawHeart(ctx);
            break;

        case 'skull':
            this.drawSkull(ctx);
            break;

        case 'cross':
            this.drawCross(ctx);
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

    drawHeart(ctx) {
        const x = this.x;
        const y = this.y;
        const size = this.size;

        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
        ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.8, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.8, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
        ctx.fill();
    }

    drawSkull(ctx) {
        const x = this.x;
        const y = this.y;
        const size = this.size;

        // Cranium
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Jaw
        ctx.fillRect(x - size * 0.6, y + size * 0.5, size * 1.2, size * 0.8);

        // Eyes (clearing)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y, size * 0.25, 0, Math.PI * 2);
        ctx.arc(x + size * 0.3, y, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    drawCross(ctx) {
        const x = this.x;
        const y = this.y;
        const size = this.size;
        const thickness = size * 0.4;

        ctx.fillRect(x - thickness / 2, y - size, thickness, size * 2);
        ctx.fillRect(x - size, y - thickness / 2, size * 2, thickness);
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
     * Fire attack effect
     */
    fireAttackEffect(x, y) {
        const fireColors = ['#ef4444', '#f97316', '#fbbf24'];

        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const color = fireColors[Math.floor(Math.random() * fireColors.length)];
                this.addParticle(x, y, {
                    vx: (Math.random() - 0.5) * 3,
                    vy: -2 - Math.random() * 3,
                    color,
                    size: 4 + Math.random() * 4,
                    decay: 0.015,
                    gravity: -0.05,
                    type: 'circle'
                });
            }, i * 20);
        }
    }

    /**
     * Ice attack effect
     */
    iceAttackEffect(x, y) {
        const iceColors = ['#3b82f6', '#60a5fa', '#e0f2fe'];

        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const color = iceColors[Math.floor(Math.random() * iceColors.length)];
                this.addParticle(x, y, {
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    color,
                    size: 2 + Math.random() * 3,
                    decay: 0.01,
                    gravity: 0.02,
                    type: 'star'
                });
            }, i * 25);
        }
    }

    /**
     * Lightning attack effect
     */
    lightningAttackEffect(x, y) {
        // Flash burst
        this.burst(x, y, 20, {
            color: '#fbbf24',
            size: 2,
            speed: 5,
            decay: 0.05,
            type: 'spark'
        });

        // Electric sparks
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.addParticle(
                    x + (Math.random() - 0.5) * 40,
                    y + (Math.random() - 0.5) * 40,
                    {
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        color: Math.random() > 0.5 ? '#fbbf24' : '#e0f2fe',
                        size: 1 + Math.random() * 2,
                        decay: 0.04,
                        type: 'spark'
                    }
                );
            }, i * 15);
        }
    }

    /**
     * Level up celebration effect
     */
    levelUpEffect(x, y) {
        const celebrationColors = ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];

        // Multiple bursts
        for (let burst = 0; burst < 5; burst++) {
            setTimeout(() => {
                celebrationColors.forEach(color => {
                    this.explosion(
                        x + (Math.random() - 0.5) * 100,
                        y + (Math.random() - 0.5) * 50,
                        color,
                        15
                    );
                });
            }, burst * 200);
        }

        // Rising stars
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
                this.addParticle(
                    x + (Math.random() - 0.5) * 150,
                    y + 50,
                    {
                        vx: (Math.random() - 0.5) * 1,
                        vy: -3 - Math.random() * 2,
                        color,
                        size: 3 + Math.random() * 4,
                        decay: 0.008,
                        gravity: -0.01,
                        type: 'star'
                    }
                );
            }, i * 50);
        }
    }

    /**
     * Enhanced mana crystal glitter effect
     */
    manaGlitterEffect(x, y, color) {
        const colors = {
            'red': ['#ef4444', '#fca5a5'],
            'blue': ['#3b82f6', '#93c5fd'],
            'white': ['#f9fafb', '#e5e7eb'],
            'green': ['#10b981', '#6ee7b7'],
            'gold': ['#fbbf24', '#fde047'],
            'black': ['#374151', '#6b7280']
        };

        const particleColors = colors[color] || ['#ffffff', '#e5e7eb'];

        // Continuous glitter particles
        for (let i = 0; i < 3; i++) {
            const particleColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            this.addParticle(
                x + (Math.random() - 0.5) * 15,
                y + (Math.random() - 0.5) * 15,
                {
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: -0.5 - Math.random() * 0.5,
                    color: particleColor,
                    size: 1 + Math.random() * 2,
                    decay: 0.025,
                    gravity: -0.01,
                    type: 'star'
                }
            );
        }
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
    };

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

    /**
     * Victory rain effect - Confetti falling from top
     */
    victoryRainEffect(canvasWidth, canvasHeight) {
        const colors = ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'];

        // Create confetti bursts over time
        for (let burst = 0; burst < 10; burst++) {
            setTimeout(() => {
                for (let i = 0; i < 20; i++) {
                    const x = Math.random() * canvasWidth;
                    const color = colors[Math.floor(Math.random() * colors.length)];

                    this.addParticle(x, -10, {
                        vx: (Math.random() - 0.5) * 2,
                        vy: 2 + Math.random() * 3,
                        color,
                        size: 3 + Math.random() * 4,
                        decay: 0.005,
                        gravity: 0.1,
                        type: Math.random() > 0.5 ? 'star' : 'circle'
                    });
                }
            }, burst * 300);
        }
    }

    /**
     * Defeat smoke effect - Dark smoke rising
     */
    defeatSmokeEffect(x, y) {
        const smokeColors = ['#1f2937', '#374151', '#4b5563', '#6b7280'];

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
                this.addParticle(
                    x + (Math.random() - 0.5) * 100,
                    y,
                    {
                        vx: (Math.random() - 0.5) * 1,
                        vy: -1 - Math.random() * 2,
                        color,
                        size: 8 + Math.random() * 12,
                        decay: 0.008,
                        gravity: -0.05,
                        type: 'circle'
                    }
                );
            }, i * 50);
        }
    }

    /**
     * Card glow effect - Ambient glow particles around card
     */
    cardGlowEffect(x, y, color = '#8b5cf6') {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;

            this.addParticle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                {
                    vx: Math.cos(angle) * 0.2,
                    vy: Math.sin(angle) * 0.2,
                    color,
                    size: 2 + Math.random() * 3,
                    decay: 0.015,
                    type: 'star'
                }
            );
        }
    }

    /**
     * Dust cloud effect for movement
     */
    dustCloudEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;

            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5,
                color: 'rgba(156, 163, 175, 0.6)',
                size: 3 + Math.random() * 4,
                decay: 0.02,
                gravity: -0.02,
                type: 'circle'
            });
        }
    }

    /**
     * Enhanced combat clash - More dramatic impact
     */
    combatClashEffect(x, y, attackType = 'physical') {
        let colors, particleCount, effectType;

        switch (attackType) {
        case 'fire':
            colors = ['#ef4444', '#f97316', '#fbbf24'];
            particleCount = 35;
            effectType = 'circle';
            break;
        case 'ice':
            colors = ['#3b82f6', '#60a5fa', '#93c5fd'];
            particleCount = 30;
            effectType = 'star';
            break;
        case 'lightning':
            colors = ['#fbbf24', '#fde047', '#e0f2fe'];
            particleCount = 25;
            effectType = 'spark';
            break;
        default: // physical
            colors = ['#ef4444', '#dc2626', '#fb923c'];
            particleCount = 30;
            effectType = 'circle';
        }

        // Main impact burst
        this.burst(x, y, particleCount, {
            color: colors[0],
            size: 4 + Math.random() * 3,
            speed: 3 + Math.random() * 2,
            decay: 0.025,
            gravity: 0.15,
            type: effectType
        });

        // Secondary shockwave
        setTimeout(() => {
            this.burst(x, y, 15, {
                color: colors[1] || colors[0],
                size: 2,
                speed: 4,
                decay: 0.04,
                type: 'spark'
            });
        }, 100);
    }

    /**
     * Shield block effect - Protective burst
     */
    shieldBlockEffect(x, y) {
        const shieldColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#e0f2fe'];

        // Circular shield burst
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random();

            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: shieldColors[Math.floor(Math.random() * shieldColors.length)],
                size: 3 + Math.random() * 2,
                decay: 0.03,
                type: 'star'
            });
        }
    }

    /**
     * Damage numbers - Floating text effect
     * Note: This uses canvas text rendering
     */
    createDamageNumber(x, y, damage, isCritical = false) {
        // Create special particle for damage number
        const color = isCritical ? '#fbbf24' : '#ef4444';
        const particle = {
            x,
            y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -2,
            life: 1.5,
            decay: 0.01,
            opacity: 1,
            damage,
            isCritical,

            update(deltaTime = 1) {
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                this.vy += 0.05 * deltaTime; // Slight upward deceleration
                this.life -= this.decay * deltaTime;
                this.opacity = Math.max(0, this.life / 1.5);
                return this.life > 0;
            },

            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.font = `${this.isCritical ? 'bold ' : ''}${this.isCritical ? 28 : 20}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Stroke (outline)
                ctx.strokeText(this.damage.toString(), this.x, this.y);
                // Fill
                ctx.fillText(this.damage.toString(), this.x, this.y);

                ctx.restore();
            }
        };

        this.particles.push(particle);
        if (!this.isRunning) {
            this.start();
        }
    }
    /**
     * Card played effect
     */
    playCardEffect(x, y, color) {
        const colors = {
            'red': '#ef4444',
            'blue': '#3b82f6',
            'white': '#f9fafb',
            'green': '#10b981',
            'gold': '#fbbf24',
            'black': '#374151'
        };

        const particleColor = colors[color] || '#ffffff';

        // Burst
        this.burst(x, y, 20, {
            color: particleColor,
            size: 3,
            speed: 4,
            decay: 0.03,
            type: 'star'
        });

        // Ring
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 3;
            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: particleColor,
                size: 2,
                decay: 0.02,
                type: 'circle'
            });
        }
    }

    /**
     * Massive Level Up Explosion
     */
    levelUpExplosion(x, y) {
        const colors = ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];

        // Initial flash
        this.burst(x, y, 50, {
            color: '#ffffff',
            size: 5,
            speed: 8,
            decay: 0.05,
            type: 'spark'
        });

        // Multiple colored bursts
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const color = colors[i % colors.length];
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;

                this.explosion(x + offsetX, y + offsetY, color, 40);

                // Add some stars
                for (let j = 0; j < 10; j++) {
                    this.addParticle(x + offsetX, y + offsetY, {
                        vx: (Math.random() - 0.5) * 4,
                        vy: -2 - Math.random() * 4,
                        color: color,
                        size: 4,
                        decay: 0.01,
                        gravity: 0.05,
                        type: 'star'
                    });
                }
            }, i * 200);
        }
    }

    /**
     * Damage Splatter
     */
    damageSplatter(x, y, amount) {
        const count = Math.min(amount * 2, 30);

        for (let i = 0; i < count; i++) {
            this.addParticle(x, y, {
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#ef4444',
                size: 2 + Math.random() * 3,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.2,
                type: 'circle'
            });
        }

        // Add some sparks
        this.burst(x, y, 10, {
            color: '#fbbf24',
            size: 2,
            speed: 5,
            decay: 0.05,
            type: 'spark'
        });
    }

    /**
     * Healing Aura
     */
    healAura(x, y) {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 40;

                // Rising crosses/hearts
                this.addParticle(x + offsetX, y + 20, {
                    vx: 0,
                    vy: -1 - Math.random(),
                    color: '#10b981',
                    size: 4 + Math.random() * 4,
                    decay: 0.01,
                    type: Math.random() > 0.5 ? 'cross' : 'heart'
                });

                // Spiral particles
                this.addParticle(x, y, {
                    vx: Math.cos(i) * 2,
                    vy: -2,
                    color: '#34d399',
                    size: 2,
                    decay: 0.02,
                    type: 'circle'
                });
            }, i * 100);
        }
    }

    /**
     * Buff/Enhancement effect for units
     */
    buffEffect(x, y) {
        const buffColors = ['#fbbf24', '#fde047', '#fef08a'];

        // Rising glow
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const color = buffColors[Math.floor(Math.random() * buffColors.length)];
                this.addParticle(
                    x + (Math.random() - 0.5) * 30,
                    y,
                    {
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -1.5 - Math.random() * 1.5,
                        color,
                        size: 3 + Math.random() * 3,
                        decay: 0.015,
                        gravity: -0.02,
                        type: 'star'
                    }
                );
            }, i * 60);
        }

        // Circle burst
        this.burst(x, y, 12, {
            color: '#fbbf24',
            size: 2,
            speed: 2,
            decay: 0.025,
            type: 'star'
        });
    }
}

export default ParticleSystem;
