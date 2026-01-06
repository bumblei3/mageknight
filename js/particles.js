// Particle System for Mage Knight
// Canvas-based particle effects for mana, magic, and combat

import { Particle } from './particles/Particle.js';
import { ParticleEngine } from './particles/ParticleEngine.js';
import { CombatEffects } from './particles/CombatEffects.js';
import { MagicEffects } from './particles/MagicEffects.js';
import { EnvironmentEffects } from './particles/EnvironmentEffects.js';

// Re-export Particle for backward compatibility
export { Particle };

export class ParticleSystem {
    static MAX_PARTICLES = 500;

    constructor(canvas) {
        // Core Engine
        this.engine = new ParticleEngine(canvas);

        // Sub-systems
        this.combatEffects = new CombatEffects(this.engine);
        this.magicEffects = new MagicEffects(this.engine);
        this.envEffects = new EnvironmentEffects(this.engine);

        // Legacy accessors if needed (or just delegate)
        this.canvas = canvas;
        this.ctx = this.engine.ctx;

        // Floating Text Array (Handled separately as it's not strictly a "particle")
        this.floatingTexts = [];

        // Shake state for backward compatibility
        this.shakeMagnitude = 0;
        this.shakeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.lastTime = performance.now();
    }

    get particles() { return this.engine.particles; }
    get isRunning() { return this.running || this.particles.length > 0 || this.floatingTexts.length > 0 || this.shakeTime > 0; }

    addParticle(x, y, options) {
        this.engine.addParticle(x, y, options);
    }

    resetParticle(particle, x, y, options = {}) {
        this.engine.resetParticle(particle, x, y, options);
    }

    burst(x, y, count, options = {}) {
        this.engine.burst(x, y, count, options);
    }

    // --- Delegation Methods ---

    manaEffect(x, y, color) { this.magicEffects.manaEffect(x, y, color); }
    manaGlitterEffect(x, y, color) { this.magicEffects.manaGlitterEffect(x, y, color); }
    healEffect(x, y) { this.magicEffects.healEffect(x, y); }
    cardGlowEffect(x, y, color) { this.magicEffects.cardGlowEffect(x, y, color); }
    playCardEffect(x, y, color) { this.magicEffects.playCardEffect(x, y, color); }

    impactEffect(x, y, color) { this.combatEffects.impactEffect(x, y, color); }
    combatClashEffect(x, y, type) { this.combatEffects.combatClashEffect(x, y, type); }
    shieldBlockEffect(x, y) { this.combatEffects.shieldBlockEffect(x, y); }
    damageSplatter(x, y, amount) { this.combatEffects.damageSplatter(x, y, amount); }
    fireAttackEffect(x, y) { this.combatEffects.fireAttackEffect(x, y); }
    iceAttackEffect(x, y) { this.combatEffects.iceAttackEffect(x, y); }
    lightningAttackEffect(x, y) { this.combatEffects.lightningAttackEffect(x, y); }

    trailEffect(x, y, color) { this.envEffects.trailEffect(x, y, color); }
    dustCloudEffect(x, y) { this.envEffects.dustCloudEffect(x, y); }
    explosion(x, y, color, count) { this.envEffects.explosion(x, y, color, count); }
    levelUpEffect(x, y) { this.envEffects.levelUpEffect(x, y); }
    levelUpExplosion(x, y) { this.envEffects.levelUpEffect(x, y); } // Alias
    discoveryEffect(x, y) { this.envEffects.discoveryEffect(x, y); }
    victoryRainEffect(w, h) { this.envEffects.victoryRainEffect(w, h); }
    defeatSmokeEffect(x, y) { this.envEffects.defeatSmokeEffect(x, y); }

    buffEffect(x, y) { this.magicEffects.healEffect(x, y); } // Re-use heal for now
    healAura(x, y) { this.magicEffects.healEffect(x, y); } // Alias for backward compatibility

    // --- Main Loop ---

    update() {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.engine.update();

        // Update shake
        if (this.shakeTime > 0) {
            this.shakeTime -= deltaTime;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.update();
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.save();
        if (this.shakeOffsetX || this.shakeOffsetY) {
            this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
        }

        this.engine.draw();

        // Draw Floating Texts
        for (const ft of this.floatingTexts) {
            ft.draw(this.ctx);
        }
        this.ctx.restore();
    }

    start() {
        // Animation loop logic is usually handled by game.js via requestAnimationFrame calling update()
        // but if it's self-contained:
        if (!this.running) {
            this.running = true;
            this.animate();
        }
    }

    animate() {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    stop() {
        this.running = false;
    }

    clear() {
        this.engine.clear();
        this.floatingTexts = [];
    }

    // --- Floating Text Logic (Kept here or extract to UI helper?) ---
    // Keeping here for now to avoid breaking too many things at once,
    // but ideally this belongs in a text renderer.

    triggerShake(magnitude = 1.0, duration = 0.5) {
        this.shakeMagnitude = magnitude;
        this.shakeTime = duration;
    }

    createFloatingText(x, y, text, color = '#ffffff') {
        this.floatingTexts.push({
            x, y, text, color,
            life: 1.0,
            vy: -1,
            update() {
                this.y += this.vy;
                this.life -= 0.02;
            },
            draw(ctx) {
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                ctx.font = 'bold 20px Arial';
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1.0;
            }
        });
    }

    createDamageNumber(x, y, damage, isCritical = false) {
        const color = isCritical ? '#ffcc00' : '#ff4444';
        const text = `${damage}`;
        this.floatingTexts.push({
            x, y, text, color,
            life: 1.0,
            vy: -2,
            scale: 1,
            update() {
                this.y += this.vy;
                this.life -= 0.015;
                if (isCritical) this.scale = 1 + Math.sin(Date.now() / 100) * 0.2;
            },
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.translate(this.x, this.y);
                if (isCritical) ctx.scale(this.scale, this.scale);
                ctx.fillStyle = this.color;
                ctx.font = 'bold 24px Arial';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeText(this.text, 0, 0);
                ctx.fillText(this.text, 0, 0);
                ctx.restore();
            }
        });
    }
}

export default ParticleSystem;
