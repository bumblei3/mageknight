import { ENEMY_TYPES, createEnemy, createBoss } from './enemy.js';

/**
 * Enemy AI Module
 * Handles intelligent enemy behavior, difficulty scaling, and boss mechanics
 */

export const ENEMY_ABILITIES = {
    NONE: 'none',
    POISON: 'poison', // Deals damage over time or extra wounds
    FREEZE: 'freeze', // Increases movement cost or blocks cards
    FIRE: 'fire', // Double damage
    SUMMON: 'summon', // Summons minion
    HEAL: 'heal', // Heals self
    VAMPIRIC: 'vampiric' // Heals on damage
};

export class EnemyAI {
    constructor(game) {
        this.game = game;
        this.difficulty = 1; // 1-10 scale
    }

    /**
     * Generate an enemy based on terrain and difficulty
     */
    generateEnemy(terrainType, level = 1) {
        const difficulty = Math.min(10, Math.ceil(level / 2) + this.difficulty);

        let type = ENEMY_TYPES.ORC;

        // Determine type based on terrain and difficulty
        if (terrainType === 'mountain' || terrainType === 'wasteland') {
            if (difficulty > 7) type = ENEMY_TYPES.DRACONUM;
            else if (difficulty > 5) type = ENEMY_TYPES.ELEMENTAL;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'swamp' || terrainType === 'ruins') {
            if (difficulty > 6) type = ENEMY_TYPES.NECROMANCER;
            else if (difficulty > 4) type = ENEMY_TYPES.MAGE_TOWER;
            else type = ENEMY_TYPES.ORC;
        } else if (terrainType === 'forest') {
            if (difficulty > 3) type = ENEMY_TYPES.ROBBER;
        }

        // Create base enemy
        const enemy = createEnemy(type);
        if (!enemy) return createEnemy(ENEMY_TYPES.ORC); // Fallback

        // Scale stats based on difficulty
        const scalingFactor = Math.max(0, difficulty - 3);
        if (scalingFactor > 0) {
            enemy.armor += Math.floor(scalingFactor / 2);
            enemy.attack += Math.floor(scalingFactor / 2);
            enemy.fame += scalingFactor;

            // Add random abilities for high difficulty
            if (difficulty > 5 && !enemy.abilities) enemy.abilities = [];
            if (difficulty > 5 && Math.random() > 0.5) enemy.abilities.push(ENEMY_ABILITIES.POISON);
            if (difficulty > 8) enemy.abilities.push(ENEMY_ABILITIES.VAMPIRIC);
        }

        enemy.level = difficulty;
        enemy.maxHealth = enemy.armor;
        enemy.currentHealth = enemy.armor;
        enemy.abilities = enemy.abilities || [];

        // Map existing flags to abilities for AI processing
        if (enemy.poison) enemy.abilities.push(ENEMY_ABILITIES.POISON);

        return enemy;
    }

    /**
     * Calculate enemy action for the turn
     */
    decideAction(enemy, _heroState) {
        // Simple AI: Attack if in range, otherwise wait
        // Could be expanded for complex behaviors
        return {
            type: 'attack',
            value: enemy.attack,
            abilities: enemy.abilities
        };
    }

    /**
     * Apply ability effects
     */
    applyAbility(ability, target, source) {
        switch (ability) {
        case ENEMY_ABILITIES.POISON:
            // Add extra wound to hand
            return { effect: 'wound', count: 1, message: 'Vergiftet! +1 Verletzung' };
        case ENEMY_ABILITIES.FIRE:
            // Double damage calculation handled in combat
            return { effect: 'damage_boost', message: 'Feuerangriff! Doppelter Schaden' };
        case ENEMY_ABILITIES.VAMPIRIC: {
            // Heal source
            const heal = 1;
            source.currentHealth = Math.min(source.maxHealth, source.currentHealth + heal);
            return { effect: 'heal', value: heal, message: 'Lebensraub! Feind heilt sich' };
        }
        default:
            return null;
        }
    }

    /**
     * Reconstitutes an enemy from saved data
     */
    reconstituteEnemy(eData) {
        let enemy;
        if (eData.isBoss) {
            enemy = createBoss(eData.type, eData.position);
        } else {
            enemy = createEnemy(eData.type, eData.position);
        }

        if (enemy && enemy.loadState) {
            enemy.loadState(eData);
        }

        return enemy;
    }
}
