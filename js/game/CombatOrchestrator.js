import { Combat } from '../combat.js';
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS, COMBAT_PHASES } from '../constants.js';
import { t } from '../i18n/index.js';

export class CombatOrchestrator {
    constructor(game) {
        this.game = game;
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.activeBlocks = []; // Track individual block sources for elemental logic
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;
    }

    /**
     * Handles playing a card during combat
     */
    playCardInCombat(index, card, useStrong = false) {
        if (!this.game.combat || card.isWound()) return;

        const result = this.game.hero.playCard(index, useStrong, this.game.timeManager.isNight());
        if (!result) return;

        // Particle Effect
        const rect = this.game.ui.elements.playedCards.getBoundingClientRect();
        this.game.particleSystem.playCardEffect(rect.right - 50, rect.top + 75, result.card.color);

        // Accumulate values based on phase
        const phase = this.game.combat.phase;
        if (phase === COMBAT_PHASES.BLOCK && result.effect.block) {
            this.combatBlockTotal += result.effect.block;
            // Store block source
            this.activeBlocks.push({
                value: result.effect.block,
                element: result.effect.element || 'physical'
            });
        } else if (phase === COMBAT_PHASES.RANGED) {
            if (result.effect.siege) {
                this.combatSiegeTotal += (result.effect.attack || 0);
            } else if (result.card.type === 'spell' || result.effect.ranged) {
                this.combatRangedTotal += (result.effect.attack || 0);
            }
        } else if (phase === COMBAT_PHASES.ATTACK && result.effect.attack) {
            this.combatAttackTotal += result.effect.attack;
        }

        this.game.addLog(t('combat.cardPlayed', { card: result.card.name }), 'combat');
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
            // Visual Polish: Screen Shake and Damage Numbers
            this.game.particleSystem.triggerShake(result.woundsReceived * 2, 0.4);
            this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y, result.woundsReceived, true);

