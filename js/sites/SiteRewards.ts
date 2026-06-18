/**
 * Site Rewards System
 * Implements Mage Knight site rewards per official rules
 * Rewards: Artifacts, Spells, Advanced Actions, Units, Crystals, Gold, Fame, Healing
 */
import { Hero } from '../hero';
import { logger } from '../logger';

export type RewardType = 
    | 'artifact' 
    | 'spell' 
    | 'advanced_action' 
    | 'unit' 
    | 'crystal' 
    | 'gold' 
    | 'fame' 
    | 'healing' 
    | 'mana';

export interface Reward {
    type: RewardType;
    name: string;
    description: string;
    value?: number; // For fame, gold, healing amount, crystal count
    count?: number; // For crystals
    color?: 'red' | 'blue' | 'green' | 'white' | 'gold' | 'black'; // For crystals
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // For artifacts/spells/units
    icon: string;
    data?: any; // Additional data (e.g., spell effects, unit stats)
}

export interface SiteRewardTable {
    [siteType: string]: Reward[];
}

export interface RewardRoll {
    reward: Reward;
    rolled: number;
}

// ============================================
// REWARD DEFINITIONS
// ============================================

// Artifacts (minor/major)
const ARTIFACTS: Reward[] = [
    // Common Artifacts
    { type: 'artifact', name: 'Ring of Mana', description: 'Gain 1 mana of any color on recycling', icon: '💍', rarity: 'common', data: { effect: 'mana_on_recycle', value: 1 } },
    { type: 'artifact', name: 'Adventurer\'s Backpack', description: 'Hand size +1', icon: '🎒', rarity: 'common', data: { effect: 'hand_size', value: 1 } },
    { type: 'artifact', name: 'Healing Potion', description: 'Heal 2 wounds when played', icon: '🧪', rarity: 'common', data: { effect: 'heal', value: 2 } },
    { type: 'artifact', name: 'Magic Lantern', description: 'Reveal adjacent hexes', icon: '🏮', rarity: 'common', data: { effect: 'reveal', range: 1 } },
    
    // Uncommon Artifacts
    { type: 'artifact', name: 'Staff of Power', description: '+2 Attack when spent', icon: '🪄', rarity: 'uncommon', data: { effect: 'attack_bonus', value: 2 } },
    { type: 'artifact', name: 'Cloak of Shadows', description: 'Ignore one enemy attack per combat', icon: '🧥', rarity: 'uncommon', data: { effect: 'ignore_attack' } },
    { type: 'artifact', name: 'Boots of Speed', description: '+2 Move', icon: '👢', rarity: 'uncommon', data: { effect: 'move_bonus', value: 2 } },
    { type: 'artifact', name: 'Amulet of Protection', description: 'Armor +1', icon: '📿', rarity: 'uncommon', data: { effect: 'armor', value: 1 } },
    
    // Rare Artifacts
    { type: 'artifact', name: 'Dragon Scale Armor', description: 'Armor +2, Fire Resist', icon: '🐲', rarity: 'rare', data: { effect: 'armor', value: 2, resist: 'fire' } },
    { type: 'artifact', name: 'Sword of Justice', description: '+3 Attack und 1 Wunde beim Ziehen', icon: '⚔️', rarity: 'rare', data: { effect: 'attack_bonus', value: 3, wound_on_draw: true } },
    { type: 'artifact', name: 'Crown of Command', description: 'Command Limit +1', icon: '👑', rarity: 'rare', data: { effect: 'command_limit', value: 1 } },
    
    // Legendary Artifacts
    { type: 'artifact', name: 'Excalibur', description: '+5 Attack, ignore armor', icon: '⚔️', rarity: 'legendary', data: { effect: 'attack_bonus', value: 5, ignore_armor: true } },
    { type: 'artifact', name: 'Orb of Mastery', description: 'Take 3 mana of any colors per turn', icon: '🔮', rarity: 'legendary', data: { effect: 'mana_per_turn', value: 3 } },
];

