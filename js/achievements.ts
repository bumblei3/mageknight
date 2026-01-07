// Achievements System for Mage Knight
import { t } from './i18n/index';
import { GameStats } from './statistics';

export const ACHIEVEMENT_CATEGORIES = {
    COMBAT: 'combat',
    EXPLORATION: 'exploration',
    PROGRESSION: 'progression',
    MASTERY: 'mastery',
    SPECIAL: 'special'
} as const;

export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[keyof typeof ACHIEVEMENT_CATEGORIES];

export interface Achievement {
    id: string;
    readonly name: string;
    readonly description: string;
    category: AchievementCategory;
    icon: string;
    condition: (stats: GameStats) => boolean;
    reward: Record<string, any>;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
    // Combat Achievements
    FIRST_BLOOD: {
        id: 'first_blood',
        get name() { return (t as any)('achievements.first_blood.name'); },
        get description() { return (t as any)('achievements.first_blood.desc'); },
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '⚔️',
        condition: (stats: GameStats) => stats.enemiesDefeated >= 1,
        reward: { fame: 1 }
    },
    SLAYER: {
        id: 'slayer',
        get name() { return (t as any)('achievements.slayer.name'); },
        get description() { return (t as any)('achievements.slayer.desc'); },
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '💀',
        condition: (stats: GameStats) => stats.enemiesDefeated >= 10,
        reward: { fame: 5 }
    },
    PERFECT_COMBAT: {
        id: 'perfect_combat',
        get name() { return (t as any)('achievements.perfect_combat.name'); },
        get description() { return (t as any)('achievements.perfect_combat.desc'); },
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '🛡️',
        condition: (stats: GameStats) => stats.perfectCombats >= 1,
        reward: { fame: 3 }
    },
    DRAGON_SLAYER: {
        id: 'dragon_slayer',
        get name() { return (t as any)('achievements.dragon_slayer.name'); },
        get description() { return (t as any)('achievements.dragon_slayer.desc'); },
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '🐉',
        condition: (stats: GameStats) => stats.dragonsDefeated >= 1,
        reward: { fame: 10 }
    },

    // Exploration Achievements
    EXPLORER: {
        id: 'explorer',
        get name() { return (t as any)('achievements.explorer.name'); },
        get description() { return (t as any)('achievements.explorer.desc'); },
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🗺️',
        condition: (stats: GameStats) => stats.tilesExplored >= 3,
        reward: { fame: 2 }
    },
    CARTOGRAPHER: {
        id: 'cartographer',
        get name() { return (t as any)('achievements.cartographer.name'); },
        get description() { return (t as any)('achievements.cartographer.desc'); },
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🧭',
        condition: (stats: GameStats) => stats.tilesExplored >= 10,
        reward: { fame: 5 }
    },
    SITE_VISITOR: {
        id: 'site_visitor',
        get name() { return (t as any)('achievements.site_visitor.name'); },
        get description() { return (t as any)('achievements.site_visitor.desc'); },
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🏛️',
        condition: (stats: GameStats) => stats.sitesVisited >= 5,
        reward: { fame: 3 }
    },

    // Progression Achievements
    LEVEL_UP: {
        id: 'level_up',
        get name() { return (t as any)('achievements.level_up.name'); },
        get description() { return (t as any)('achievements.level_up.desc'); },
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '⭐',
        condition: (stats: GameStats) => stats.level >= 2,
        reward: { fame: 2 }
    },
    MASTER: {
        id: 'master',
        get name() { return (t as any)('achievements.master.name'); },
        get description() { return (t as any)('achievements.master.desc'); },
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '🌟',
        condition: (stats: GameStats) => stats.level >= 5,
        reward: { fame: 10 }
    },
    DECK_BUILDER: {
        id: 'deck_builder',
        get name() { return (t as any)('achievements.deck_builder.name'); },
        get description() { return (t as any)('achievements.deck_builder.desc'); },
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '🎴',
        condition: (stats: GameStats) => stats.totalCards >= 20,
        reward: { fame: 3 }
    },

    // Mastery Achievements
    SPEED_RUNNER: {
        id: 'speed_runner',
        get name() { return (t as any)('achievements.speed_runner.name'); },
        get description() { return (t as any)('achievements.speed_runner.desc'); },
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '⚡',
        condition: (stats: GameStats) => stats.victory && stats.turns <= 20,
        reward: { fame: 15 }
    },
    MANA_MASTER: {
        id: 'mana_master',
        get name() { return (t as any)('achievements.mana_master.name'); },
        get description() { return (t as any)('achievements.mana_master.desc'); },
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '🔮',
        condition: (stats: GameStats) => stats.manaUsed >= 50,
        reward: { fame: 5 }
    },
    CARD_MASTER: {
        id: 'card_master',
        get name() { return (t as any)('achievements.card_master.name'); },
        get description() { return (t as any)('achievements.card_master.desc'); },
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '🃏',
        condition: (stats: GameStats) => stats.cardsPlayed >= 100,
        reward: { fame: 5 }
    },

