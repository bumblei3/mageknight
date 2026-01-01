/**
 * HeroController - Manages hero-related game logic
 * Extracted from MageKnightGame to improve separation of concerns.
 */
import { getRandomSkills } from '../skills.js';
import { SAMPLE_ADVANCED_ACTIONS, createDeck } from '../card.js';

export class HeroController {
    constructor(game) {
        this.game = game;
    }

    /**
     * Award fame to hero and trigger level-up if applicable.
     */
    gainFame(amount) {
        const result = this.game.hero.gainFame(amount);
        if (result.leveledUp) {
            this.game.statisticsManager.trackLevelUp(result.newLevel);
            this.game.addLog(`🎉 STUFENAUFSTIEG! Stufe ${result.newLevel} erreicht!`, 'success');
            this.game.showNotification(`Stufe ${result.newLevel} erreicht!`, 'success');
            this.triggerLevelUp(result.newLevel);
        }
    }

    /**
     * Show level-up modal with skill and card choices.
     */
    triggerLevelUp(newLevel) {
        const skills = getRandomSkills('GOLDYX', 2, this.game.hero.skills);
        const cards = createDeck(SAMPLE_ADVANCED_ACTIONS);

        this.game.ui.showLevelUpModal(newLevel, { skills, cards }, (selection) => {
            this.handleLevelUpSelection(selection);
        });
    }

    /**
     * Apply player's level-up selection.
     */
    handleLevelUpSelection(selection) {
        if (selection.skill) {
            this.game.hero.addSkill(selection.skill);
            this.game.addLog(`Fertigkeit gelernt: ${selection.skill.name}`, 'success');
        }

        if (selection.card) {
            this.game.hero.gainCardToHand(selection.card);
            this.game.addLog(`Karte erhalten (auf die Hand): ${selection.card.name}`, 'success');
        }

        this.game.hero.levelUp();

        // Particle Effect
        if (this.game.particleSystem) {
            const heroPixel = this.game.hexGrid.axialToPixel(
                this.game.hero.displayPosition.q,
                this.game.hero.displayPosition.r
            );
            this.game.particleSystem.levelUpExplosion(heroPixel.x, heroPixel.y);
        }

        this.game.updateStats();
        this.game.render();
    }

    /**
     * Heal a wound if healing points and wounds are available.
     */
    applyHealing() {
        if (!this.game.hero) {
            return false;
        }

        if (this.game.hero.healingPoints <= 0) {
            this.game.addLog('Keine Heilungspunkte verfügbar.', 'info');
            return false;
        }

        if (this.game.hero.wounds.length === 0) {
            this.game.addLog('Keine Verletzungen zum Heilen.', 'info');
            return false;
        }

        const success = this.game.hero.healWound(true);
        if (success) {
            this.game.addLog('Verletzung geheilt!', 'success');
            this.game.sound.heal();
            this.game.updateStats();
            this.game.renderHand();
            return true;
        }
        return false;
    }

    /**
     * Update hero mana display.
     */
    updateHeroMana() {
        this.game.ui.renderHeroMana(this.game.hero.getManaInventory());
    }

    /**
     * Get emoji representation for mana color.
     */
    getManaEmoji(color) {
        const emojis = {
            red: '🔥',
            blue: '💧',
            white: '✨',
            green: '🌿',
            gold: '💰',
            black: '🌑'
        };
        return emojis[color] || '⬛';
    }
}