// Spells (basic/advanced)
const SPELLS: Reward[] = [
    // Basic Spells
    { type: 'spell', name: 'Fireball', description: 'Ranged 5 Fire Attack', icon: '🔥', rarity: 'common', data: { attack: 5, element: 'fire', phase: 'ranged' } },
    { type: 'spell', name: 'Ice Shield', description: 'Block 5 Ice', icon: '🧊', rarity: 'common', data: { block: 5, element: 'ice' } },
    { type: 'spell', name: 'Healing', description: 'Heal 3 Wounds', icon: '✨', rarity: 'common', data: { heal: 3 } },
    { type: 'spell', name: 'Summon', description: 'Gain a Unit', icon: '👻', rarity: 'common', data: { effect: 'summon_unit' } },
    
    // Advanced Spells
    { type: 'spell', name: 'Meteor Storm', description: 'Ranged 7 Fire to all enemies', icon: '☄️', rarity: 'uncommon', data: { attack: 7, element: 'fire', target: 'all', phase: 'ranged' } },
    { type: 'spell', name: 'Time Walk', description: 'Take an extra turn', icon: '⏳', rarity: 'rare', data: { effect: 'extra_turn' } },
    { type: 'spell', name: 'Disintegrate', description: 'Destroy one enemy', icon: '✨', rarity: 'rare', data: { effect: 'destroy_enemy' } },
    { type: 'spell', name: 'Wish', description: 'Any effect: Heal 5, or +5 Attack, or Gain Artifact', icon: '🪄', rarity: 'legendary', data: { effect: 'wish' } },
];

// Advanced Actions
const ADVANCED_ACTIONS: Reward[] = [
    { type: 'advanced_action', name: 'March', description: 'Move 5 / Move 2', icon: '👟', rarity: 'common' },
    { type: 'advanced_action', name: 'Concentration', description: 'Draw 3 cards / Draw 1 card, keep all', icon: '🧠', rarity: 'common' },
    { type: 'advanced_action', name: 'Promise', description: 'Influence 5 / Influence 2, draw 1', icon: '🤝', rarity: 'common' },
    { type: 'advanced_action', name: 'Determination', description: 'Block 5 / Block 2, Attack 2', icon: '🛡️', rarity: 'common' },
    { type: 'advanced_action', name: 'Tranquility', description: 'Heal 3 / Heal 1, draw 1', icon: '🕊️', rarity: 'uncommon' },
    { type: 'advanced_action', name: 'Improvisation', description: 'Copy another card', icon: '🎭', rarity: 'uncommon' },
    { type: 'advanced_action', name: 'Switchness', description: 'Move 4 / Attack 3 / Block 3 / Influence 3', icon: '🔄', rarity: 'uncommon' },
    { type: 'advanced_action', name: 'Rage', description: 'Attack 5 / Attack 2, Move 2', icon: '💢', rarity: 'uncommon' },
    { type: 'advanced_action', name: 'Mana Draw', description: 'Gain 2 mana / Gain 1 mana of any color', icon: '💎', rarity: 'common' },
    { type: 'advanced_action', name: 'Stamina', description: 'Move 4 / Move 2, Block 2', icon: '💪', rarity: 'common' },
    { type: 'advanced_action', name: 'Will Focus', description: 'Hand limit +2 this turn', icon: '🎯', rarity: 'rare' },
    { type: 'advanced_action', name: 'Speed Attack', description: 'Ranged 3 / Attack 3', icon: '⚡', rarity: 'uncommon' },
];

