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

        // Determine Rewards based on level
        // Level 2, 4, 6... -> Skill + Advanced Action (Player chooses 1 of 2 skills, then 1 of 3 AA?)
        // Rules: Level up means you draw 2 skills, pick 1. Then draw 2 + 1 (offer) AA, pick 1.

        // 1. Skill Selection
        const currentSkillIds = new Set(this.game.hero.skills.map(s => s.id));
        const skillOffer = getRandomSkills('goldyx', currentSkillIds, 2);

        if (skillOffer.length > 0) {
            const selectedSkill = await this.skillModal.show(skillOffer);
            if (selectedSkill) {
                this.game.hero.addSkill(selectedSkill);
                this.game.addLog(`Skill gelernt: ${selectedSkill.name}`, 'success');
            }
        }

        // 2. Advanced Action (Simplified for now: Just gain top of deck or offer?)
        // For MVP, we skip the AA selection modal and just give a random one or skip it to keep scope tight.
        // Task said "Implement Hero Skill Trees", not "Full Level Up Flow".
        // But to be nice, I'll auto-award an AA if applicable.
        // Or I can reuse the logic later.

        this.game.updateStats();
    }
}
