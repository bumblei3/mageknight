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
