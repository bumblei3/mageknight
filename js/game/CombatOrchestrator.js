/**
 * Orchestrates combat lifecycle and transitions in game.js.
 */
import { Combat } from '../combat.js';

export class CombatOrchestrator {
    constructor(game) {
        this.game = game;
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;
    }

    /**
     * Handles playing a card during combat
     */
    playCardInCombat(index, card) {
        if (!this.game.combat || card.isWound()) return;

        const result = this.game.hero.playCard(index, false, this.game.timeManager.isNight());
        if (!result) return;

        // Particle Effect
        const rect = this.game.ui.elements.playedCards.getBoundingClientRect();
        this.game.particleSystem.playCardEffect(rect.right - 50, rect.top + 75, result.card.color);

        // Accumulate values based on phase
        const phase = this.game.combat.phase;
        if (phase === 'block' && result.effect.block) {
            this.combatBlockTotal += result.effect.block;
        } else if (phase === 'ranged') {
            if (result.effect.siege) {
                this.combatSiegeTotal += (result.effect.attack || 0);
            } else if (result.card.type === 'spell' || result.effect.ranged) {
                this.combatRangedTotal += (result.effect.attack || 0);
            }
        } else if (phase === 'attack' && result.effect.attack) {
            this.combatAttackTotal += result.effect.attack;
        }

        this.game.addLog(`${result.card.name} gespielt.`, 'combat');
        this.game.ui.addPlayedCard(result.card, result.effect);
        this.game.ui.showPlayArea();

        this.game.renderHand();
        this.game.updateStats();
        this.updateCombatTotals();
    }

    /**
     * Renders units available for combat
     */
    renderUnitsInCombat() {
        if (!this.game.combat) return;
        const units = this.game.hero.units;
        this.game.ui.renderUnitsInCombat(units, this.game.combat.phase, (u) => this.activateUnitInCombat(u));
    }

    /**
     * Activates a unit in combat
     */
    activateUnitInCombat(unit) {
        if (!this.game.combat) return;
        const result = this.game.combat.activateUnit(unit);
        if (result.success) {
            this.game.addLog(result.message, 'combat');
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.buffEffect(heroPixel.x, heroPixel.y);
            this.renderUnitsInCombat();
            this.game.updateStats();
        } else {
            this.game.addLog(result.message, 'info');
        }
    }

    /**
     * Ends the block phase and processes damage
     */
    endBlockPhase() {
        if (!this.game.combat) return;

        // Apply block points
        this.game.combat.blockEnemy(this.game.combat.enemy, this.combatBlockTotal);

        const result = this.game.combat.endBlockPhase();
        if (result.woundsReceived > 0) {
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.damageSplatter(heroPixel.x, heroPixel.y, result.woundsReceived);
        }

        this.game.addLog(result.message, 'combat');
        this.combatBlockTotal = 0;
        this.renderUnitsInCombat();
        this.game.updatePhaseIndicator();
        this.game.updateStats();
        this.updateCombatTotals();
    }

    /**
     * Executes attack action
     */
    executeAttackAction() {
        if (!this.game.combat) return;

        if (this.game.combat.phase === 'ranged') {
            this.endRangedPhase();
            return;
        }

        if (this.game.combat.phase !== 'attack') return;

        // Visual Impact
        const pixelPos = this.game.hexGrid.axialToPixel(this.game.combat.enemy.position.q, this.game.combat.enemy.position.r);
        this.game.particleSystem.impactEffect(pixelPos.x, pixelPos.y);

        const attackResult = this.game.combat.attackEnemies(this.combatAttackTotal, 'physical');
        this.game.addLog(attackResult.message, attackResult.success ? 'success' : 'warning');

        if (attackResult.success) {
            this.onCombatEnd({ victory: true, enemy: this.game.combat.enemy });
        } else {
            this.updateCombatInfo();
        }
    }