// Units (recruitable)
const UNITS: Reward[] = [
    // Common
    { type: 'unit', name: 'Crossbowman', description: 'Ranged 3 / Block 2', icon: '🏹', rarity: 'common', data: { armor: 1, attack: 3, block: 2 } },
    { type: 'unit', name: 'Spearman', description: 'Attack 3 / Block 3', icon: '🪖', rarity: 'common', data: { armor: 2, attack: 3, block: 3 } },
    { type: 'unit', name: 'Healer', description: 'Heal 2 / Influence 2', icon: '⚕️', rarity: 'uncommon', data: { armor: 1, heal: 2, influence: 2 } },
    
    // Uncommon
    { type: 'unit', name: 'Druid', description: 'Attack 2 (Fire/Ice) / Heal 2', icon: '🌿', rarity: 'uncommon', data: { armor: 2, attack: 2, element: 'ice', heal: 2 } },
    { type: 'unit', name: 'Royal Guard', description: 'Block 5 / Attack 3', icon: '🛡️', rarity: 'uncommon', data: { armor: 4, block: 5, attack: 3 } },
    { type: 'unit', name: 'Elementalist', description: 'Range 4 (Fire) / Attack 4 (Ice)', icon: '🔮', rarity: 'uncommon', data: { armor: 2, ranged: 4, element: 'fire', attack: 4, attackElement: 'ice' } },
    
    // Rare
    { type: 'unit', name: 'Ancient Dragon', description: 'Attack 6 (Fire) / Ranged 4 (Fire) / Armor 4', icon: '🐲', rarity: 'rare', data: { armor: 4, attack: 6, element: 'fire', ranged: 4 } },
    { type: 'unit', name: 'Golden Dragon', description: 'Attack 7 / Block 5 / Armor 6', icon: '🐲', rarity: 'legendary', data: { armor: 6, attack: 7, block: 5 } },
];

// ============================================
// SITE REWARD TABLES (per official Mage Knight rules)
// ============================================

