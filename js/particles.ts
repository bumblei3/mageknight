// Particle System for Mage Knight
// Canvas-based particle effects for mana, magic, and combat

import { Particle, ParticleOptions } from './particles/Particle';
import { ParticleEngine } from './particles/ParticleEngine';
import { CombatEffects } from './particles/CombatEffects';
import { MagicEffects } from './particles/MagicEffects';
import { EnvironmentEffects } from './particles/EnvironmentEffects';

// Re-export Particle for backward compatibility
export { Particle };

export interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    vy: number;
    scale?: number;
    update: () => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
}

export class ParticleSystem {
    static MAX_PARTICLES = 500;

    public engine: ParticleEngine;
    public combatEffects: CombatEffects;
    public magicEffects: MagicEffects;
    public envEffects: EnvironmentEffects;
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    // Floating Text Array (Handled separately as it's not strictly a "particle")
    public floatingTexts: FloatingText[];

    // Shake state for backward compatibility
    public shakeMagnitude: number;
    public shakeTime: number;
    public totalShakeTime: number;
    public freezeTime: number;
    public shakeOffsetX: number;
    public shakeOffsetY: number;
    private lastTime: number;
    public running: boolean;

    // External systems that need to be updated (e.g. Weather)
    public externalSystems: any[];

    constructor(canvas: HTMLCanvasElement) {
        // Core Engine
        this.engine = new ParticleEngine(canvas);

        // Sub-systems
        this.combatEffects = new CombatEffects(this.engine);
        this.magicEffects = new MagicEffects(this.engine);
        this.envEffects = new EnvironmentEffects(this.engine);

        // Legacy accessors if needed (or just delegate)
        this.canvas = canvas;
        this.ctx = this.engine.ctx;

        // Floating Text Array
        this.floatingTexts = [];

        // Shake state
        this.shakeMagnitude = 0;
        this.shakeTime = 0;
        this.totalShakeTime = 0;
        this.freezeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.lastTime = performance.now();
        this.running = false;

        this.externalSystems = [];
    }

    get particles(): Particle[] { return this.engine.particles; }
    get isRunning(): boolean { return this.running || this.particles.length > 0 || this.floatingTexts.length > 0 || this.shakeTime > 0; }

    registerSystem(system: any): void {
        this.externalSystems.push(system);
    }

    addParticle(x: number, y: number, options: ParticleOptions): void {
        this.engine.addParticle(x, y, options);
    }

    resetParticle(particle: Particle, x: number, y: number, options: ParticleOptions = {}): void {
        this.engine.resetParticle(particle, x, y, options);
    }

    burst(x: number, y: number, count: number, options: ParticleOptions = {}): void {
        this.engine.burst(x, y, count, options);
    }

    // --- Delegation Methods ---

    manaEffect(x: number, y: number, color: string): void { this.magicEffects.manaEffect(x, y, color); }
    manaGlitterEffect(x: number, y: number, color: string): void { this.magicEffects.manaGlitterEffect(x, y, color); }
    healEffect(x: number, y: number): void { this.magicEffects.healEffect(x, y); }
    cardGlowEffect(x: number, y: number, color: string): void { this.magicEffects.cardGlowEffect(x, y, color); }
    playCardEffect(x: number, y: number, color: string): void { this.magicEffects.playCardEffect(x, y, color); }

    impactEffect(x: number, y: number, color: string): void { this.combatEffects.impactEffect(x, y, color); }
    combatClashEffect(x: number, y: number, type: string): void { this.combatEffects.combatClashEffect(x, y, type); }
    shieldBlockEffect(x: number, y: number): void { this.combatEffects.shieldBlockEffect(x, y); }
    damageSplatter(x: number, y: number, amount: number): void { this.combatEffects.damageSplatter(x, y, amount); }
    fireAttackEffect(x: number, y: number): void { this.combatEffects.fireAttackEffect(x, y); }
    iceAttackEffect(x: number, y: number): void { this.combatEffects.iceAttackEffect(x, y); }
    lightningAttackEffect(x: number, y: number): void { this.combatEffects.lightningAttackEffect(x, y); }

    trailEffect(x: number, y: number, color: string): void { this.envEffects.trailEffect(x, y, color); }
    dustCloudEffect(x: number, y: number): void { this.envEffects.dustCloudEffect(x, y); }
    explosion(x: number, y: number, color: string, count: number): void { this.envEffects.explosion(x, y, color, count); }
    levelUpEffect(x: number, y: number): void { this.envEffects.levelUpEffect(x, y); }
    levelUpExplosion(x: number, y: number): void { this.envEffects.levelUpEffect(x, y); } // Alias
    discoveryEffect(x: number, y: number): void { this.envEffects.discoveryEffect(x, y); }
    victoryRainEffect(w: number, h: number): void { this.envEffects.victoryRainEffect(w, h); }
    defeatSmokeEffect(x: number, y: number): void { this.envEffects.defeatSmokeEffect(x, y); }

    buffEffect(x: number, y: number): void { this.magicEffects.healEffect(x, y); } // Re-use heal for now
    healAura(x: number, y: number): void { this.magicEffects.healEffect(x, y); } // Alias for backward compatibility

    // --- Main Loop ---

    update(): void {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.engine.update();

        // Update shake with decay
        if (this.shakeTime > 0) {
            this.shakeTime -= deltaTime;
            const currentMag = (this.shakeTime / this.totalShakeTime) * this.shakeMagnitude;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentMag;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentMag;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Handle Hit-stop (Freeze frames)
        if (this.freezeTime > 0) {
            this.freezeTime -= deltaTime;
            return; // Skip particle/text updates while frozen
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.update();
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update External Systems
        this.externalSystems.forEach(sys => {
            if (typeof sys.update === 'function') sys.update(deltaTime);
        });
    }

    draw(): void {
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

    start(): void {
        if (!this.running) {
            this.running = true;
            this.animate();
        }
    }

    animate(): void {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    stop(): void {
        this.running = false;
    }

    clear(): void {
        this.engine.clear();
        this.floatingTexts = [];
    }

    // --- Floating Text Logic ---

    triggerShake(magnitude: number = 5, duration: number = 0.3): void {
        this.shakeMagnitude = magnitude;
        this.shakeTime = duration;
        this.totalShakeTime = duration;
    }

    /**
     * Briefly freezes the visual state to emphasize impact
     * @param {number} duration In seconds
     */
    freeze(duration: number = 0.05): void {
        this.freezeTime = duration;
    }

    createFloatingText(x: number, y: number, text: string, color: string = '#ffffff'): void {
        this.floatingTexts.push({
            x, y, text, color,
            life: 1.0,
            vy: -1,
            update() {
                this.y += this.vy;
                this.life -= 0.02;
            },
            draw(ctx: CanvasRenderingContext2D) {
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                ctx.font = 'bold 20px Arial';
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1.0;
            }
        });
    }

    createDamageNumber(x: number, y: number, damage: number, isCritical: boolean = false): void {
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
                if (isCritical) {
                    this.scale = 1 + Math.sin(Date.now() / 100) * 0.2;
                }
            },
            draw(ctx: CanvasRenderingContext2D) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.translate(this.x, this.y);
                if (isCritical) {
                    if (this.scale) ctx.scale(this.scale, this.scale);
                }
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