    /**
     * Ends the ranged phase
     */
    endRangedPhase() {
        if (!this.game.combat) return;
        const result = this.game.combat.endRangedPhase();
        this.game.addLog(result.message, 'combat');

        if (result.phase === 'block') {
            this.renderUnitsInCombat();
            this.game.updatePhaseIndicator();
            this.game.updateStats();
            this.updateCombatTotals();
        } else if (result.victory) {
            this.onCombatEnd({ victory: true, enemy: this.game.combat.enemy });
        }
    }

    /**
     * Starts combat with an enemy
     */
    initiateCombat(enemy) {
        if (this.game.gameState !== 'playing' || this.game.combat) return;

        this.game.addLog(`Kampf gegen ${enemy.name}!`, 'combat');

        // Create combat instance
        this.game.combat = new Combat(this.game.hero, enemy, (result) => this.onCombatEnd(result));
        this.game.combat.start(); // Ensure combat starts (sets phase to RANGED)
        this.game.gameState = 'combat';

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;

        // UI Updates
        this.game.ui.showCombatPanel([enemy], this.game.combat.phase, (e) => this.handleEnemyClick(e));
        this.game.updatePhaseIndicator();
    }

    /**
     * Handles clicking an enemy in the combat panel
     */
    handleEnemyClick(enemy) {
        if (!this.game.combat) return;

        if (this.game.combat.phase === 'ranged') {
            this.executeRangedAttack(enemy);
        } else if (this.game.combat.phase === 'block') {
            this.game.combat.blockEnemy(enemy, this.combatBlockTotal);
            this.updateCombatInfo();
        }
    }

    /**
     * Updates combat info in UI
     */
    updateCombatInfo() {
        if (!this.game.combat) return;
        this.game.ui.updateCombatInfo(this.game.combat.enemies, this.game.combat.phase, (e) => this.handleEnemyClick(e));
        this.updateCombatTotals();
    }

    /**
     * Updates combat totals in UI
     */
    updateCombatTotals() {
        if (!this.game.combat) return;
        this.game.ui.updateCombatTotals(this.combatAttackTotal, this.combatBlockTotal, this.game.combat.phase);
    }

    /**
     * Called when combat instance finishes
     */
    onCombatEnd(result) {
        this.game.gameState = 'playing';
        const enemy = result.enemy || (this.game.combat ? this.game.combat.enemies[0] : null);
        this.game.combat = null;

        // Reset totals
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

        if (result.victory && enemy) {
            this.game.addLog(`Sieg über ${enemy.name}!`, 'success');
            this.game.entityManager.removeEnemy(enemy);

            // Gain fame
            const fameGained = enemy.fame || 0;
            this.game.hero.gainFame(fameGained);
            this.game.statisticsManager.increment('enemiesDefeated');

            this.game.addLog(`+${fameGained} Ruhm für den Sieg.`, 'info');
        } else if (result.defeat && enemy) {
            this.game.addLog(`Niederlage gegen ${enemy.name}.`, 'error');
        } else if (enemy) {
            this.game.addLog(`Rückzug aus dem Kampf gegen ${enemy.name}.`, 'info');
        }

        this.game.ui.hideCombatPanel();
        this.game.updateStats();
        this.game.updatePhaseIndicator();
        this.game.render();
        this.game.checkAndShowAchievements();
    }

    /**
     * Executes ranged attack
     */
    executeRangedAttack(enemy) {
        if (!this.game.combat) return;

        const attackValue = (this.combatRangedTotal || 0) + (this.combatSiegeTotal || 0);
        const isSiege = (this.combatSiegeTotal || 0) > 0;
        const attackResult = this.game.combat.rangedAttackEnemy(enemy, attackValue, isSiege);

        this.game.addLog(attackResult.message, 'combat');

        if (attackResult.success) {
            // Update totals if hit consumed points
            if (isSiege) {
                this.combatSiegeTotal = Math.max(0, this.combatSiegeTotal - (attackResult.consumedPoints || 0));
            } else {
                this.combatRangedTotal = Math.max(0, this.combatRangedTotal - (attackResult.consumedPoints || 0));
            }

            if (this.game.combat.enemies.length === 0) {
                this.onCombatEnd({ victory: true, enemy: enemy });
            } else {
                this.updateCombatInfo();
            }
        } else {
            this.updateCombatInfo();
        }
    }
}
