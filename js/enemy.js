// Enemy system for Mage Knight

import { ENEMY_TYPES, BOSS_PHASES, ENEMY_DEFINITIONS, BOSS_DEFINITIONS } from './constants.js';
import { t } from './i18n/index.js';

export { ENEMY_TYPES, BOSS_PHASES, ENEMY_DEFINITIONS, BOSS_DEFINITIONS };

export class Enemy {
    constructor(data) {
        this.id = data.id || `enemy_${Date.now()}`;
        this.type = data.type;
        this.name = data.name || (data.type ? t(`enemies.${data.type}`) : 'Enemy');
        this.position = data.position || null;

        // Combat stats
        this.armor = data.armor || 0;
        this.attack = data.attack || 0;
        this.fame = data.fame || 0;

        // Abilities
        this.fortified = data.fortified || false;
        this.swift = data.swift || false;
        this.brutal = data.brutal || false;
        this.poison = data.poison || false;
        this.petrify = data.petrify || false;

        // Resistances
        this.fireResist = data.fireResist || false;
        this.iceResist = data.iceResist || false;
        this.physicalResist = data.physicalResist || false;

        // Visual
        this.icon = data.icon || '👹';
        this.color = data.color || '#ef4444';

        // Attack Type
        this.attackType = data.attackType || 'physical'; // physical, fire, ice, siege
    }

    // Calculate damage multiplier based on attack element
    getResistanceMultiplier(attackElement) {
        if (attackElement === 'fire' && this.fireResist) return 0.5;
        if (attackElement === 'ice' && this.iceResist) return 0.5;
        if (attackElement === 'physical' && this.physicalResist) return 0.5;
        return 1.0;
    }

    // Get effective attack value (doubled if brutal)
    getEffectiveAttack() {
        return this.brutal ? this.attack * 2 : this.attack;
    }

    // Get effective block requirement (doubled if swift)
    getBlockRequirement() {
        return this.swift ? this.attack * 2 : this.attack;
    }

    // Check if enemy is defeated
    isDefeated(attackValue) {
        if (attackValue !== undefined) {
            return attackValue >= this.armor;
        }
        return false;
    }

    /**
     * Gets state for persistence.
     */
    getState() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            position: this.position ? { ...this.position } : null,
            armor: this.armor,
            attack: this.attack,
            fame: this.fame,
            icon: this.icon,
            color: this.color,
            isBoss: this.isBoss || false
        };
    }

    /**
     * Loads state from object.
     */
    loadState(state) {
        if (!state) return;
        this.position = state.position ? { ...state.position } : null;
        // Other properties usually fixed from definition, but position is dynamic
    }

    // Clone enemy
    clone() {
        return new Enemy({
            type: this.type,
            name: this.name,
            armor: this.armor,
            attack: this.attack,
            fame: this.fame,
            fortified: this.fortified,
            swift: this.swift,
            brutal: this.brutal,
            poison: this.poison,
            petrify: this.petrify,
            fireResist: this.fireResist,
            iceResist: this.iceResist,
            physicalResist: this.physicalResist,
            icon: this.icon,
            color: this.color
        });
    }
}

// ============ BOSS ENEMY ============
// Bosses have multi-phase health and special abilities

// BOSS_PHASES imported from constants.js

export class BossEnemy extends Enemy {
    constructor(data) {
        super(data);

        this.isBoss = true;

        // Multi-phase health system
        this.maxHealth = data.maxHealth || 30;
        this.currentHealth = data.currentHealth || this.maxHealth;
        this.phases = data.phases || [
            { threshold: 0.66, name: t('ui.phases.phase1') || 'Phase 1', triggered: false },
            { threshold: 0.33, name: t('ui.phases.phase2') || 'Phase 2', triggered: false },
            { threshold: 0, name: t('ui.phases.enraged') || 'Enraged', triggered: false }
        ];
        this.currentPhase = BOSS_PHASES.PHASE_1;

        // Enrage mechanics
        this.enraged = false;
        this.enrageThreshold = data.enrageThreshold || 0.25;
        this.enrageMultiplier = data.enrageMultiplier || 1.5;

        // Special abilities per phase
        this.phaseAbilities = data.phaseAbilities || {
            [BOSS_PHASES.PHASE_1]: null,
            [BOSS_PHASES.PHASE_2]: 'summon',
            [BOSS_PHASES.PHASE_3]: 'heal',
            [BOSS_PHASES.ENRAGED]: 'double_attack'
        };

        // Summon data
        this.summonType = data.summonType || 'weakling';
        this.summonCount = data.summonCount || 2;
    }

    // Take damage and check phase transitions
    takeDamage(amount) {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - amount);

        const healthPercent = this.currentHealth / this.maxHealth;
        const transitions = [];

        // Check phase transitions
        for (const phase of this.phases) {
            if (!phase.triggered && healthPercent <= phase.threshold) {
                phase.triggered = true;
                transitions.push({
                    phase: phase.name,
                    ability: this.getPhaseAbility(phase.name)
                });
            }
        }

