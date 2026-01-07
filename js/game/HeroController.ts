import { getRandomSkills } from '../skills/skillDefinitions';
import { SAMPLE_ADVANCED_ACTIONS, createDeck } from '../card';

/**
 * HeroController - Manages hero-related game logic.
 * Extracted from MageKnightGame to improve separation of concerns.
 */
export class HeroController {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Award fame to hero and trigger level-up if applicable.
     */
    gainFame(amount: number): void {
        if (!this.game.hero) return;

        const result = this.game.hero.gainFame(amount);
        if (result.leveledUp) {
            if (this.game.statisticsManager) {
                this.game.statisticsManager.trackLevelUp(result.newLevel);
            }
            this.game.addLog(`🎉 STUFENAUFSTIEG! Stufe ${result.newLevel} erreicht!`, 'success');
            this.game.showNotification(`Stufe ${result.newLevel} erreicht!`, 'success');
            this.triggerLevelUp(result.newLevel);
        }
    }

    /**
     * Show level-up modal with skill and card choices.
     */
    triggerLevelUp(newLevel: number): void {
        const ownedSkillIds = new Set(this.game.hero.skills.map((s: any) => s.id)) as Set<string>;
        const skills = getRandomSkills('goldyx', ownedSkillIds, 2);
        const cards = createDeck(SAMPLE_ADVANCED_ACTIONS);

        if (this.game.ui) {
            this.game.ui.showLevelUpModal(newLevel, { skills, cards }, (selection: any) => {
                this.handleLevelUpSelection(selection);
            });
        }
    }

    /**
     * Apply player's level-up selection.
     */
    handleLevelUpSelection(selection: any): void {
        if (!this.game.hero) return;

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
        if (this.game.particleSystem && this.game.hexGrid) {
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
    applyHealing(): boolean {
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
            if (this.game.sound) this.game.sound.heal();
            this.game.updateStats();
            this.game.renderHand();
            return true;
        }
        return false;
    }

    /**
     * Update hero mana display.
     */
    updateHeroMana(): void {
        if (this.game.ui && this.game.hero) {
            this.game.ui.renderHeroMana(this.game.hero.getManaInventory());
        }
    }

    /**
     * Get emoji representation for mana color.
     */
    getManaEmoji(color: string): string {
        const emojis: Record<string, string> = {
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
    useActiveSkill(skillId: string): { success: boolean, message: string } {
        if (!this.game.hero) return { success: false, message: 'Kein Held aktiv.' };

        if (!this.game.hero.canUseSkill(skillId)) {
            return { success: false, message: 'Fertigkeit bereits benutzt oder nicht verfügbar.' };
        }

        switch (skillId) {
            case 'flight': {
                this.game.hero.useSkill(skillId);
                this.game.hero.movementPoints += 2;
                this.game.hero.addStatus('flight');
                this.game.addLog('Fähigkeit "Flug" genutzt: +2 Bewegung, Gelände ignoriert.', 'success');
                this.game.updateStats();
                return { success: true, message: 'Flug aktiviert!' };
            }

            case 'healing_touch': {
                let woundsHealed = 0;
                while (woundsHealed < 2 && this.game.hero.wounds.length > 0) {
                    this.game.hero.wounds.pop();
                    woundsHealed++;
                }

                if (woundsHealed > 0) {
                    this.game.hero.useSkill(skillId);
                    this.game.addLog(`Fähigkeit "Heilende Hände" genutzt: ${woundsHealed} Wunden geheilt.`, 'success');
                    if (this.game.sound) this.game.sound.heal();
                    this.game.updateStats();
                    return { success: true, message: `${woundsHealed} Wunden geheilt!` };
                }
                return { success: false, message: 'Keine Wunden zum Heilen.' };
            }

            case 'motivation': {
                if (this.game.hero.name === 'Goldyx' || !this.game.hero.units.some((u: any) => u.spent)) {
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

                const spentUnit = this.game.hero.units.find((u: any) => u.spent);
                if (spentUnit) {
                    spentUnit.spent = false;
                    this.game.hero.useSkill(skillId);
                    this.game.addLog(`Fähigkeit "Motivation" genutzt: Einheit ${spentUnit.name} bereit gemacht.`, 'success');
                    this.game.updateStats();
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
                enemies.forEach((enemy: any) => {
                    enemy.armor = Math.max(1, enemy.armor - 3);
                    enemy.attack = 0;
                });
                this.game.hero.useSkill(skillId);
                this.game.addLog('Fähigkeit "Eis-Atem" genutzt: Feinde eingefroren (-3 Rüstung, 0 Angriff).', 'success');
                // Assuming updateCombatUI exists or logic handled elsewhere
                if (typeof this.game.updateCombatUI === 'function') {
                    this.game.updateCombatUI();
                }
                return { success: true, message: 'Eis-Atem aktiviert!' };
            }

            default:
                return { success: false, message: 'Fähigkeitseffekt nicht implementiert.' };
        }
    }
}
