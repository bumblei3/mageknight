/**
 * Site Definitions and Metadata
 */

export const SITE_TYPES = {
    VILLAGE: 'village',
    KEEP: 'keep',
    MAGE_TOWER: 'mage_tower',
    MONASTERY: 'monastery',
    CITY_BLUE: 'city_blue',
    CITY_RED: 'city_red',
    CITY_GREEN: 'city_green',
    CITY_WHITE: 'city_white',
    RUINS: 'ruins',
    DUNGEON: 'dungeon',
    TOMB: 'tomb',
    SPAWNING_GROUNDS: 'spawning_grounds',
    LABYRINTH: 'labyrinth',
    MINE: 'mine',
    MAGIC_GLADE: 'magic_glade',
    DEN: 'den',
    CITY: 'city'
};

export const SITE_INFO: Record<string, { name: string, icon: string, color: string }> = {
    [SITE_TYPES.VILLAGE]: { name: 'Dorf', icon: '🏠', color: '#fbbf24' },
    [SITE_TYPES.KEEP]: { name: 'Burg', icon: '🏰', color: '#9ca3af' },
    [SITE_TYPES.MAGE_TOWER]: { name: 'Magierturm', icon: 'tower', color: '#8b5cf6' },
    [SITE_TYPES.MONASTERY]: { name: 'Kloster', icon: '⛪', color: '#f87171' },
    [SITE_TYPES.CITY_BLUE]: { name: 'Blaue Stadt', icon: 'city', color: '#3b82f6' },
    [SITE_TYPES.CITY_RED]: { name: 'Rote Stadt', icon: 'city', color: '#ef4444' },
    [SITE_TYPES.CITY_GREEN]: { name: 'Grüne Stadt', icon: 'city', color: '#10b981' },
    [SITE_TYPES.CITY_WHITE]: { name: 'Weiße Stadt', icon: 'city', color: '#f9fafb' },
    [SITE_TYPES.RUINS]: { name: 'Ruinen', icon: 'ruins', color: '#d1d5db' },
    [SITE_TYPES.DUNGEON]: { name: 'Dungeon', icon: 'dungeon', color: '#374151' },
    [SITE_TYPES.TOMB]: { name: 'Grabmal', icon: 'tomb', color: '#4b5563' },
    [SITE_TYPES.SPAWNING_GROUNDS]: { name: 'Brutstätte', icon: 'skull', color: '#7f1d1d' },
    [SITE_TYPES.LABYRINTH]: { name: 'Labyrinth', icon: 'maze', color: '#059669' },
    [SITE_TYPES.MINE]: { name: 'Mine', icon: 'mining', color: '#d97706' },
    [SITE_TYPES.MAGIC_GLADE]: { name: 'Magische Lichtung', icon: '✨', color: '#ec4899' },
    [SITE_TYPES.DEN]: { name: 'Monsterbau', icon: 'paw', color: '#b91c1c' }
};

export class Site {
    type: string;
    name: string;
    icon: string;
    color: string;
    conquered: boolean = false;

    constructor(type: string) {
        this.type = type;
        const info = SITE_INFO[type] || { name: type, icon: '?', color: '#888' };
        this.name = info.name;
        this.icon = info.icon;
        this.color = info.color;
    }

    getName(): string {
        return this.name;
    }

    getIcon(): string {
        return this.icon;
    }

    isConquered(): boolean {
        return this.conquered;
    }

    conquer(): void {
        this.conquered = true;
    }
}