        // Check enrage
        if (!this.enraged && healthPercent <= this.enrageThreshold) {
            this.enraged = true;
            this.currentPhase = BOSS_PHASES.ENRAGED;
            transitions.push({
                phase: t('ui.phases.enraged') || 'Enraged',
                ability: 'enrage',
                message: t('combat.boss.enraged', { name: this.name })
            });
        }

        return {
            damage: amount,
            previousHealth,
            currentHealth: this.currentHealth,
            healthPercent,
            transitions,
            defeated: this.currentHealth <= 0
        };
    }

    // Get ability for phase
    getPhaseAbility(phaseName) {
        // Try direct lookup first (for custom phases)
        if (this.phaseAbilities[phaseName]) {
            return this.phaseAbilities[phaseName];
        }

        // Fallback for default mapping
        if (phaseName === 'Phase 2') return this.phaseAbilities[BOSS_PHASES.PHASE_2];
        if (phaseName === 'Phase 3') return this.phaseAbilities[BOSS_PHASES.PHASE_3];
        if (phaseName === 'Enraged') return this.phaseAbilities[BOSS_PHASES.ENRAGED];

        return null;
    }

    // Get effective attack (with enrage modifier)
    getEffectiveAttack() {
        let attack = super.getEffectiveAttack();
        if (this.enraged) {
            attack = Math.floor(attack * this.enrageMultiplier);
        }
        return attack;
    }

    // Check if boss is defeated (health-based, not armor)
    isDefeated(_attackValue = null) {
        return this.currentHealth <= 0;
    }

    /**
     * Gets state for persistence.
     */
    getState() {
        const state = super.getState();
        return {
            ...state,
            maxHealth: this.maxHealth,
            currentHealth: this.currentHealth,
            phase: this.phase,
            summonType: this.summonType,
            summonCount: this.summonCount
        };
    }

    /**
     * Loads state from object.
     */
    loadState(state) {
        super.loadState(state);
        if (state.currentHealth !== undefined) this.currentHealth = state.currentHealth;
        if (state.phase !== undefined) this.phase = state.phase;
    }

    // Get current health percentage
    getHealthPercent() {
        return this.currentHealth / this.maxHealth;
    }

    // Get phase name
    getPhaseName() {
        if (this.enraged) return t('ui.phases.enraged') || 'Wütend';
        const healthPercent = this.getHealthPercent();
        if (healthPercent > 0.66) return t('ui.phases.phase1') || 'Phase 1';
        if (healthPercent > 0.33) return t('ui.phases.phase2') || 'Phase 2';
        return t('ui.phases.phase3') || 'Phase 3';
    }

    // Execute phase ability (returns what should happen)
    executePhaseAbility(abilityName) {
        switch (abilityName) {
            case 'summon':
                return {
                    type: 'summon',
                    enemyType: this.summonType,
                    count: this.summonCount,
                    message: t('combat.boss.summons', { name: this.name, count: this.summonCount, enemy: t(`enemies.${this.summonType}`) })
                };
            case 'heal': {
                const healAmount = Math.floor(this.maxHealth * 0.1);
                this.currentHealth = Math.min(this.maxHealth, this.currentHealth + healAmount);
                return {
                    type: 'heal',
                    amount: healAmount,
                    message: t('combat.boss.heals', { name: this.name, amount: healAmount })
                };
            }
            case 'enrage':
            case 'double_attack':
                return {
                    type: 'buff',
                    message: t('combat.boss.doubleAttack', { name: this.name })
                };
            default:
                return null;
        }
    }
}

// Enemy definitions
// ENEMY_DEFINITIONS imported from constants.js

// ============ BOSS DEFINITIONS ============
// BOSS_DEFINITIONS imported from constants.js

// Create an enemy from a definition
export function createEnemy(enemyKey, position = null) {
    const def = ENEMY_DEFINITIONS[enemyKey];
    if (!def) {
        console.error(`Unknown enemy type: ${enemyKey}`);
        return null;
    }

    return new Enemy({
        ...def,
        name: t(`enemies.${enemyKey}`) !== `enemies.${enemyKey}` ? t(`enemies.${enemyKey}`) : def.name,
        type: enemyKey,
        position
    });
}

// Create a list of enemies
export function createEnemies(enemyList) {
    return enemyList.map(({ type, position }) => createEnemy(type, position));
}

// Create a boss from a definition
export function createBoss(bossKey, position = null) {
    const def = BOSS_DEFINITIONS[bossKey];
    if (!def) {
        console.error(`Unknown boss type: ${bossKey}`);
        return null;
    }

    return new BossEnemy({
        ...def,
        name: t(`enemies.${bossKey}`) !== `enemies.${bossKey}` ? t(`enemies.${bossKey}`) : def.name,
        type: bossKey,
        position
    });
}

export default Enemy;
