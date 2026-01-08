import { Combat } from '../combat';
import { eventBus } from '../eventBus';
import { GAME_EVENTS, COMBAT_PHASES } from '../constants';
import { t } from '../i18n/index';
import Enemy, { ENEMY_DEFINITIONS } from '../enemy';

export interface BlockSource {
    value: number;
    element: string;
}

export class CombatOrchestrator {
    private game: any;
    public combatAttackTotal: number;
    public combatBlockTotal: number;
    public activeBlocks: BlockSource[];
    public combatRangedTotal: number;
    public combatSiegeTotal: number;

    constructor(game: any) {
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
    playCardInCombat(index: number, card: any, useStrong: boolean = false): void {
        if (!this.game.combat || card.isWound()) return;

        // SAVE STATE before playing card in combat
        if (this.game.actionManager) {
            this.game.actionManager.saveCheckpoint();
        }

        const result = this.game.hero.playCard(index, useStrong, this.game.timeManager.isNight());
        if (!result) return;

        // Particle Effect
        if (this.game.ui && this.game.ui.elements && this.game.ui.elements.playedCards) {
            const rect = this.game.ui.elements.playedCards.getBoundingClientRect();
            if (this.game.particleSystem) {
                this.game.particleSystem.playCardEffect(rect.right - 50, rect.top + 75, result.card.color);
            }
        }

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
        } else if ((phase === COMBAT_PHASES.ATTACK || phase === COMBAT_PHASES.DAMAGE) && result.effect.attack) {
            this.combatAttackTotal += result.effect.attack;
        }

        this.game.addLog(t('combat.cardPlayed', { card: result.card.name }), 'combat');
        if (this.game.ui) {
            this.game.ui.addPlayedCard(result.card, result.effect);
        }

        eventBus.emit(GAME_EVENTS.CARD_PLAYED, { combat: true });

        if (this.game.ui) {
            this.game.ui.showPlayArea();
        }

        this.game.renderHand();
        this.game.updateStats();
        this.updateCombatTotals();
    }

    /**
     * Renders units available for combat
     */
    renderUnitsInCombat(): void {
        if (!this.game.combat || !this.game.ui) return;
        const units = this.game.hero.units;
        this.game.ui.renderUnitsInCombat(units, this.game.combat.phase, (u: any) => this.activateUnitInCombat(u));
    }

    /**
     * Activates a unit in combat
     */
    activateUnitInCombat(unit: any): void {
        if (!this.game.combat) return;
        const result = this.game.combat.activateUnit(unit);
        if (result.success) {
            this.game.addLog(result.message, 'combat');
            if (this.game.hexGrid && this.game.particleSystem) {
                const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                this.game.particleSystem.buffEffect(heroPixel.x, heroPixel.y);
            }
            this.renderUnitsInCombat();
            this.game.updateStats();
        } else {
            this.game.addLog(result.message, 'info');
        }
    }

    /**
     * Ends the block phase and processes damage
     */
    endBlockPhase(): void {
        if (!this.game.combat) return;

        // Apply block points
        this.game.combat.blockEnemy(this.game.combat.enemy, this.combatBlockTotal);

        // End Block Phase is irreversible (reveals damage/wounds)
        if (this.game.actionManager) this.game.actionManager.clearHistory();

        const result = this.game.combat.endBlockPhase();

        // INTERACTIVE DAMAGE PHASE:
        // If we are waiting for assignment, just update UI and waiting state
        if (result.waitingForAssignment) {
            this.game.addLog(result.message, 'info');
            this.combatBlockTotal = 0;
            this.activeBlocks = [];

            // Show new phase UI
            this.game.updatePhaseIndicator();
            this.updateCombatInfo();
            // Force render units to make them potentially clickable (handled by UI logic)
            this.renderUnitsInCombat();
            return;
        }

        // If not waiting (skipped or auto-resolved?), handle immediate results
        this.handleDamageResults(result);

        this.combatBlockTotal = 0;
        this.activeBlocks = [];
        this.renderUnitsInCombat();
        this.game.updatePhaseIndicator();
        this.game.updateStats();
        this.updateCombatTotals();
    }

