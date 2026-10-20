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
        const skills = getRandomSkills(this.game.hero.id, ownedSkillIds, 2);
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
            this.game.addLog(`Fähigkeit gelernt: ${selection.skill.name}`, 'success');
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
            return { success: false, message: 'Fähigkeit bereits benutzt oder nicht verfügbar.' };
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
                    // healWound() removes the wound card from hand *and* the
                    // wounds list; popping the list alone left an orphaned
                    // wound card blocking a hand slot.
                    if (this.game.hero.healWound(false)) woundsHealed++;
                    else break;
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

            // --- Goldyx: fire_breath ---
            case 'fire_breath': {
                if (!this.game.combat) {
                    return { success: false, message: 'Feueratem kann nur im Kampf eingesetzt werden.' };
                }
                const value = 3;
                this.game.combatOrchestrator.combatRangedTotal += value;
                this.game.combatOrchestrator.combatRangedElements.fire =
                    (this.game.combatOrchestrator.combatRangedElements.fire || 0) + value;
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Feueratem" genutzt: Fernkampf-Feuer-Angriff +${value}.`, 'success');
                this.game.combatOrchestrator.updateCombatTotals();
                this.game.updateStats();
                return { success: true, message: `Feueratem: +${value} Fernkampf-Feuer!` };
            }

            // --- Arythea: blood_rage (+3 attack this combat phase, 1 self wound) ---
            case 'blood_rage': {
                if (!this.game.combat) {
                    return { success: false, message: 'Blutrausch kann nur im Kampf eingesetzt werden.' };
                }
                const value = 3;
                this.game.combatOrchestrator.combatAttackTotal += value;
                this.game.combatOrchestrator.combatAttackElements.physical =
                    (this.game.combatOrchestrator.combatAttackElements.physical || 0) + value;
                this.game.hero.takeWound();
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Blutrausch" genutzt: +${value} Angriff, 1 eigene Wunde.`, 'warning');
                this.game.combatOrchestrator.updateCombatTotals();
                this.game.updateStats();
                return { success: true, message: `Blutrausch: +${value} Angriff (1 Wunde)!` };
            }

            // --- Arythea: dark_pact (draw 2 cards, take 1 wound) ---
            case 'dark_pact': {
                const value = 2;
                const drawn = this.game.hero.drawCards(value);
                this.game.hero.takeWound();
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Dunkler Pakt" genutzt: ${drawn.length} Karten gezogen, 1 Wunde.`, 'warning');
                this.game.renderHand();
                this.game.updateStats();
                return { success: true, message: `Dunkler Pakt: ${drawn.length} Karten, 1 Wunde.` };
            }

            // --- Tovak: iron_wall (+4 block this combat phase) ---
            case 'iron_wall': {
                if (!this.game.combat) {
                    return { success: false, message: 'Eiserne Mauer kann nur im Kampf eingesetzt werden.' };
                }
                const value = 4;
                this.game.combatOrchestrator.combatBlockTotal += value;
                this.game.combatOrchestrator.activeBlocks.push({
                    value,
                    element: 'physical'
                });
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Eiserne Mauer" genutzt: +${value} Block.`, 'success');
                this.game.combatOrchestrator.updateCombatTotals();
                this.game.updateStats();
                return { success: true, message: `Eiserne Mauer: +${value} Block!` };
            }

            // --- Tovak: counter_strike (+2 attack as retaliation when fully blocked) ---
            case 'counter_strike': {
                if (!this.game.combat) {
                    return { success: false, message: 'Konterangriff kann nur im Kampf eingesetzt werden.' };
                }
                const combat = this.game.combat;
                const allBlocked = combat.enemies.length > 0 &&
                    combat.enemies.every((enemy: any) => combat.blockedEnemies.has(enemy.id));

                if (!allBlocked) {
                    return { success: false, message: 'Konterangriff braucht einen vollständig geblockten Kampf.' };
                }

                const value = 2;
                this.game.combatOrchestrator.combatAttackTotal += value;
                this.game.combatOrchestrator.combatAttackElements.physical =
                    (this.game.combatOrchestrator.combatAttackElements.physical || 0) + value;
                this.game.hero.useSkill(skillId);
                this.game.addLog(`Fähigkeit "Konterangriff" genutzt: +${value} Angriff als Vergeltung.`, 'success');
                this.game.combatOrchestrator.updateCombatTotals();
                this.game.updateStats();
                return { success: true, message: `Konterangriff: +${value} Angriff!` };
            }

            default:
                return { success: false, message: 'Fähigkeitseffekt nicht implementiert.' };
        }
    }
}