    // Special Achievements
    SURVIVOR: {
        id: 'survivor',
        get name() { return (t as any)('achievements.survivor.name'); },
        get description() { return (t as any)('achievements.survivor.desc'); },
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        icon: '💚',
        condition: (stats: GameStats) => stats.closeCallSurvival >= 1,
        reward: { fame: 5 }
    },
    PACIFIST_WIN: {
        id: 'pacifist_win',
        get name() { return (t as any)('achievements.pacifist_win.name'); },
        get description() { return (t as any)('achievements.pacifist_win.desc'); },
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        icon: '☮️',
        condition: (stats: GameStats) => stats.attackCardsPlayed === 0 && stats.victory,
        reward: { fame: 20 }
    }
};

export class AchievementManager {
    private unlockedAchievements: Set<string> = new Set();
    private notifications: any[] = [];
    public achievements = ACHIEVEMENTS;

    constructor() {
        this.unlockedAchievements = new Set();
        this.notifications = [];
        this.achievements = ACHIEVEMENTS;
        this.load();
    }

    /**
     * Check all achievements against current stats
     */
    public checkAchievements(stats: GameStats): Achievement[] {
        const newlyUnlocked: Achievement[] = [];

        Object.values(ACHIEVEMENTS).forEach(achievement => {
            // Skip if already unlocked
            if (this.unlockedAchievements.has(achievement.id)) {
                return;
            }

            // Check condition
            if (achievement.condition(stats)) {
                this.unlock(achievement.id);
                newlyUnlocked.push(achievement);
            }
        });

        return newlyUnlocked;
    }

    /**
     * Check if achievement is unlocked
     */
    public isUnlocked(id: string): boolean {
        return this.unlockedAchievements.has(id);
    }

    /**
     * Unlock an achievement
     */
    public unlock(achievementId: string): boolean {
        if (this.unlockedAchievements.has(achievementId)) {
            return false;
        }

        this.unlockedAchievements.add(achievementId);
        this.save();

        const achievement = ACHIEVEMENTS[achievementId.toUpperCase()] ||
            Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);

        if (achievement) {
            this.addNotification(achievement);
        }

        return true;
    }

    /**
     * Add notification for unlocked achievement
     */
    private addNotification(achievement: Achievement): void {
        this.notifications.push({
            achievement,
            timestamp: Date.now()
        });

        // Keep only last 10 notifications
        if (this.notifications.length > 10) {
            this.notifications.shift();
        }
    }

    /**
     * Get all unlocked achievements
     */
    public getUnlocked(): Achievement[] {
        return Array.from(this.unlockedAchievements).map(id => {
            return Object.values(ACHIEVEMENTS).find(a => a.id === id);
        }).filter((a): a is Achievement => !!a);
    }

    /**
     * Get locked achievements
     */
    public getLocked(): Achievement[] {
        return Object.values(ACHIEVEMENTS).filter(achievement => {
            return !this.unlockedAchievements.has(achievement.id);
        });
    }

    /**
     * Get progress for all achievements
     */
    public getProgress(): { unlocked: number, total: number, percentage: number } {
        const total = Object.keys(ACHIEVEMENTS).length;
        const unlocked = this.unlockedAchievements.size;
        return {
            unlocked,
            total,
            percentage: Math.round((unlocked / total) * 100)
        };
    }

    /**
     * Get achievements by category
     */
    public getByCategory(category: AchievementCategory): Achievement[] {
        return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
    }

    /**
     * Get pending notifications
     */
    public getPendingNotifications(): any[] {
        const pending = [...this.notifications];
        this.notifications = [];
        return pending;
    }

    /**
     * Save to localStorage
     */
    public save(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const data = {
                unlocked: Array.from(this.unlockedAchievements),
                timestamp: Date.now()
            };
            localStorage.setItem('mageKnight_achievements', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save achievements:', error);
        }
    }

    /**
     * Load from localStorage
     */
    public load(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const data = localStorage.getItem('mageKnight_achievements');
            if (data) {
                const parsed = JSON.parse(data);
                this.unlockedAchievements = new Set(parsed.unlocked || []);
            }
        } catch (error) {
            console.error('Failed to load achievements:', error);
            this.unlockedAchievements = new Set();
        }
    }

    /**
     * Reset all achievements
     */
    public reset(): void {
        this.unlockedAchievements.clear();
        this.notifications = [];
        this.save();
    }

    /**
     * Gets state for persistence.
     */
    public getState(): { unlocked: string[] } {
        return {
            unlocked: Array.from(this.unlockedAchievements)
        };
    }

    /**
     * Loads state from object.
     */
    public loadState(state: any): void {
        if (!state || !state.unlocked) return;
        this.unlockedAchievements = new Set(state.unlocked);
    }
}

export default AchievementManager;