            // Elemental Effects based on enemy attack type
            const attackType = this.game.combat.enemy.attackType;
            if (attackType === 'fire') {
                this.game.particleSystem.fireAttackEffect(heroPixel.x, heroPixel.y);
            } else if (attackType === 'ice' || attackType === 'cold') {
                this.game.particleSystem.iceAttackEffect(heroPixel.x, heroPixel.y);
            } else if (attackType === 'lightning') {
                this.game.particleSystem.lightningAttackEffect(heroPixel.x, heroPixel.y);
            }
        }

        // Handle Paralyze discard effect
        if (result.paralyzeTriggered) {
            const discarded = this.game.combat.handleParalyzeEffect();
            if (discarded > 0) {
                this.game.addLog(t('combat.paralyzeDiscard', { count: discarded }), 'warning');
                const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                this.game.particleSystem.createFloatingText(
                    heroPixel.x,
                    heroPixel.y,
                    `-${discarded} Karten (Versteinert)`,
                    '#ef4444'
                );
            }
        }

        this.game.addLog(result.message, 'combat');
        this.combatBlockTotal = 0;
        this.activeBlocks = [];
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

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            this.endRangedPhase();
            return;
        }

        if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            this.endBlockPhase();
            return;
        }

        if (this.game.combat.phase !== COMBAT_PHASES.ATTACK) return;

        // Visual Impact
        const pixelPos = this.game.hexGrid.axialToPixel(this.game.combat.enemy.position.q, this.game.combat.enemy.position.r);
        this.game.particleSystem.impactEffect(pixelPos.x, pixelPos.y);

        const attackResult = this.game.combat.attackEnemies(this.combatAttackTotal, 'physical');

        // Visual Polish: Enemy taking damage
        if (this.combatAttackTotal > 0) {
            this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, this.combatAttackTotal);
            if (this.combatAttackTotal >= 4) {
                this.game.particleSystem.triggerShake(3, 0.3);
            }
        }

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

        if (result.phase === COMBAT_PHASES.BLOCK) {
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

        this.game.addLog(t('combat.fightAgainst', { enemy: enemy.name }), 'combat');

        // Create combat instance
        this.game.combat = new Combat(this.game.hero, enemy, (result) => this.onCombatEnd(result));
        this.game.combat.start(); // Ensure combat starts (sets phase to RANGED)
        this.game.gameState = 'combat';

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;

        // UI Updates
        this.game.ui.showCombatPanel([enemy], this.game.combat.phase, (e) => this.handleEnemyClick(e));
        this.game.updatePhaseIndicator();

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.COMBAT_STARTED, { enemy });
    }

    /**
     * Handles clicking an enemy in the combat panel
     */
    handleEnemyClick(enemy) {
        if (!this.game.combat) return;

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            this.executeRangedAttack(enemy);
        } else if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            // Support spending movement points for Cumbersome enemies
            const movementPoints = this.game.hero.movementPoints;
            const result = this.game.combat.blockEnemy(enemy, this.activeBlocks, movementPoints);

            if (result.success && result.blocked) {
                // If cumbersome was utilized, spend the movement points
                if (enemy.cumbersome && movementPoints > 0) {
                    this.game.hero.movementPoints = 0;
                    this.game.addLog(t('combat.cumbersomeUsed', { enemy: enemy.name }), 'info');
                }

                // Particle Effect for successful block
                const pixelPos = this.game.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
                this.game.particleSystem.shieldEffect(pixelPos.x, pixelPos.y);
            }

            // Reset for next block attempt
            this.activeBlocks = [];
            this.combatBlockTotal = 0;

            this.updateCombatInfo();
            this.game.updateStats();
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
        this.activeBlocks = [];
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

        if (result.victory && enemy) {
            this.game.addLog(t('combat.victoryOver', { enemy: enemy.name }), 'success');
            this.game.entityManager.removeEnemy(enemy);

            // Gain fame
            const fameGained = enemy.fame || 0;
            const levelResult = this.game.hero.gainFame(fameGained);
            this.game.statisticsManager.increment('enemiesDefeated');

            this.game.addLog(t('combat.fameReward', { amount: fameGained }), 'info');

            if (levelResult && levelResult.leveledUp) {
                this.game.levelUpManager.handleLevelUp(levelResult);
            }

            // --- SITE REWARDS ---
            const currentSite = this.game.siteManager.currentSite;
            if (currentSite && !currentSite.conquered) {
                if (currentSite.type === 'dungeon' || currentSite.type === 'ruin') {
                    currentSite.conquered = true;
                    const logKey = currentSite.type === 'dungeon' ? 'combat.dungeonCleared' : 'combat.ruinCleared';
                    this.game.addLog(t(logKey), 'success');

                    // Trigger reward selection instead of random award
                    if (this.game.rewardManager) {
                        this.game.rewardManager.showArtifactChoice();
                    } else {
                        // Fallback
                        this.game.hero.awardRandomArtifact();
                    }
                } else if (currentSite.type === 'keep' || currentSite.type === 'mage_tower') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.siteConquered', { site: currentSite.getName() }), 'success');
                    this.game.statisticsManager.increment('sitesConquered');
                }
            }
        } else if (result.defeat && enemy) {
            this.game.addLog(t('combat.defeatAgainst', { enemy: enemy.name }), 'error');
        } else if (enemy) {
            this.game.addLog(t('combat.retreatFrom', { enemy: enemy.name }), 'info');
        }

        this.game.ui.hideCombatPanel();
        this.game.updateStats();
        this.game.updatePhaseIndicator();
        this.game.render();
        this.game.checkAndShowAchievements();

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.COMBAT_ENDED, { victory: result.victory, enemy });
    }

    /**
     * Executes ranged attack
     */
    executeRangedAttack(enemy) {
        if (!this.game.combat) return;

        const attackResult = this.game.combat.rangedAttackEnemy(
            enemy,
            this.combatRangedTotal || 0,
            (this.combatSiegeTotal || 0) + (this.game.hero.hasSkill('siege_mastery') ? 2 : 0)
        );

        // Visual Polish: Ranged Impact
        const damageDealt = (this.combatRangedTotal || 0) + (this.combatSiegeTotal || 0);
        if (enemy.position) {
            const pixelPos = this.game.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
            this.game.particleSystem.impactEffect(pixelPos.x, pixelPos.y, 'blue');
            if (damageDealt > 0) {
                this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, damageDealt);
            }
        } else if (this.game.hero.position) {
            // Fallback: use hero position for visual effects (site combat)
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.impactEffect(heroPixel.x, heroPixel.y - 50, 'blue');
            if (damageDealt > 0) {
                this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y - 50, damageDealt);
            }
        }

        this.game.addLog(attackResult.message, 'combat');

        if (attackResult.success) {
            // Update totals based on consumption
            this.combatRangedTotal = Math.max(0, this.combatRangedTotal - (attackResult.consumedRanged || 0));
            this.combatSiegeTotal = Math.max(0, this.combatSiegeTotal - (attackResult.consumedSiege || 0));

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
