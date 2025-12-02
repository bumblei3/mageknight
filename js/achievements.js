// Achievements System for Mage Knight
// Tracks player accomplishments and unlocks

export const ACHIEVEMENT_CATEGORIES = {
    COMBAT: 'combat',
    EXPLORATION: 'exploration',
    PROGRESSION: 'progression',
    MASTERY: 'mastery',
    SPECIAL: 'special'
};

export const ACHIEVEMENTS = {
    // Combat Achievements
    FIRST_BLOOD: {
        id: 'first_blood',
        name: 'Erste Beute',
        description: 'Besiege deinen ersten Feind',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '⚔️',
        condition: (stats) => stats.enemiesDefeated >= 1,
        reward: { fame: 1 }
    },
    SLAYER: {
        id: 'slayer',
        name: 'Schlächter',
        description: 'Besiege 10 Feinde',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '💀',
        condition: (stats) => stats.enemiesDefeated >= 10,
        reward: { fame: 5 }
    },
    PERFECT_COMBAT: {
        id: 'perfect_combat',
        name: 'Perfekter Kampf',
        description: 'Gewinne einen Kampf ohne Verletzungen',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '🛡️',
        condition: (stats) => stats.perfectCombats >= 1,
        reward: { fame: 3 }
    },
    DRAGON_SLAYER: {
        id: 'dragon_slayer',
        name: 'Drachentöter',
        description: 'Besiege einen Drachen',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        icon: '🐉',
        condition: (stats) => stats.dragonsDefeated >= 1,
        reward: { fame: 10 }
    },

    // Exploration Achievements
    EXPLORER: {
        id: 'explorer',
        name: 'Entdecker',
        description: 'Erkunde 3 neue Gebiete',
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🗺️',
        condition: (stats) => stats.tilesExplored >= 3,
        reward: { fame: 2 }
    },
    CARTOGRAPHER: {
        id: 'cartographer',
        name: 'Kartograph',
        description: 'Erkunde 10 neue Gebiete',
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🧭',
        condition: (stats) => stats.tilesExplored >= 10,
        reward: { fame: 5 }
    },
    SITE_VISITOR: {
        id: 'site_visitor',
        name: 'Reisender',
        description: 'Besuche 5 verschiedene Orte',
        category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
        icon: '🏛️',
        condition: (stats) => stats.sitesVisited >= 5,
        reward: { fame: 3 }
    },

    // Progression Achievements
    LEVEL_UP: {
        id: 'level_up',
        name: 'Aufsteigend',
        description: 'Erreiche Level 2',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '⭐',
        condition: (stats) => stats.level >= 2,
        reward: { fame: 2 }
    },
    MASTER: {
        id: 'master',
        name: 'Meister',
        description: 'Erreiche Level 5',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '🌟',
        condition: (stats) => stats.level >= 5,
        reward: { fame: 10 }
    },
    DECK_BUILDER: {
        id: 'deck_builder',
        name: 'Deck-Baumeister',
        description: 'Sammle 20 Karten',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        icon: '🎴',
        condition: (stats) => stats.totalCards >= 20,
        reward: { fame: 3 }
    },

    // Mastery Achievements
    SPEED_RUNNER: {
        id: 'speed_runner',
        name: 'Schnellläufer',
        description: 'Gewinne in unter 20 Zügen',
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '⚡',
        condition: (stats) => stats.victory && stats.turns <= 20,
        reward: { fame: 15 }
    },
    MANA_MASTER: {
        id: 'mana_master',
        name: 'Mana-Meister',
        description: 'Nutze 50 Mana-Würfel',
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '🔮',
        condition: (stats) => stats.manaUsed >= 50,
        reward: { fame: 5 }
    },
    CARD_MASTER: {
        id: 'card_master',
        name: 'Kartenmeister',
        description: 'Spiele 100 Karten',
        category: ACHIEVEMENT_CATEGORIES.MASTERY,
        icon: '🃏',
        condition: (stats) => stats.cardsPlayed >= 100,
        reward: { fame: 5 }
    },

    // Special Achievements
    SURVIVOR: {
        id: 'survivor',
        name: 'Überlebender',
        description: 'Überlebe mit nur 1 HP',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        icon: '💚',
        condition: (stats) => stats.closeCallSurvival >= 1,
        reward: { fame: 5 }
    },
    PACIFIST_WIN: {
        id: 'pacifist_win',
        name: 'Pazifist',
        description: 'Gewinne ohne eine Angriffskarte zu spielen (WIP)',
        category: ACHIEVEMENT_CATEGORIES.SPECIAL,
        icon: '☮️',
        condition: (stats) => stats.attackCardsPlayed === 0 && stats.victory,
        reward: { fame: 20 }
    }
};

export class AchievementManager {
    constructor() {
        this.unlockedAchievements = new Set();
        this.notifications = [];
        this.load();
    }

    /**
     * Check all achievements against current stats
     */
    checkAchievements(stats) {
        const newlyUnlocked = [];

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
     * Unlock an achievement
     */
    unlock(achievementId) {
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
    addNotification(achievement) {
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
    getUnlocked() {
        return Array.from(this.unlockedAchievements).map(id => {
            return Object.values(ACHIEVEMENTS).find(a => a.id === id);
        }).filter(Boolean);
    }

    /**
     * Get locked achievements
     */
    getLocked() {
        return Object.values(ACHIEVEMENTS).filter(achievement => {
            return !this.unlockedAchievements.has(achievement.id);
        });
    }

    /**
     * Get progress for all achievements
     */
    getProgress() {
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
    getByCategory(category) {
        return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
    }

    /**
     * Get pending notifications
     */
    getPendingNotifications() {
        const pending = [...this.notifications];
        this.notifications = [];
        return pending;
    }

    /**
     * Save to localStorage
     */
    save() {
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
    load() {
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
    reset() {
        this.unlockedAchievements.clear();
        this.notifications = [];
        this.save();
    }
}

export default AchievementManager;
