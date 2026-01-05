/**
 * HeroController - Manages hero-related game logic
 * Extracted from MageKnightGame to improve separation of concerns.
 */
import { getRandomSkills } from '../skills/skillDefinitions.js';
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

    /**
     * Active Skill Execution
     */
    useActiveSkill(skillId) {
        if (!this.game.hero) return { success: false, message: 'Kein Held aktiv.' };

        if (!this.game.hero.canUseSkill(skillId)) {
            return { success: false, message: 'Fertigkeit bereits benutzt oder nicht verfügbar.' };
        }

        // const skill = this.game.hero.skills.find(s => s.id === skillId); // Unused

        switch (skillId) {
        case 'flight': {
            this.game.hero.useSkill(skillId);
            // Apply flight status (ephemeral or status effect system)
            // For MVP: add movement points AND flag
            this.game.hero.movementPoints += 2;
            this.game.hero.addStatus('flight'); // Assume hero has addStatus or we set property
            this.game.addLog('Fähigkeit "Flug" genutzt: +2 Bewegung, Gelände ignoriert.', 'success');
            this.game.updateStats(); // Update UI
            return { success: true, message: 'Flug aktiviert!' };
        }

        case 'healing_touch': {
            // Heal 2 wounds.
            // Logic: remove up to 2 wounds
            let woundsHealed = 0;
            while (woundsHealed < 2 && this.game.hero.wounds.length > 0) {
                this.game.hero.wounds.pop();
                woundsHealed++;
            }

            if (woundsHealed > 0) {
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Heilende Hände" genutzt: ${woundsHealed} Wunden geheilt.`, 'success');
                this.game.sound.heal();
                this.game.updateStats();
                return { success: true, message: `${woundsHealed} Wunden geheilt!` };
            }
            return { success: false, message: 'Keine Wunden zum Heilen.' };
        }

        case 'motivation': {
            // Check if Norowas or Goldyx
            // Goldyx Motivation check
            if (this.game.hero.name === 'Goldyx' || !this.game.hero.units.some(u => u.spent)) {
                if (this.game.hero.name === 'Goldyx') {
                    this.game.hero.drawCards(2);
                    this.game.hero.takeManaFromSource('white');
                    this.game.hero.useSkill(skillId);
                    this.game.addLog('Fähigkeit "Motivation" genutzt: +2 Karten, +1 Weißes Mana.', 'success');
                    this.game.renderHand();
                    this.game.renderMana();
                    return { success: true, message: 'Motivation aktiviert!' };
                }
            }

            // Norowas Motivation logic
            const spentUnit = this.game.hero.units.find(u => u.spent);
            if (spentUnit) {
                spentUnit.spent = false;
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Motivation" genutzt: Einheit ${spentUnit.name} bereit gemacht.`, 'success');
                this.game.updateStats(); // Redraw units
                return { success: true, message: 'Einheit bereit!' };
            }

            return { success: false, message: 'Keine erschöpfte Einheit verfügbar.' };
        }

        case 'essence_flow': {
            this.game.hero.drawCards(1);
            const colors = ['red', 'blue', 'green', 'white'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.game.hero.takeManaFromSource(color);
            this.game.hero.useSkill(skillId);
            this.game.addLog(`Fähigkeit "Essenz-Fluss" genutzt: +1 Karte, +1 ${color}-Mana.`, 'success');
            this.game.renderHand();
            this.game.renderMana();
            return { success: true, message: `Essenz-Fluss aktiviert (${color})!` };
        }

        case 'freezing_breath': {
            if (!this.game.combat) {
                return { success: false, message: 'Eis-Atem kann nur im Kampf eingesetzt werden.' };
            }
            const enemies = this.game.combat.enemies;
            enemies.forEach(enemy => {
                enemy.armor = Math.max(1, enemy.armor - 3);
                enemy.attack = 0; // Lost all attacks
            });
            this.game.hero.useSkill(skillId);
            this.game.addLog('Fähigkeit "Eis-Atem" genutzt: Feinde eingefroren (-3 Rüstung, 0 Angriff).', 'success');
            this.game.updateCombatUI();
            return { success: true, message: 'Eis-Atem aktiviert!' };
        }

        default:
            return { success: false, message: 'Fähigkeitseffekt nicht implementiert.' };
        }
    }
}
