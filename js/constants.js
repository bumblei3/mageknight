/**
 * Game constants and configuration for Mage Knight
 */

export const MANA_COLORS = {
    RED: 'red',
    BLUE: 'blue',
    GREEN: 'green',
    WHITE: 'white',
    GOLD: 'gold',
    BLACK: 'black'
};

export const TERRAIN_TYPES = {
    PLAINS: 'plains',
    FOREST: 'forest',
    HILLS: 'hills',
    MOUNTAINS: 'mountains',
    DESERT: 'desert',
    WASTELAND: 'wasteland',
    WATER: 'water'
};

export const TERRAIN_COSTS = {
    [TERRAIN_TYPES.PLAINS]: { day: 2, night: 2 },
    [TERRAIN_TYPES.FOREST]: { day: 3, night: 5 },
    [TERRAIN_TYPES.HILLS]: { day: 3, night: 3 },
    [TERRAIN_TYPES.MOUNTAINS]: { day: 5, night: 5 },
    [TERRAIN_TYPES.DESERT]: { day: 5, night: 3 },
    [TERRAIN_TYPES.WASTELAND]: { day: 3, night: 3 },
    [TERRAIN_TYPES.WATER]: { day: 999, night: 999 }
};

export const GAME_STATES = {
    PLAYING: 'playing',
    VICTORY: 'victory',
    DEFEAT: 'defeat'
};

export const COMBAT_PHASES = {
    NOT_IN_COMBAT: 'not_in_combat',
    RANGED: 'ranged',
    BLOCK: 'block',
    DAMAGE: 'damage',
    ATTACK: 'attack',
    COMPLETE: 'complete'
};

export const GAME_EVENTS = {
    LOG_ADDED: 'log_added',
    TOAST_SHOW: 'toast_show',
    STAMP_STATS_UPDATED: 'hero_stats_updated',
    MANA_SOURCE_UPDATED: 'mana_source_updated',
    COMBAT_STARTED: 'combat_started',
    COMBAT_ENDED: 'combat_ended',
    PHASE_CHANGED: 'phase_changed',
    TURN_ENDED: 'turn_ended',
    HERO_MOVED: 'hero_moved',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked'
};

export const TIME_OF_DAY = {
    DAY: 'day',
    NIGHT: 'night'
};

export const UI_COLORS = {
    SUCCESS: '#10b981',
    ERROR: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
    COMBAT: '#8b5cf6',
    MANA: {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#10b981',
        white: '#f9fafb',
        gold: '#fbbf24',
        black: '#374151'
    }
};
