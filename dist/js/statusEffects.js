// Status Effects System for Mage Knight
// Handles persistent effects that last across phases/turns

export const EFFECT_TYPES = {
    STUN: 'stun',
    BURN: 'burn',
    FREEZE: 'freeze',
    POISON: 'poison',
    WEAKEN: 'weaken',
    SHIELD: 'shield',
    ENRAGE: 'enrage'
};

export const EFFECT_TARGETS = {
    HERO: 'hero',
    ENEMY: 'enemy'
};

// Effect definitions
export const EFFECT_DEFINITIONS = {
    [EFFECT_TYPES.STUN]: {
        name: 'Betäubt',
        icon: '💫',
        description: 'Kann keine Aktion ausführen',
        duration: 1,
        stackable: false,
        onApply: (target) => {
            target.stunned = true;
        },
        onRemove: (target) => {
            target.stunned = false;
        },
        onPhaseStart: null
    },
    [EFFECT_TYPES.BURN]: {
        name: 'Brennend',
        icon: '🔥',
        description: 'Erleidet 1 Schaden pro Phase',
        duration: 3,
        stackable: true,
        maxStacks: 3,
        onApply: null,
        onRemove: null,
        onPhaseStart: (target, stacks) => {
            return { damage: stacks };
        }
    },
    [EFFECT_TYPES.FREEZE]: {
        name: 'Eingefroren',
        icon: '❄️',
        description: 'Block-Effektivität halbiert',
        duration: 2,
        stackable: false,
        onApply: (target) => {
            target.blockModifier = 0.5;
        },
        onRemove: (target) => {
            target.blockModifier = 1.0;
        },
        onPhaseStart: null
    },
    [EFFECT_TYPES.POISON]: {
        name: 'Vergiftet',
        icon: '☠️',
        description: 'Erleidet am Ende des Kampfes zusätzliche Wunden',
        duration: -1, // Lasts until end of combat
        stackable: true,
        maxStacks: 5,
        onApply: null,
        onRemove: null,
        onCombatEnd: (target, stacks) => {
            return { wounds: stacks };
        }
    },
    [EFFECT_TYPES.WEAKEN]: {
        name: 'Geschwächt',
        icon: '💔',
        description: 'Angriff um 1 reduziert',
        duration: 2,
        stackable: true,
        maxStacks: 3,
        onApply: (target, stacks) => {
            target.attackModifier = -stacks;
        },
        onRemove: (target) => {
            target.attackModifier = 0;
        },
        onPhaseStart: null
    },
    [EFFECT_TYPES.SHIELD]: {
        name: 'Geschützt',
        icon: '🛡️',
        description: 'Absorbiert den nächsten Schaden',
        duration: 1,
        stackable: true,
        maxStacks: 5,
        onApply: null,
        onRemove: null,
        onDamageTaken: (target, damage, stacks) => {
            const absorbed = Math.min(damage, stacks);
            return {
                reducedDamage: damage - absorbed,
                stacksConsumed: absorbed
            };
        }
    },
    [EFFECT_TYPES.ENRAGE]: {
        name: 'Wütend',
        icon: '😡',
        description: 'Angriff verdoppelt, aber auch erlittener Schaden',
        duration: 3,
        stackable: false,
        onApply: (target) => {
            target.enraged = true;
        },
        onRemove: (target) => {
            target.enraged = false;
        },
        onPhaseStart: null
    }
};

// Status Effect instance
export class StatusEffect {
    constructor(type, target, source = null) {
        const def = EFFECT_DEFINITIONS[type];
        if (!def) {
            throw new Error(`Unknown effect type: ${type}`);
        }

        this.type = type;
        this.name = def.name;
        this.icon = def.icon;
        this.description = def.description;
        this.duration = def.duration;
        this.remainingDuration = def.duration;
        this.stacks = 1;
        this.maxStacks = def.maxStacks || 1;
        this.stackable = def.stackable;
        this.target = target;
        this.source = source;

        // Callbacks
        this.onApply = def.onApply;
        this.onRemove = def.onRemove;
        this.onPhaseStart = def.onPhaseStart;
        this.onDamageTaken = def.onDamageTaken;
        this.onCombatEnd = def.onCombatEnd;
    }

    // Add a stack
    addStack() {
        if (this.stackable && this.stacks < this.maxStacks) {
            this.stacks++;
            return true;
        }
        return false;
    }

    // Tick duration (call at phase end)
    tick() {
        if (this.duration === -1) return true; // Permanent until removed
        this.remainingDuration--;
        return this.remainingDuration > 0;
    }

    // Check if effect is expired
    isExpired() {
        return this.duration !== -1 && this.remainingDuration <= 0;
    }
}

