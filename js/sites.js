
export const SITE_TYPES = {
    VILLAGE: 'village',
    KEEP: 'keep',
    MAGE_TOWER: 'mage_tower',
    MONASTERY: 'monastery',
    DUNGEON: 'dungeon',
    CITY: 'city',
    RUIN: 'ruin',
    TOMB: 'tomb',
    LABYRINTH: 'labyrinth',
    SPAWNING_GROUNDS: 'spawning_grounds',
    MINE: 'mine'
};

export const SITE_INFO = {
    [SITE_TYPES.VILLAGE]: {
        name: 'Dorf',
        icon: '🏠',
        color: '#fbbf24', // Amber
        description: 'Ein friedliches Dorf. Du kannst hier Einheiten rekrutieren oder Verletzungen heilen.',
        actions: ['heal', 'recruit']
    },
    [SITE_TYPES.MINE]: {
        name: 'Kristall-Mine',
        icon: '💎',
        color: '#22d3ee', // Cyan
        description: 'Eine Mine voller magischer Kristalle. Besiege die Wächter, um die Produktion zu kontrollieren.',
        actions: ['attack']
    },
    [SITE_TYPES.KEEP]: {
        name: 'Festung',
        icon: '🏰',
        color: '#9ca3af', // Gray
        description: 'Eine befestigte Burg. Besiege die Wachen, um sie zu erobern.',
        actions: ['attack']
    },
    [SITE_TYPES.MAGE_TOWER]: {
        name: 'Magierturm',
        icon: '🔮',
        color: '#8b5cf6', // Violet
        description: 'Ein Turm voller magischer Energie. Lerne hier mächtige Zauber.',
        actions: ['attack', 'learn']
    },
    [SITE_TYPES.MONASTERY]: {
        name: 'Kloster',
        icon: '⛪',
        color: '#fcd34d', // Light Amber
        description: 'Ein heiliger Ort. Heile Wunden oder lerne fortgeschrittene Techniken.',
        actions: ['heal', 'train']
    },
    [SITE_TYPES.DUNGEON]: {
        name: 'Verlies',
        icon: '💀',
        color: '#374151', // Dark Gray
        description: 'Ein gefährliches Verlies. Betreten auf eigene Gefahr!',
        actions: ['explore']
    },
    [SITE_TYPES.CITY]: {
        name: 'Stadt',
        icon: '🏰',
        color: '#60a5fa', // Blue
        description: 'Eine große Stadt. Rekrutiere Elite-Einheiten, lerne Zauber und heile dich.',
        actions: ['heal', 'recruit_elite', 'learn']
    },
    [SITE_TYPES.RUIN]: {
        name: 'Ruine',
        icon: '💀',
        color: '#d97706', // Brownish/Amber
        description: 'Eine uralte Ruine. Wer weiß, welche Schätze und Gefahren hier schlummern?',
        actions: ['explore']
    },
    [SITE_TYPES.TOMB]: {
        name: 'Grabstätte',
        icon: '⚰️',
        color: '#1f2937', // Dark
        description: 'Eine düstere Grabstätte voller Untoten. Artefakte warten auf mutige Plünderer.',
        actions: ['explore']
    },
    [SITE_TYPES.LABYRINTH]: {
        name: 'Labyrinth',
        icon: '🌀',
        color: '#6366f1', // Indigo
        description: 'Ein verworrenes Labyrinth. Mehrere Kämpfe und mächtige Zauber erwarten dich.',
        actions: ['explore']
    },
    [SITE_TYPES.SPAWNING_GROUNDS]: {
        name: 'Brutstätte',
        icon: '🕷️',
        color: '#059669', // Emerald
        description: 'Eine Brutstätte voller Monster. Vernichte die Wellen für großen Ruhm!',
        actions: ['explore']
    }
};

export class Site {
    constructor(type) {
        this.type = type;
        this.conquered = false;
        this.visited = false;
    }

    getInfo() {
        return SITE_INFO[this.type];
    }

    getName() {
        return SITE_INFO[this.type].name;
    }

    getIcon() {
        return SITE_INFO[this.type].icon;
    }

    getColor() {
        return SITE_INFO[this.type].color;
    }
}
