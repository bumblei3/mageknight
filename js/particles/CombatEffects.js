export class CombatEffects {
    constructor(engine) {
        this.engine = engine;
    }

    impactEffect(x, y, color = '#ff4444') {
        this.engine.burst(x, y, 15, {
            type: 'spark',
            color: color,
            speed: 5,
            size: 2,
            decay: 0.08
        });
    }

    combatClashEffect(x, y, attackType = 'physical') {
        const colors = {
            physical: ['#cbd5e1', '#94a3b8', '#64748b'],
            fire: ['#fca5a5', '#ef4444', '#b91c1c'],
            ice: ['#bae6fd', '#38bdf8', '#0284c7'],
            cold_fire: ['#c4b5fd', '#8b5cf6', '#4c1d95']
        };

        const palette = colors[attackType] || colors.physical;
        const speed = 7;

        for (let i = 0; i < 25; i++) {
            this.engine.addParticle(x, y, {
                type: 'spark',
                color: palette[Math.floor(Math.random() * palette.length)],
                speed: speed,
                size: Math.random() * 3 + 1,
                decay: 0.04 + Math.random() * 0.04
            });
        }
    }

    shieldBlockEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 3;
            this.engine.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#60a5fa', // Blue shield
                size: 3,
                decay: 0.04
            });
        }
    }

    damageSplatter(x, y, amount) {
        const count = Math.min(amount * 2, 20); // Cap at 20 fallback
        this.engine.burst(x, y, count, {
            color: '#ef4444',
            speed: 3,
            gravity: 0.2,
            size: 3,
            decay: 0.02
        });
    }

    // Attack Types
    fireAttackEffect(x, y) {
        this.engine.burst(x, y, 20, {
            color: '#ef4444', // Red
            speed: 5,
            decay: 0.04,
            size: 4
        });
    }

    iceAttackEffect(x, y) {
        this.engine.burst(x, y, 20, {
            color: '#38bdf8', // Light Blue
            speed: 5,
            decay: 0.04,
            size: 4
        });
    }

    lightningAttackEffect(x, y) {
        this.engine.burst(x, y, 15, {
            color: '#fbbf24', // Yellow
            speed: 8, // Fast
            decay: 0.08, // Quick fade
            size: 3
        });
    }
}
