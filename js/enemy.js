// Enemy system for Mage Knight

export const ENEMY_TYPES = {
    ORC: 'orc',
    DRACONUM: 'draconum',
    MAGE_TOWER: 'magetower',
    ROBBER: 'robber',
    NECROMANCER: 'necromancer',
    ELEMENTAL: 'elemental',
    BOSS: 'boss'
};

export class Enemy {
    constructor(data) {
        this.id = data.id || `enemy_${Date.now()}`;
        this.type = data.type;
        this.name = data.name;
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
        return attackValue >= this.armor;
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

export const BOSS_PHASES = {
    PHASE_1: 1,
    PHASE_2: 2,
    PHASE_3: 3,
    ENRAGED: 'enraged'
};

export class BossEnemy extends Enemy {
    constructor(data) {
        super(data);

        this.isBoss = true;

        // Multi-phase health system
        this.maxHealth = data.maxHealth || 30;
        this.currentHealth = data.currentHealth || this.maxHealth;
        this.phases = data.phases || [
            { threshold: 0.66, name: 'Phase 1', triggered: false },
            { threshold: 0.33, name: 'Phase 2', triggered: false },
            { threshold: 0, name: 'Enraged', triggered: false }
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
                phase: 'Enraged',
                ability: 'enrage',
                message: `${this.name} wird wütend! Angriff erhöht!`
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
        if (phaseName === 'Phase 2') return this.phaseAbilities[BOSS_PHASES.PHASE_2];
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
    isDefeated(attackValue = null) {
        return this.currentHealth <= 0;
    }

    // Get current health percentage
    getHealthPercent() {
        return this.currentHealth / this.maxHealth;
    }

    // Get phase name
    getPhaseName() {
        if (this.enraged) return 'Wütend';
        const healthPercent = this.getHealthPercent();
        if (healthPercent > 0.66) return 'Phase 1';
        if (healthPercent > 0.33) return 'Phase 2';
        return 'Phase 3';
    }

    // Execute phase ability (returns what should happen)
    executePhaseAbility(abilityName) {
        switch (abilityName) {
            case 'summon':
                return {
                    type: 'summon',
                    enemyType: this.summonType,
                    count: this.summonCount,
                    message: `${this.name} beschwört ${this.summonCount} ${this.summonType}!`
                };
            case 'heal':
                const healAmount = Math.floor(this.maxHealth * 0.1);
                this.currentHealth = Math.min(this.maxHealth, this.currentHealth + healAmount);
                return {
                    type: 'heal',
                    amount: healAmount,
                    message: `${this.name} heilt sich um ${healAmount}!`
                };
            case 'enrage':
            case 'double_attack':
                return {
                    type: 'buff',
                    message: `${this.name} greift nun doppelt an!`
                };
            default:
                return null;
        }
    }
}

// Enemy definitions
export const ENEMY_DEFINITIONS = {
    [ENEMY_TYPES.ORC]: {
        name: 'Ork',
        armor: 3,
        attack: 2,
        fame: 2,
        icon: '👹',
        color: '#16a34a'
    },
    weakling: {
        name: 'Schwächling',
        armor: 2,
        attack: 1,
        fame: 1,
        icon: '🗡️',
        color: '#a3a3a3'
    },
    guard: {
        name: 'Wächter',
        armor: 4,
        attack: 3,
        fame: 3,
        fortified: true,
        icon: '🛡️',
        color: '#dc2626'
    },
    [ENEMY_TYPES.DRACONUM]: {
        name: 'Drakonium',
        armor: 5,
        attack: 4,
        fame: 4,
        swift: true,
        fireResist: true,
        attackType: 'fire',
        icon: '🐲',
        color: '#dc2626'
    },
    [ENEMY_TYPES.ROBBER]: {
        name: 'Räuber',
        armor: 3,
        attack: 2,
        fame: 2,
        swift: true,
        icon: '🏹',
        color: '#78716c'
    },
    mage: {
        name: 'Magier',
        armor: 3,
        attack: 4,
        fame: 4,
        swift: true,
        physicalResist: true,
        attackType: 'ice',
        icon: '🧙',
        color: '#8b5cf6'
    },
    dragon: {
        name: 'Drache',
        armor: 6,
        attack: 5,
        fame: 6,
        brutal: true,
        fireResist: true,
        attackType: 'fire',
        icon: '🐉',
        color: '#dc2626'
    },
    phantom: {
        name: 'Phantom',
        armor: 2,
        attack: 3,
        fame: 4,
        swift: true,
        physicalResist: true,
        attackType: 'physical',
        icon: '👻',
        color: '#a78bfa'
    },
    golem: {
        name: 'Golem',
        armor: 8,
        attack: 2,
        fame: 5,
        fortified: true,
        iceResist: true,
        physicalResist: true,
        attackType: 'physical',
        icon: '🗿',
        color: '#78716c'
    },
    vampire: {
        name: 'Vampir',
        armor: 4,
        attack: 4,
        fame: 5,
        brutal: true,
        poison: true,
        attackType: 'physical',
        icon: '🦇',
        color: '#7c2d12'
    },
    [ENEMY_TYPES.NECROMANCER]: {
        name: 'Nekromant',
        armor: 4,
        attack: 3,
        fame: 5,
        poison: true,
        icon: '💀',
        color: '#7c3aed'
    },
    [ENEMY_TYPES.ELEMENTAL]: {
        name: 'Feuer-Elementar',
        armor: 6,
        attack: 5,
        fame: 6,
        fireResist: true,
        attackType: 'fire',
        icon: '🔥',
        color: '#f97316'
    },
    [ENEMY_TYPES.BOSS]: {
        name: 'Dunkler Lord',
        armor: 10,
        attack: 8,
        fame: 20,
        fortified: true,
        brutal: true,
        fireResist: true,
        iceResist: true,
        physicalResist: true,
        icon: '👿',
        color: '#000000'
    }
};

// ============ BOSS DEFINITIONS ============
export const BOSS_DEFINITIONS = {
    dark_lord: {
        name: 'Dunkler Lord',
        armor: 10,
        attack: 6,
        fame: 50,
        maxHealth: 30,
        fortified: true,
        brutal: true,
        fireResist: true,
        iceResist: true,
        physicalResist: true,
        icon: '👿',
        color: '#000000',
        summonType: 'phantom',
        summonCount: 2,
        phaseAbilities: {
            1: null,
            2: 'summon',
            3: 'heal',
            enraged: 'double_attack'
        }
    },
    dragon_lord: {
        name: 'Drachen-König',
        armor: 12,
        attack: 8,
        fame: 60,
        maxHealth: 40,
        brutal: true,
        fireResist: true,
        attackType: 'fire',
        icon: '🐲',
        color: '#dc2626',
        summonType: 'draconum',
        summonCount: 1,
        phaseAbilities: {
            1: null,
            2: 'summon',
            3: null,
            enraged: 'double_attack'
        }
    },
    lich_king: {
        name: 'Lich-König',
        armor: 8,
        attack: 5,
        fame: 55,
        maxHealth: 35,
        poison: true,
        iceResist: true,
        physicalResist: true,
        icon: '💀',
        color: '#7c3aed',
        summonType: 'phantom',
        summonCount: 3,
        phaseAbilities: {
            1: 'summon',
            2: 'heal',
            3: 'summon',
            enraged: 'double_attack'
        }
    }
};

// Create an enemy from a definition
export function createEnemy(enemyKey, position = null) {
    const def = ENEMY_DEFINITIONS[enemyKey];
    if (!def) {
        console.error(`Unknown enemy type: ${enemyKey}`);
        return null;
    }

    return new Enemy({
        ...def,
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
        type: bossKey,
        position
    });
}

export default Enemy;