    /**
     * Assigns damage to a unit interactively
     */
    assignDamageToUnit(unit: any): void {
        if (!this.game.combat) return;

        const result = this.game.combat.assignDamageToUnit(unit);

        if (result.success) {
            this.game.addLog(result.message, 'warning');

            if (result.unitDestroyed && this.game.particleSystem) {
                this.game.particleSystem.triggerShake(8, 0.4); // Big shake for death
                this.game.particleSystem.freeze(0.1); // Impact freeze
            }

            this.updateCombatInfo();
            this.renderUnitsInCombat(); // Update unit status (wounded/destroyed)
            this.game.updateStats();
        } else {
            this.game.addLog(result.message, 'error');
        }
    }

    /**
     * Resolves the damage phase (Player confirms "Take remaining damage on Hero")
     */
    resolveDamagePhase(): void {
        if (!this.game.combat) return;

        const result = this.game.combat.resolveDamagePhase();
        if (result) {
            this.handleDamageResults(result);
            this.updateCombatInfo();
            this.game.updateStats();
            this.game.updatePhaseIndicator();
            this.renderUnitsInCombat();
        }
    }

    /**
     * Helper to process damage results (visuals, logs)
     */
    handleDamageResults(result: any): void {
        if (this.game.hexGrid && this.game.particleSystem) {
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.damageSplatter(heroPixel.x, heroPixel.y, result.woundsReceived);

            // Visual Polish: Screen Shake based on severity
            const shakeIntensty = Math.min(15, result.woundsReceived * 3);
            this.game.particleSystem.triggerShake(shakeIntensty, 0.4);
            this.game.particleSystem.freeze(0.05); // Subtle hit-stop

            this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y - 20, result.woundsReceived, result.woundsReceived > 1);
        }

        eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, {
            targetPos: this.game.hero.position,
            amount: result.woundsReceived,
            targetType: 'hero'
        });

        // Handle Paralyze discard effect
        if (result.paralyzeTriggered) {
            const discarded = this.game.combat.handleParalyzeEffect();
            if (discarded > 0) {
                this.game.addLog(t('combat.paralyzeDiscard', { count: discarded }), 'warning');
                if (this.game.hexGrid && this.game.particleSystem) {
                    const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                    this.game.particleSystem.createFloatingText(
                        heroPixel.x,
                        heroPixel.y,
                        `-${discarded} Karten (Versteinert)`,
                        '#ef4444'
                    );
                }
            }
        }

        this.game.addLog(result.message, 'combat');
    }

    /**
     * Executes attack action
     */
    executeAttackAction(): void {
        if (!this.game.combat) return;

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            this.endRangedPhase();
            return;
        }

        if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            this.endBlockPhase();
            return;
        }

        if (this.game.combat.phase === COMBAT_PHASES.DAMAGE) {
            this.resolveDamagePhase();
            return;
        }

        if (this.game.combat.phase !== COMBAT_PHASES.ATTACK) return;

        // Execute Attack is irreversible (reveals info, deals damage)
        if (this.game.actionManager) this.game.actionManager.clearHistory();

        // Visual Impact
        if (this.game.hexGrid && this.game.particleSystem) {
            const pixelPos = this.game.hexGrid.axialToPixel(this.game.combat.enemy.position.q, this.game.combat.enemy.position.r);
            this.game.particleSystem.combatClashEffect(pixelPos.x, pixelPos.y, 'physical');

            // Visual Polish: Enemy taking damage
            if (this.combatAttackTotal > 0) {
                this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, this.combatAttackTotal, this.combatAttackTotal >= 5);

                if (this.combatAttackTotal >= 4) {
                    this.game.particleSystem.triggerShake(Math.min(10, this.combatAttackTotal), 0.3);
                    this.game.particleSystem.freeze(0.05); // Tactical freeze
                }
            }
        }

        const attackResult = this.game.combat.attackEnemies(this.combatAttackTotal, 'physical');

        if (this.combatAttackTotal > 0) {
            eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, {
                targetPos: this.game.combat.enemy.position,
                amount: this.combatAttackTotal,
                targetType: 'enemy'
            });
        }


        this.game.addLog(attackResult.message, attackResult.success ? 'success' : 'warning');

        // ALWAYS end combat when this button is pressed in the Attack phase
        this.onCombatEnd({ victory: attackResult.success, enemy: this.game.combat.enemy });
    }

    /**
     * Ends the ranged phase
     */
    endRangedPhase(): void {
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
     * Starts combat with an enemy or group of enemies
     * @param {any} enemyOrEnemies Single enemy object or array of enemies
     */
    initiateCombat(enemyOrEnemies: any): void {
        if (this.game.combat) return;
        if (!enemyOrEnemies) return;

        let enemies = Array.isArray(enemyOrEnemies) ? enemyOrEnemies : [enemyOrEnemies];
        enemies = enemies.filter(e => !!e);
        if (enemies.length === 0) return;

        if (this.game.gameState !== 'playing' && !this.game.isTestEnvironment) return;

        // INFO: Handle Summoning
        const processedEnemies = enemies.map(enemy => {
            if (enemy.summoner) {
                let summonKey = 'orc';
                const candidates = Object.keys(ENEMY_DEFINITIONS).filter(k => {
                    const def = ENEMY_DEFINITIONS[k];
                    return !def.summoner && !def.fortified && k !== 'weakling';
                });

                if (candidates.length > 0) {
                    summonKey = candidates[Math.floor(Math.random() * candidates.length)];
                }

                const summonDef = ENEMY_DEFINITIONS[summonKey] || ENEMY_DEFINITIONS['orc'];
                const summonedEnemy = new (Enemy as any)({
                    ...summonDef,
                    id: `summoned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });

                this.game.addLog(t('combat.summoning', { summoner: enemy.name, summoned: summonedEnemy.name }), 'warning');
                return summonedEnemy;
            }
            return enemy;
        });

        enemies = processedEnemies;

        const names = enemies.map(e => e.name).join(' & ');

        this.game.addLog(t('combat.fightAgainst', { enemy: names }), 'combat');

        // Create combat instance
        this.game.combat = new Combat(this.game.hero, enemies, (result: any) => this.onCombatEnd(result));
        this.game.combat.start();
        this.game.gameState = 'combat';

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;

        // UI Updates
        if (this.game.ui) {
            this.game.ui.showCombatPanel(enemies, this.game.combat.phase, (e: any) => this.handleEnemyClick(e));
        }
        this.updateCombatTotals(); // Ensure button visibility
        this.game.updatePhaseIndicator();

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.COMBAT_STARTED, { enemies });
    }

    /**
     * Handles clicking an enemy in the combat panel
     */
    handleEnemyClick(enemy: any): void {
        if (!this.game.combat) return;

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            this.executeRangedAttack(enemy);
        } else if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            const movementPoints = this.game.hero.movementPoints;
            let movementToSpend = movementPoints;

            const result = this.game.combat.blockEnemy(enemy, this.activeBlocks, movementToSpend);

            if (result.success && result.blocked) {
                if (enemy.cumbersome && movementPoints > 0) {
                    const rawReq = typeof enemy.getBlockRequirement === 'function' ? enemy.getBlockRequirement() : enemy.attack;
                    const effectiveFromCardsAndUnits = result.totalBlock;
                    const neededMove = Math.max(0, rawReq - effectiveFromCardsAndUnits);
                    const actualSpent = Math.min(movementPoints, neededMove);

                    if (actualSpent > 0) {
                        this.game.hero.movementPoints = Math.max(0, this.game.hero.movementPoints - actualSpent);
                        this.game.addLog(t('combat.cumbersomeUsed', { enemy: enemy.name, amount: actualSpent }), 'info');
                    }
                }

                eventBus.emit(GAME_EVENTS.COMBAT_BLOCK, {
                    enemyPos: enemy.position,
                    blocked: true
                });

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
    updateCombatInfo(): void {
        if (!this.game.combat || !this.game.ui) return;
        this.game.ui.updateCombatInfo(this.game.combat.enemies, this.game.combat.phase, (e: any) => this.handleEnemyClick(e));
        this.updateCombatTotals();
    }

    /**
     * Updates combat totals in UI
     */
    updateCombatTotals(): void {
        if (!this.game.combat || !this.game.ui) return;
        this.game.ui.updateCombatTotals(this.combatAttackTotal, this.combatBlockTotal, this.game.combat.phase);
    }

    /**
     * Called when combat instance finishes
     */
    onCombatEnd(result: any): void {
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
            if (this.game.statisticsManager) {
                this.game.statisticsManager.increment('enemiesDefeated');
            }

            this.game.addLog(t('combat.fameReward', { amount: fameGained }), 'info');

            if (levelResult && levelResult.leveledUp && this.game.levelUpManager) {
                this.game.levelUpManager.handleLevelUp(levelResult);
            }

            // --- SITE REWARDS ---
            const currentSite = this.game.siteManager ? this.game.siteManager.currentSite : null;
            if (currentSite && !currentSite.conquered) {
                if (currentSite.type === 'dungeon' || currentSite.type === 'ruin') {
                    currentSite.conquered = true;
                    const logKey = currentSite.type === 'dungeon' ? 'combat.dungeonCleared' : 'combat.ruinCleared';
                    this.game.addLog(t(logKey), 'success');

                    if (this.game.rewardManager) {
                        this.game.rewardManager.showArtifactChoice();
                    }
                } else if (currentSite.type === 'tomb') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.tombCleared'), 'success');
                    if (this.game.rewardManager) {
                        this.game.rewardManager.showSpellChoice();
                    }
                } else if (currentSite.type === 'labyrinth') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.labyrinthCleared'), 'success');
                    if (this.game.rewardManager) {
                        this.game.rewardManager.showArtifactChoice();
                    }
                } else if (currentSite.type === 'spawning_grounds') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.spawningCleared'), 'success');

                    // Reward: Small Heal
                    const healed = this.game.hero.healWound(false);
                    if (healed && this.game.hexGrid && this.game.particleSystem) {
                        this.game.addLog('Die reinigende Energie heilt eine Wunde!', 'success');
                        const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                        this.game.particleSystem.buffEffect(heroPixel.x, heroPixel.y, 'green');
                    }
                } else if (currentSite.type === 'keep' || currentSite.type === 'mage_tower' || currentSite.type === 'mine') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.siteConquered', { site: currentSite.getName() }), 'success');
                    if (this.game.statisticsManager) {
                        this.game.statisticsManager.increment('sitesConquered');
                    }

                    // Check Victory Condition after every conquest
                    if (this.game.scenarioManager) {
                        const win = this.game.scenarioManager.checkVictory();
                        if (win && win.victory) {
                            setTimeout(() => {
                                this.game.showNotification('🎉 ' + win.message, 'success');
                                this.game.addLog(win.message, 'success');
                            }, 1000);
                        }
                    }
                }
            }
        } else if (result.defeat && enemy) {
            this.game.addLog(t('combat.defeatAgainst', { enemy: enemy.name }), 'error');
        } else if (enemy) {
            this.game.addLog(t('combat.retreatFrom', { enemy: enemy.name }), 'info');
        }

        if (this.game.ui) {
            this.game.ui.hideCombatPanel();
        }
        this.game.updateStats();
        this.game.updatePhaseIndicator();
        this.game.render();
        if (this.game.checkAndShowAchievements) {
            this.game.checkAndShowAchievements();
        }

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.COMBAT_ENDED, { victory: result.victory, enemy });
    }

    /**
     * Executes ranged attack
     */
    executeRangedAttack(enemy: any): void {
        if (!this.game.combat) return;

        const attackResult = this.game.combat.rangedAttackEnemy(
            enemy,
            this.combatRangedTotal || 0,
            (this.combatSiegeTotal || 0) + (this.game.hero.hasSkill('siege_mastery') ? 2 : 0)
        );

        // Visual Polish: Ranged Impact
        const damageDealt = (this.combatRangedTotal || 0) + (this.combatSiegeTotal || 0);
        if (this.game.hexGrid && this.game.particleSystem) {
            if (enemy.position) {
                const pixelPos = this.game.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
                this.game.particleSystem.impactEffect(pixelPos.x, pixelPos.y, 'blue');
                if (damageDealt > 0) {
                    this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, damageDealt);
                }
            } else if (this.game.hero.position) {
                const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                this.game.particleSystem.impactEffect(heroPixel.x, heroPixel.y - 50, 'blue');
                if (damageDealt > 0) {
                    this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y - 50, damageDealt);
                }
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
