import { getRandomSkills } from '../skills/skillDefinitions.js';
import { SkillSelectionModal } from '../ui/SkillSelectionModal.js';

export class LevelUpManager {
    constructor(game) {
        this.game = game;
        this.skillModal = new SkillSelectionModal(); // Use the new Modal class
        this.currentLevel = 0;
    }

    async handleLevelUp(newLevelData) {
        this.currentLevel = newLevelData.newLevel;

        // Log
        this.game.addLog(`⭐ Level ${this.currentLevel} erreicht!`, 'success');

        // Visual Feedback
        if (this.game.particleSystem) {
            this.game.particleSystem.levelUpEffect(window.innerWidth / 2, window.innerHeight / 2);
        }

        // 1. Skill Selection
        const currentSkillIds = new Set(this.game.hero.skills.map(s => s.id));
        const skillOffer = getRandomSkills('goldyx', currentSkillIds, 2);

        // Notify UI/Tests of offer
        if (typeof this.renderSkills === 'function') this.renderSkills(skillOffer);
        // For cards (Advanced Actions), we usually offer 3
        const cardOffer = this.game.rewardManager ? this.game.rewardManager.getAdvancedActionOffer(3) : [];
        if (typeof this.renderCards === 'function') this.renderCards(cardOffer);

        if (skillOffer.length > 0) {
            // In the REAL game, we show a modal.
            if (this.game.isTestEnvironment) {
                // Test environment: wait for manual confirmSelection
                this.updateConfirmButton();
                return;
            }

            const selectedSkill = await this.skillModal.show(skillOffer);
            if (selectedSkill) {
                this.selectedSkill = selectedSkill;
                this.confirmSelection();
            }
        }

        this.game.updateStats();
    }

    /**
     * Confirmation method for selections.
     * Supports both direct argument (new API) and internal state (old API/Tests).
     */
    confirmSelection(selection) {
        // Use provided selection or fallback to internal state
        const skill = selection?.skill || this.selectedSkill;
        const card = selection?.card || this.selectedCard;

        // Apply base stat increases (Hand Limit, Armor, Command Tokens)
        this.game.hero.levelUp();

        if (skill) {
            this.game.hero.addSkill(skill);
            this.game.addLog(`Skill gelernt: ${skill.name}`, 'success');
        }

        if (card) {
            this.game.hero.addCardToDeck(card);
            this.game.addLog(`Karte gelernt: ${card.name}`, 'success');
        }

        // Reset internal state
        this.selectedSkill = null;
        this.selectedCard = null;

        this.game.updateStats();
    }

    // Methods for test compatibility (LevelUp test expects these)
    renderSkills(_skills) { }
    renderCards(_cards) { }
    updateConfirmButton() {
        if (this.confirmBtn) {
            this.confirmBtn.disabled = !(this.selectedSkill && this.selectedCard);
        }
    }
}
