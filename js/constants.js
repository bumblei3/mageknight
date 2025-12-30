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
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    NOTIFICATION_SHOW: 'notification_show',
    HAND_UPDATED: 'hand_updated',
    UNIT_UPDATED: 'unit_updated'
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

export const ENEMY_TYPES = {
    ORC: 'orc',
    DRACONUM: 'draconum',
    MAGE_TOWER: 'magetower',
    ROBBER: 'robber',
    NECROMANCER: 'necromancer',
    ELEMENTAL: 'elemental',
    BOSS: 'boss'
};

export const BOSS_PHASES = {
    PHASE_1: 1,
    PHASE_2: 2,
    PHASE_3: 3,
    ENRAGED: 'enraged'
};

export const TERRAIN_VISUALS = {
    [TERRAIN_TYPES.PLAINS]: { name: 'Ebenen', icon: '🌾', color: '#4ade80', description: 'Offenes Grasland' },
    [TERRAIN_TYPES.FOREST]: { name: 'Wald', icon: '🌲', color: '#22c55e', description: 'Dichter Wald' },
    [TERRAIN_TYPES.HILLS]: { name: 'Hügel', icon: '⛰️', color: '#a16207', description: 'Hügeliges Gelände' },
    [TERRAIN_TYPES.MOUNTAINS]: { name: 'Berge', icon: '🏔️', color: '#78716c', description: 'Hohe Berge' },
    [TERRAIN_TYPES.DESERT]: { name: 'Wüste', icon: '🏜️', color: '#fbbf24', description: 'Trockene Wüste' },
    [TERRAIN_TYPES.WASTELAND]: { name: 'Ödland', icon: '☠️', color: '#6b7280', description: 'Verfluchtes Ödland' },
    [TERRAIN_TYPES.WATER]: { name: 'Wasser', icon: '💧', color: '#3b82f6', description: 'Wasser (unpassierbar)' }
};

export const ENEMY_DEFINITIONS = {
    [ENEMY_TYPES.ORC]: { name: 'Ork', armor: 3, attack: 2, fame: 2, icon: '👹', color: '#16a34a' },
    weakling: { name: 'Schwächling', armor: 2, attack: 1, fame: 1, icon: '🗡️', color: '#a3a3a3' },
    guard: { name: 'Wächter', armor: 4, attack: 3, fame: 3, fortified: true, icon: '🛡️', color: '#dc2626' },
    [ENEMY_TYPES.DRACONUM]: { name: 'Drakonium', armor: 5, attack: 4, fame: 4, swift: true, fireResist: true, attackType: 'fire', icon: '🐲', color: '#dc2626' },
    [ENEMY_TYPES.ROBBER]: { name: 'Räuber', armor: 3, attack: 2, fame: 2, swift: true, icon: '🏹', color: '#78716c' },
    mage: { name: 'Magier', armor: 3, attack: 4, fame: 4, swift: true, physicalResist: true, attackType: 'ice', icon: '🧙', color: '#8b5cf6' },
    dragon: { name: 'Drache', armor: 6, attack: 5, fame: 6, brutal: true, fireResist: true, attackType: 'fire', icon: '🐉', color: '#dc2626' },
    phantom: { name: 'Phantom', armor: 2, attack: 3, fame: 4, swift: true, physicalResist: true, attackType: 'physical', icon: '👻', color: '#a78bfa' },
    golem: { name: 'Golem', armor: 8, attack: 2, fame: 5, fortified: true, iceResist: true, physicalResist: true, attackType: 'physical', icon: '🗿', color: '#78716c' },
    vampire: { name: 'Vampir', armor: 4, attack: 4, fame: 5, brutal: true, poison: true, attackType: 'physical', icon: '🦇', color: '#7c2d12' },
    [ENEMY_TYPES.NECROMANCER]: { name: 'Nekromant', armor: 4, attack: 3, fame: 5, poison: true, icon: '💀', color: '#7c3aed' },
    [ENEMY_TYPES.ELEMENTAL]: { name: 'Feuer-Elementar', armor: 6, attack: 5, fame: 6, fireResist: true, attackType: 'fire', icon: '🔥', color: '#f97316' },
    [ENEMY_TYPES.BOSS]: { name: 'Dunkler Lord', armor: 10, attack: 8, fame: 20, fortified: true, brutal: true, fireResist: true, iceResist: true, physicalResist: true, icon: '👿', color: '#000000' }
};

export const BOSS_DEFINITIONS = {
    dark_lord: {
        name: 'Dunkler Lord', armor: 10, attack: 6, fame: 50, maxHealth: 30,
        fortified: true, brutal: true, fireResist: true, iceResist: true, physicalResist: true,
        icon: '👿', color: '#000000',
        summonType: 'phantom', summonCount: 2,
        phaseAbilities: { 1: null, 2: 'summon', 3: 'heal', enraged: 'double_attack' }
    },
    dragon_lord: {
        name: 'Drachen-König', armor: 12, attack: 8, fame: 60, maxHealth: 40,
        brutal: true, fireResist: true, attackType: 'fire',
        icon: '🐲', color: '#dc2626',
        summonType: 'draconum', summonCount: 1,
        phaseAbilities: { 1: null, 2: 'summon', 3: null, enraged: 'double_attack' }
    },
    lich_king: {
        name: 'Lich-König', armor: 8, attack: 5, fame: 55, maxHealth: 35,
        poison: true, iceResist: true, physicalResist: true,
        icon: '💀', color: '#7c3aed',
        summonType: 'phantom', summonCount: 3,
        phaseAbilities: { 1: 'summon', 2: 'heal', 3: 'summon', enraged: 'double_attack' }
    }
};
