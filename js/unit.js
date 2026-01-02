// Unit definitions and logic for Mage Knight
import { t } from './i18n/index.js';
import { ACTION_TYPES } from './constants.js';

export const UNIT_TYPES = {
    PEASANTS: 'peasants',
    HERBALISTS: 'herbalists',
    THUGS: 'thugs',
    SWORDSMEN: 'swordsmen',
    GUARDS: 'guards',
    CROSSBOWMEN: 'crossbowmen',
    CATAPULT: 'catapult',
    GOLEMS: 'golems',
    MAGES: 'mages'
};

export const UNIT_INFO = {
    [UNIT_TYPES.PEASANTS]: {
        name: 'Bauern',
        level: 1,
        cost: 3,
        armor: 3,
        icon: '👨‍🌾',
        abilities: [
            { type: ACTION_TYPES.INFLUENCE, value: 2, text: '2 Einfluss' },
            { type: ACTION_TYPES.BLOCK, value: 2, text: '2 Block' }
        ],
        location: ['village']
    },
    [UNIT_TYPES.HERBALISTS]: {
        name: 'Kräuterkundige',
        level: 1,
        cost: 4,
        armor: 2,
        icon: '🌿',
        abilities: [
            { type: ACTION_TYPES.HEAL, value: 1, text: '1 Heilung' },
            { type: ACTION_TYPES.INFLUENCE, value: 3, text: '3 EINFLUSS' }
        ],
        location: ['village', 'monastery']
    },
    [UNIT_TYPES.THUGS]: {
        name: 'Schläger',
        level: 1,
        cost: 4,
        armor: 3,
        icon: '🔨',
        abilities: [
            { type: ACTION_TYPES.ATTACK, value: 2, text: '2 Angriff' },
            { type: ACTION_TYPES.INFLUENCE, value: 1, text: '1 Einfluss' }
        ],
        location: ['village']
    },
    [UNIT_TYPES.SWORDSMEN]: {
        name: 'Schwertkämpfer',
        level: 2,
        cost: 6,
        armor: 4,
        icon: '⚔️',
        abilities: [
            { type: ACTION_TYPES.ATTACK, value: 3, text: '3 Angriff' },
            { type: ACTION_TYPES.BLOCK, value: 3, text: '3 Block' }
        ],
        location: ['keep', 'city']
    },
    [UNIT_TYPES.GUARDS]: {
        name: 'Wachen',
        level: 2,
        cost: 5,
        armor: 5,
        icon: '🛡️',
        abilities: [
            { type: ACTION_TYPES.BLOCK, value: 4, text: '4 Block' },
            { type: ACTION_TYPES.ATTACK, value: 1, text: '1 Angriff' }
        ],
        location: ['keep', 'city']
    },
    [UNIT_TYPES.CROSSBOWMEN]: {
        name: 'Armbrustschützen',
        level: 2,
        cost: 6,
        armor: 3,
        icon: '🏹',
        abilities: [
            { type: ACTION_TYPES.RANGED, value: 3, text: '3 Fernkampf' },
            { type: ACTION_TYPES.ATTACK, value: 2, text: '2 Angriff' }
        ],
        location: ['keep', 'city']
    },
    [UNIT_TYPES.CATAPULT]: {
        name: 'Katapult',
        level: 3,
        cost: 8,
        armor: 2,
        icon: '🎯',
        abilities: [
            { type: ACTION_TYPES.SIEGE, value: 4, text: '4 Belagerung' },
            { type: ACTION_TYPES.ATTACK, value: 1, text: '1 Angriff' }
        ],
        location: ['keep']
    },
    [UNIT_TYPES.GOLEMS]: {
        name: 'Golems',
        level: 3,
        cost: 8,
        armor: 4, // Physical resistance logic to be added later
        icon: '🗿',
        abilities: [
            { type: ACTION_TYPES.ATTACK, value: 4, text: '4 Angriff' },
            { type: ACTION_TYPES.BLOCK, value: 4, text: '4 Block' }
        ],
        location: ['mage_tower']
    },
    [UNIT_TYPES.MAGES]: {
        name: 'Magier',
        level: 3,
        cost: 9,
        armor: 3,
        icon: '🧙‍♂️',
        abilities: [
            { type: ACTION_TYPES.ATTACK, value: 4, element: 'fire', text: '4 Feuer-Angriff' },
            { type: ACTION_TYPES.BLOCK, value: 4, element: 'ice', text: '4 Eis-Block' }
        ],
        location: ['mage_tower']
    }
};

export class Unit {
    constructor(type) {
        this.type = type;
        this.info = UNIT_INFO[type];
        this.ready = true;
        this.wounds = 0;
    }

    getName() {
        return this.info.name;
    }

    getIcon() {
        return this.info.icon;
    }

    getCost() {
        return this.info.cost;
    }

    getArmor() {
        return this.info.armor;
    }

    getAbilities() {
        return this.info.abilities;
    }

    isReady() {
        return this.ready && this.wounds === 0;
    }

    isWounded() {
        return this.wounds > 0;
    }

    takeWound() {
        this.wounds++;
        // Units typically die or become useless with 1 wound in standard rules,
        // but can take more if they have high armor or specific rules.
        // Simplified: 1 wound = disabled until healed.
    }

    heal() {
        this.wounds = 0;
    }

    activate() {
        if (this.isReady()) {
            this.ready = false;
            return true;
        }
        return false;
    }

    refresh() {
        this.ready = true;
    }
}

export function createUnit(type) {
    if (!UNIT_INFO[type]) {
        console.error(`Unknown unit type: ${type}`);
        return null;
    }
    return new Unit(type);
}

export function getUnitsForLocation(locationType) {
    return Object.keys(UNIT_INFO)
        .filter(type => UNIT_INFO[type].location.includes(locationType))
        .map(type => ({ ...UNIT_INFO[type], type })); // Include type key
}
