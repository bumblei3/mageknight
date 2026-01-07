// Unit definitions and logic for Mage Knight
import { ACTION_TYPES } from './constants';

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
} as const;

export type UnitType = typeof UNIT_TYPES[keyof typeof UNIT_TYPES];

export interface UnitAbility {
    type: string;
    value: number;
    text: string;
    element?: string;
}

export interface UnitInfo {
    name: string;
    level: number;
    cost: number;
    armor: number;
    icon: string;
    abilities: UnitAbility[];
    location: string[];
}

export const UNIT_INFO: Record<string, UnitInfo> = {
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
        armor: 4,
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
    public type: string;
    public info: UnitInfo;
    public ready: boolean = true;
    public wounds: number = 0;
    public destroyed: boolean = false;

    constructor(type: string | any) {
        // Support both type string and object-based initialization
        if (typeof type === 'object') {
            this.type = type.type || type.id;
            this.info = {
                name: type.name || 'Unknown',
                level: type.level || 1,
                icon: type.icon || '🎖️',
                armor: type.armor || 3,
                cost: type.cost || 5,
                abilities: type.abilities || [],
                location: type.location || []
            };
        } else {
            this.type = type;
            this.info = UNIT_INFO[type] || {
                name: 'Unknown',
                level: 1,
                icon: '🎖️',
                armor: 3,
                cost: 5,
                abilities: [],
                location: []
            };
        }
    }

    public getName(): string {
        return this.info.name;
    }

    public getIcon(): string {
        return this.info.icon;
    }

    public getCost(): number {
        return this.info.cost;
    }

    public getArmor(): number {
        return this.info.armor;
    }

    public getAbilities(): UnitAbility[] {
        return this.info.abilities;
    }

    public isReady(): boolean {
        return this.ready && this.wounds === 0 && !this.destroyed;
    }

    public isWounded(): boolean {
        return this.wounds > 0;
    }

    public takeWound(): void {
        this.wounds++;
    }

    public heal(): void {
        this.wounds = 0;
    }

    public activate(): boolean {
        if (this.isReady()) {
            this.ready = false;
            return true;
        }
        return false;
    }

    public refresh(): void {
        this.ready = true;
    }

    // State persistence
    public getState(): any {
        return {
            type: this.type,
            name: this.info.name,
            level: this.info.level,
            wounds: this.wounds,
            ready: this.ready,
            destroyed: this.destroyed
        };
    }

    public static fromState(state: any): Unit {
        // Re-create unit from type
        const unit = new Unit(state.type);
        // Restore mutable state
        unit.wounds = state.wounds || 0;
        unit.ready = state.ready !== undefined ? state.ready : true;
        unit.destroyed = state.destroyed || false;
        return unit;
    }
}

export function createUnit(type: string): Unit | null {
    if (!UNIT_INFO[type]) {
        console.error(`Unknown unit type: ${type}`);
        return null;
    }
    return new Unit(type);
}

export function getUnitsForLocation(locationType: string): (UnitInfo & { type: string })[] {
    return Object.keys(UNIT_INFO)
        .filter(type => UNIT_INFO[type].location.includes(locationType))
        .map(type => ({ ...UNIT_INFO[type], type }));
}