// Status Effect Manager
export class StatusEffectManager {
    constructor() {
        this.heroEffects = new Map(); // type -> StatusEffect
        this.enemyEffects = new Map(); // enemyId -> Map(type -> StatusEffect)
    }

    // Apply an effect to the hero
    applyToHero(hero, effectType, source = null) {
        return this._applyEffect(this.heroEffects, effectType, hero, source);
    }

    // Apply an effect to an enemy
    applyToEnemy(enemy, effectType, source = null) {
        if (!this.enemyEffects.has(enemy.id)) {
            this.enemyEffects.set(enemy.id, new Map());
        }
        return this._applyEffect(this.enemyEffects.get(enemy.id), effectType, enemy, source);
    }

    // Internal apply logic
    _applyEffect(effectMap, effectType, target, source) {
        if (effectMap.has(effectType)) {
            // Effect already exists - try to stack
            const existing = effectMap.get(effectType);
            if (existing.addStack()) {
                // Refresh duration on stack
                existing.remainingDuration = existing.duration;
                return { success: true, stacked: true, effect: existing };
            }
            // Can't stack, just refresh duration
            existing.remainingDuration = existing.duration;
            return { success: true, refreshed: true, effect: existing };
        }

        // New effect
        const effect = new StatusEffect(effectType, target, source);
        effectMap.set(effectType, effect);

        // Trigger onApply callback
        if (effect.onApply) {
            effect.onApply(target, effect.stacks);
        }

        return { success: true, applied: true, effect };
    }

    // Remove an effect from hero
    removeFromHero(hero, effectType) {
        return this._removeEffect(this.heroEffects, effectType, hero);
    }

    // Remove an effect from enemy
    removeFromEnemy(enemy, effectType) {
        if (!this.enemyEffects.has(enemy.id)) return { success: false };
        return this._removeEffect(this.enemyEffects.get(enemy.id), effectType, enemy);
    }

    // Internal remove logic
    _removeEffect(effectMap, effectType, target) {
        if (!effectMap.has(effectType)) {
            return { success: false };
        }

        const effect = effectMap.get(effectType);

        // Trigger onRemove callback
        if (effect.onRemove) {
            effect.onRemove(target);
        }

        effectMap.delete(effectType);
        return { success: true, effect };
    }

    // Process phase start for hero
    processHeroPhaseStart(hero) {
        return this._processPhaseStart(this.heroEffects, hero);
    }

    // Process phase start for all enemies
    processEnemyPhaseStart(enemies) {
        const results = [];
        for (const enemy of enemies) {
            if (this.enemyEffects.has(enemy.id)) {
                const result = this._processPhaseStart(this.enemyEffects.get(enemy.id), enemy);
                if (result) {
                    results.push({ enemy, ...result });
                }
            }
        }
        return results;
    }

    // Internal phase start processing
    _processPhaseStart(effectMap, target) {
        let totalDamage = 0;
        const expiredEffects = [];

        for (const [type, effect] of effectMap) {
            // Trigger onPhaseStart
            if (effect.onPhaseStart) {
                const result = effect.onPhaseStart(target, effect.stacks);
                if (result && result.damage) {
                    totalDamage += result.damage;
                }
            }

            // Tick duration
            if (!effect.tick()) {
                expiredEffects.push(type);
            }
        }

        // Remove expired effects
        for (const type of expiredEffects) {
            this._removeEffect(effectMap, type, target);
        }

        return totalDamage > 0 ? { damage: totalDamage, expired: expiredEffects } : null;
    }

    // Process combat end
    processCombatEnd(hero) {
        let totalWounds = 0;

        for (const effect of this.heroEffects.values()) {
            if (effect.onCombatEnd) {
                const result = effect.onCombatEnd(hero, effect.stacks);
                if (result && result.wounds) {
                    totalWounds += result.wounds;
                }
            }
        }

        return { wounds: totalWounds };
    }

    // Get all effects on hero
    getHeroEffects() {
        return Array.from(this.heroEffects.values());
    }

    // Get all effects on an enemy
    getEnemyEffects(enemy) {
        if (!this.enemyEffects.has(enemy.id)) return [];
        return Array.from(this.enemyEffects.get(enemy.id).values());
    }

    // Check if hero has specific effect
    heroHasEffect(effectType) {
        return this.heroEffects.has(effectType);
    }

    // Check if enemy has specific effect
    enemyHasEffect(enemy, effectType) {
        return this.enemyEffects.has(enemy.id) && this.enemyEffects.get(enemy.id).has(effectType);
    }

    // Clear all effects (for new combat)
    clear() {
        // Trigger onRemove for all hero effects
        for (const effect of this.heroEffects.values()) {
            if (effect.onRemove) {
                effect.onRemove(effect.target);
            }
        }
        this.heroEffects.clear();
        this.enemyEffects.clear();
    }
}

export default StatusEffectManager;
