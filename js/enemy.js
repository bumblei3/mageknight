// Enemy system for Mage Knight

export const ENEMY_TYPES = {
    ORC: 'orc',
    DRACONUM: 'draconum',
    MAGE_TOWER: 'magetower',
    ROBBER: 'robber'
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
    // New enemy types
    mage: {
        name: 'Magier',
        armor: 3,
        attack: 4,
        fame: 4,
        swift: true, // Can teleport after attack
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
        brutal: true, // Fire breath - double damage
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
        physicalResist: true, // Intangible - physical attacks less effective
        attackType: 'physical',
        icon: '👻',
        color: '#a78bfa'
    },
    golem: {
        name: 'Golem',
        armor: 8,
        attack: 2,
        fame: 5,
        fortified: true, // Very slow but tough
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
        brutal: true, // Life steal - deals more damage
        poison: true, // Drains life
        attackType: 'physical',
        icon: '🦇',
        color: '#7c2d12'
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

export default Enemy;