export const SITE_REWARD_TABLES: Record<string, SiteRewardTable> = {
    // Dungeon: High risk, high reward - Artifacts, Spells, Crystals, Gold, Fame
    'dungeon': {
        common: [
            { type: 'crystal', name: 'Red Crystal', description: 'Red mana crystal', icon: '💎', color: 'red', count: 1 },
            { type: 'crystal', name: 'Blue Crystal', description: 'Blue mana crystal', icon: '💎', color: 'blue', count: 1 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 3, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
            { type: 'spell', name: 'Random Spell', description: 'A random spell', icon: '📜' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Random Artifact', description: 'A random artifact', icon: '💍' },
            { type: 'spell', name: 'Advanced Spell', description: 'An advanced spell', icon: '📜✨' },
            { type: 'crystal', name: 'Green Crystal', description: 'Green mana crystal', icon: '💎', color: 'green', count: 2 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 5, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'unit', name: 'Strong Unit', description: 'A strong unit', icon: '👹' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 2 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 8, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 6, icon: '⭐' },
        ],
    },
    
    // Ruin: Moderate reward - Artifacts, Spells, Crystals, Gold, Fame
    'ruin': {
        common: [
            { type: 'crystal', name: 'Red Crystal', description: 'Red mana crystal', icon: '💎', color: 'red', count: 1 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 2, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 1, icon: '⭐' },
            { type: 'artifact', name: 'Minor Artifact', description: 'A minor artifact', icon: '💍' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Artifact', description: 'An artifact', icon: '💍' },
            { type: 'spell', name: 'Spell', description: 'A spell', icon: '📜' },
            { type: 'crystal', name: 'Blue Crystal', description: 'Blue mana crystal', icon: '💎', color: 'blue', count: 2 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 4, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 3, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'spell', name: 'Advanced Spell', description: 'An advanced spell', icon: '📜✨' },
            { type: 'unit', name: 'Unit', description: 'A unit', icon: '👹' },
            { type: 'crystal', name: 'Green Crystal', description: 'Green mana crystal', icon: '💎', color: 'green', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 5, icon: '⭐' },
        ],
    },
    
    // Tomb: Undead themed - Artifacts, Spells, Undead Units, Crystals, Fame
    'tomb': {
        common: [
            { type: 'crystal', name: 'Black Crystal', description: 'Black mana crystal', icon: '💎', color: 'black', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
            { type: 'spell', name: 'Basic Spell', description: 'A basic spell', icon: '📜' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Artifact', description: 'An artifact', icon: '💍' },
            { type: 'spell', name: 'Spell', description: 'A spell', icon: '📜' },
            { type: 'unit', name: 'Undead Unit', description: 'An undead unit', icon: '💀' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 2 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'spell', name: 'Advanced Spell', description: 'An advanced spell', icon: '📜✨' },
            { type: 'unit', name: 'Strong Undead Unit', description: 'A strong undead unit', icon: '🧛' },
            { type: 'crystal', name: 'Gold Crystal', description: 'Gold mana crystal', icon: '💎', color: 'gold', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 7, icon: '⭐' },
        ],
    },
    
    // Labyrinth: Multiple encounters - best rewards: Artifacts, Spells, Adv Actions, Units, Crystals, Gold, Fame
    'labyrinth': {
        common: [
            { type: 'crystal', name: 'Any Crystal', description: 'A mana crystal', icon: '💎', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 3, icon: '⭐' },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 4, icon: '💰' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Artifact', description: 'An artifact', icon: '💍' },
            { type: 'spell', name: 'Spell', description: 'A spell', icon: '📜' },
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'unit', name: 'Unit', description: 'A unit', icon: '👹' },
            { type: 'crystal', name: 'Crystals', description: 'Mana crystals', icon: '💎', count: 2 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 5, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'spell', name: 'Advanced Spell', description: 'An advanced spell', icon: '📜✨' },
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'unit', name: 'Strong Unit', description: 'A strong unit', icon: '🐲' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 3 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 10, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 8, icon: '⭐' },
        ],
    },
    
    // Spawning Grounds: Monsters cleared - Artifacts, Units, Crystals, Fame
    'spawning_grounds': {
        common: [
            { type: 'crystal', name: 'Green Crystal', description: 'Green mana crystal', icon: '💎', color: 'green', count: 2 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Artifact', description: 'An artifact', icon: '💍' },
            { type: 'unit', name: 'Unit', description: 'A unit', icon: '👹' },
            { type: 'crystal', name: 'Crystals', description: 'Mana crystals', icon: '💎', count: 3 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'unit', name: 'Strong Unit', description: 'A strong unit', icon: '🐲' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 2 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 7, icon: '⭐' },
        ],
    },
    
    // Mage Tower: Spells, Advanced Actions, Crystals, Fame
    'magetower': {
        common: [
            { type: 'spell', name: 'Spell', description: 'A spell', icon: '📜' },
            { type: 'crystal', name: 'Blue Crystal', description: 'Blue mana crystal', icon: '💎', color: 'blue', count: 2 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
        ],
        uncommon: [
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'spell', name: 'Advanced Spell', description: 'An advanced spell', icon: '📜✨' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'spell', name: 'Legendary Spell', description: 'A legendary spell', icon: '📜✨✨' },
            { type: 'crystal', name: 'Gold Crystal', description: 'Gold mana crystal', icon: '💎', color: 'gold', count: 1 },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 6, icon: '⭐' },
        ],
    },
    
    // Monastery: Healing, Advanced Actions, Units, Fame
    'monastery': {
        common: [
            { type: 'healing', name: 'Heal 2', description: 'Heal 2 wounds', value: 2, icon: '✨' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 1, icon: '⭐' },
        ],
        uncommon: [
            { type: 'healing', name: 'Heal All', description: 'Heal all wounds', value: 99, icon: '✨✨' },
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'unit', name: 'Unit', description: 'A unit', icon: '👹' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 3, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'advanced_action', name: 'Advanced Action', description: 'An advanced action', icon: '📜✨' },
            { type: 'unit', name: 'Strong Unit', description: 'A strong unit', icon: '🛡️' },
            { type: 'healing', name: 'Full Heal + Remove Wounds', description: 'Full heal and remove wounds', value: 99, icon: '✨✨✨' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 5, icon: '⭐' },
        ],
    },
    
    // Keep: Artifact, Unit, Crystals, Gold, Fame
    'keep': {
        common: [
            { type: 'crystal', name: 'Gold Crystal', description: 'Gold mana crystal', icon: '💎', color: 'gold', count: 1 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 3, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
        ],
        uncommon: [
            { type: 'artifact', name: 'Artifact', description: 'An artifact', icon: '💍' },
            { type: 'unit', name: 'Unit', description: 'A unit', icon: '👹' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 1 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 5, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
        rare: [
            { type: 'artifact', name: 'Rare Artifact', description: 'A rare artifact', icon: '💍✨' },
            { type: 'unit', name: 'Strong Unit', description: 'A strong unit', icon: '🛡️' },
            { type: 'crystal', name: 'Crystals', description: 'Mana crystals', icon: '💎', count: 3 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 8, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 6, icon: '⭐' },
        ],
    },
    
    // Village: Healing, Recruit Unit, Crystals, Gold, Fame
    'village': {
        common: [
            { type: 'healing', name: 'Heal 1', description: 'Heal 1 wound', value: 1, icon: '✨' },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 2, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 1, icon: '⭐' },
        ],
        uncommon: [
            { type: 'healing', name: 'Heal 3', description: 'Heal 3 wounds', value: 3, icon: '✨' },
            { type: 'unit', name: 'Recruit Unit', description: 'Recruit a unit', icon: '👹' },
            { type: 'crystal', name: 'Crystal', description: 'A mana crystal', icon: '💎', count: 1 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 4, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 2, icon: '⭐' },
        ],
        rare: [
            { type: 'unit', name: 'Elite Unit', description: 'An elite unit', icon: '🛡️' },
            { type: 'crystal', name: 'White Crystal', description: 'White mana crystal', icon: '💎', color: 'white', count: 2 },
            { type: 'gold', name: 'Gold', description: 'Gold pieces', value: 6, icon: '💰' },
            { type: 'fame', name: 'Fame', description: 'Fame points', value: 4, icon: '⭐' },
        ],
    },
};

// ============================================
// REWARD MANAGER
// ============================================

export class SiteRewardManager {
    static instance: SiteRewardManager | null = null;
    
    static getInstance(): SiteRewardManager {
        if (!SiteRewardManager.instance) {
            SiteRewardManager.instance = new SiteRewardManager();
        }
        return SiteRewardManager.instance;
    }
    
    /**
     * Roll for rewards after conquering/exploring a site
     * @param siteType - The type of site (dungeon, ruin, tomb, etc.)
     * @param difficulty - 'common' | 'uncommon' | 'rare' (default: 'common')
     * @param count - Number of rewards to roll (default: 1)
     */
    rollRewards(siteType: string, difficulty: 'common' | 'uncommon' | 'rare' = 'common', count: number = 1): RewardRoll[] {
        const table = SITE_REWARD_TABLES[siteType];
        if (!table) {
            logger.warn(`No reward table for site type: ${siteType}`);
            return [];
        }
        
        const rewards = table[difficulty] || table.common || [];
        if (rewards.length === 0) {
            return [];
        }
        
        const results: RewardRoll[] = [];
        
        for (let i = 0; i < count; i++) {
            // Weighted roll: higher rarity = lower chance
            const roll = Math.random() * 100;
            let selectedReward: Reward | null = null;
            let cumulativeWeight = 0;
            
            // Weight distribution: common=50%, uncommon=30%, rare=20%
            for (const reward of rewards) {
                const rarity = reward.rarity || 'common';
                const weight = rarity === 'legendary' ? 1 : rarity === 'rare' ? 5 : rarity === 'uncommon' ? 15 : 30;
                cumulativeWeight += weight;
                
                // Use a simple approach: pick random reward from the table
                if (Math.random() < 1 / rewards.length * (i + 1)) {
                    selectedReward = reward;
                }
            }
            
            // Fallback: pick random reward
            if (!selectedReward) {
                selectedReward = rewards[Math.floor(Math.random() * rewards.length)];
            }
            
            // Create concrete reward from template
            const concreteReward = this.createConcreteReward(selectedReward);
            
            results.push({
                reward: concreteReward,
                rolled: Math.floor(Math.random() * 100) + 1
            });
        }
        
        return results;
    }
    
    private createConcreteReward(template: Reward): Reward {
        // Create a concrete reward with specific values
        const reward = { ...template };
        
        // Fill in specifics for template rewards
        if (template.name === 'Random Spell') {
            reward.name = this.getRandomSpell();
            reward.data = { spellName: reward.name };
        }
        if (template.name === 'Advanced Spell' || template.name === 'Spell') {
            reward.name = this.getRandomSpell(true);
            reward.data = { spellName: reward.name };
        }
        if (template.name === 'Random Artifact' || template.name === 'Minor Artifact') {
            reward.name = this.getRandomArtifact('common');
            reward.rarity = 'common';
        }
        if (template.name === 'Artifact') {
            reward.name = this.getRandomArtifact('uncommon');
            reward.rarity = 'uncommon';
        }
        if (template.name === 'Rare Artifact') {
            reward.name = this.getRandomArtifact('rare');
            reward.rarity = 'rare';
        }
        if (template.name === 'Spell' || template.name === 'Basic Spell') {
            reward.name = this.getRandomSpell(false);
            reward.data = { spellName: reward.name };
        }
        if (template.name === 'Advanced Spell') {
            reward.name = this.getRandomSpell(true);
            reward.data = { spellName: reward.name };
        }
        if (template.name === 'Legendary Spell') {
            reward.name = 'Wish';
            reward.rarity = 'legendary';
            reward.data = { spellName: 'Wish' };
        }
        if (template.name === 'Advanced Action') {
            reward.name = this.getRandomAdvancedAction();
            reward.data = { actionName: reward.name };
        }
        if (template.name === 'Random Unit' || template.name === 'Unit' || template.name === 'Strong Unit') {
            reward.name = this.getRandomUnit(template.name === 'Strong Unit' ? 'rare' : 'common');
            reward.rarity = template.name === 'Strong Unit' ? 'rare' : 'common';
        }
        if (template.name === 'Undead Unit') {
            reward.name = this.getRandomUnit('uncommon', true);
        }
        if (template.name === 'Undead Unit' || template.name === 'Strong Undead Unit' || template.name === 'Elite Unit') {
            reward.name = this.getRandomUnit('rare', true);
        }
        if (template.name === 'Recruit Unit') {
            reward.name = this.getRandomUnit('common');
        }
        if (template.name === 'Any Crystal' || template.name === 'Crystals' || template.name === 'Crystal') {
            const colors: ('red'|'blue'|'green'|'white'|'gold'|'black')[] = ['red','blue','green','white','gold','black'];
            reward.color = colors[Math.floor(Math.random() * colors.length)];
            reward.count = (reward.count || 1) + (Math.random() > 0.7 ? 1 : 0);
        }
        
        return reward;
    }
    
    private getRandomArtifact(rarity: 'common'|'uncommon'|'rare'|'legendary' = 'common'): string {
        const artifacts = ARTIFACTS.filter(a => a.rarity === rarity);
        if (artifacts.length === 0) return 'Mystery Artifact';
        return artifacts[Math.floor(Math.random() * artifacts.length)].name;
    }
    
    private getRandomSpell(advanced: boolean = false): string {
        const spells = SPELLS.filter(s => advanced ? s.rarity !== 'common' : s.rarity === 'common');
        if (spells.length === 0) return advanced ? 'Meteor Storm' : 'Fireball';
        return spells[Math.floor(Math.random() * spells.length)].name;
    }
    
    private getRandomAdvancedAction(): string {
        return ADVANCED_ACTIONS[Math.floor(Math.random() * ADVANCED_ACTIONS.length)].name;
    }
    
    private getRandomUnit(rarity: 'common'|'uncommon'|'rare'|'legendary' = 'common', undead: boolean = false): string {
        let units = UNITS.filter(u => u.rarity === rarity);
        if (undead) {
            units = units.filter(u => ['undead','vampire','skeleton','phantom'].includes(u.data?.type || ''));
            if (units.length === 0) units = UNITS.filter(u => u.rarity === rarity); // fallback
        }
        if (units.length === 0) return 'Mystery Unit';
        return units[Math.floor(Math.random() * units.length)].name;
    }
    
    /**
     * Apply rewards to hero
     */
    applyRewards(hero: Hero, rewards: RewardRoll[]): string[] {
        const messages: string[] = [];
        
        for (const roll of rewards) {
            const r = roll.reward;
            
            switch (r.type) {
                case 'crystal':
                    if (r.color && r.count) {
                        hero.crystals[r.color] = (hero.crystals[r.color] || 0) + r.count;
                        messages.push(`${r.count}x ${r.color} Crystal`);
                    }
                    break;
                case 'fame':
                    hero.gainFame(r.value || 0);
                    messages.push(`${r.value || 0} Fame`);
                    break;
                case 'healing':
                    // Heal one wound per point of healing value
                    const healAmount = r.value || 0;
                    let healed = 0;
                    for (let i = 0; i < healAmount; i++) {
                        if (hero.healWound(false)) {
                            healed++;
                        } else {
                            break; // No more wounds to heal
                        }
                    }
                    if (healed > 0) {
                        messages.push(`Healed ${healed} wounds`);
                    }
                    break;
                case 'artifact':
                    // Add artifact to hand (can be equipped later via equipArtifact)
                    // For now, just log the reward
                    messages.push(`Artifact: ${r.name}`);
                    break;
                case 'spell':
                    // Spells are cards - would need to be added to deck via card system
                    messages.push(`Spell: ${r.name}`);
                    break;
                case 'advanced_action':
                    // Learn advanced action as skill
                    // learnAdvancedAction requires (Card, influenceCost) - skip actual learning for now
                    if (r.name) {
                        messages.push(`Advanced Action: ${r.name}`);
                    }
                    break;
                case 'unit':
                    // Recruit unit
                    if (!hero.units) hero.units = [];
                    hero.units.push({ name: r.name, ...r.data });
                    messages.push(`Unit: ${r.name}`);
                    break;
                case 'mana':
                    // Mana is handled through crystals
                    break;
                case 'gold':
                    // Gold is not a separate currency in Mage Knight - use crystals
                    // Could add extra crystals as equivalent
                    if (r.value) {
                        const crystalColors = ['red', 'blue', 'green', 'white'] as const;
                        const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
                        hero.crystals[color] = (hero.crystals[color] || 0) + r.value;
                        messages.push(`${r.value} Gold (as ${color} Crystal)`);
                    }
                    break;
            }
        }
        
        return messages;
    }
    
    /**
     * Get reward description for UI
     */
    getRewardDescription(roll: RewardRoll): string {
        const r = roll.reward;
        switch (r.type) {
            case 'crystal': return `${r.count || 1}x ${r.color || 'Random'} Crystal`;
            case 'gold': return `${r.value || 0} Gold`;
            case 'fame': return `${r.value || 0} Fame`;
            case 'healing': return `Heal ${r.value || 'All'} wounds`;
            case 'artifact': return `Artifact: ${r.name}`;
            case 'spell': return `Spell: ${r.name}`;
            case 'advanced_action': return `Advanced Action: ${r.name}`;
            case 'unit': return `Unit: ${r.name}`;
            default: return r.name;
        }
    }
}

export default SiteRewardManager;