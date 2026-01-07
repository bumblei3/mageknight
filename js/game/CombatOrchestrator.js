import { Combat } from '../combat.js';
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS, COMBAT_PHASES } from '../constants.js';
import { t } from '../i18n/index.js';
import Enemy, { ENEMY_DEFINITIONS } from '../enemy.js';

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

        // SAVE STATE before playing card in combat
        if (this.game.actionManager) {
            this.game.actionManager.saveCheckpoint();
        }

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

        eventBus.emit(GAME_EVENTS.CARD_PLAYED, { combat: true });

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
    assignDamageToUnit(unit) {
        if (!this.game.combat) return;

        const result = this.game.combat.assignDamageToUnit(unit);

        if (result.success) {
            this.game.addLog(result.message, 'warning');

            // Visual feedback on Unit
            // Need pixel position? Units in Combat don't have grid pos, they are UI elements.
            // But we can trigger a generic "Unit Hit" sound/effect or shake the UI card.
            // Ideally UI handles the visual, here we trigger game state updates.

            if (result.unitDestroyed) {
                this.game.particleSystem.triggerShake(5, 0.5); // Big shake for death
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
    resolveDamagePhase() {
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
    handleDamageResults(result) {
        if (result.woundsReceived > 0) {
            // const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            // this.game.particleSystem.damageSplatter(heroPixel.x, heroPixel.y, result.woundsReceived);
            // Visual Polish: Screen Shake and Damage Numbers
            // this.game.particleSystem.triggerShake(result.woundsReceived * 2, 0.4);
            // this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y, result.woundsReceived, true);

            eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, {
                targetPos: this.game.hero.position,
                amount: result.woundsReceived,
                targetType: 'hero'
            });


            // Elemental Effects based on enemy attack type (generic for now as multiple enemies might attack)
            // But we can check one unblocked enemy from list if available
            // const attackType = this.game.combat.enemy.attackType; // Warning: 'enemy' might be blocked one.
            // Better to use generic effect or iterate.
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

        if (this.game.combat.phase === COMBAT_PHASES.DAMAGE) {
            this.resolveDamagePhase();
            return;
        }

        if (this.game.combat.phase !== COMBAT_PHASES.ATTACK) return;

        // Execute Attack is irreversible (reveals info, deals damage)
        if (this.game.actionManager) this.game.actionManager.clearHistory();

        // Visual Impact
        const pixelPos = this.game.hexGrid.axialToPixel(this.game.combat.enemy.position.q, this.game.combat.enemy.position.r);
        this.game.particleSystem.combatClashEffect(pixelPos.x, pixelPos.y, 'physical');

        const attackResult = this.game.combat.attackEnemies(this.combatAttackTotal, 'physical');

        // Visual Polish: Enemy taking damage
        if (this.combatAttackTotal > 0) {
            // this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, this.combatAttackTotal);
            // if (this.combatAttackTotal >= 4) {
            //    this.game.particleSystem.triggerShake(3, 0.3);
            // }
            eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, {
                targetPos: this.game.combat.enemy.position,
                amount: this.combatAttackTotal,
                targetType: 'enemy'
            });
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
     * Starts combat with an enemy or group of enemies
     * @param {Object|Array} enemyOrEnemies Single enemy object or array of enemies
     */
    initiateCombat(enemyOrEnemies) {
        if (this.game.gameState !== 'playing' || this.game.combat) return;

        let enemies = Array.isArray(enemyOrEnemies) ? enemyOrEnemies : [enemyOrEnemies];

        // INFO: Handle Summoning (Herbeirufen)
        // Rule: Summoner is replaced by a random enemy token
        const processedEnemies = enemies.map(enemy => {
            if (enemy.summoner) {
                // Determine summon pool (Brown tokens usually: Orcs, etc.)
                // For simplicity, we pick from a curated list of "Brown-ish" enemies
                // Filter keys that exist in ENEMY_DEFINITIONS
                // Fallback to Orc if pool empty or issues
                let summonKey = 'orc';

                // Better: Pick any random definition that is NOT a boss, city, or summoner
                const candidates = Object.keys(ENEMY_DEFINITIONS).filter(k => {
                    const def = ENEMY_DEFINITIONS[k];
                    return !def.summoner && !def.fortified && k !== 'weakling'; // simple enemies
                });

                if (candidates.length > 0) {
                    summonKey = candidates[Math.floor(Math.random() * candidates.length)];
                }

                const summonDef = ENEMY_DEFINITIONS[summonKey] || ENEMY_DEFINITIONS['orc'];
                const summonedEnemy = new Enemy({
                    ...summonDef,
                    id: `summoned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });

                this.game.addLog(t('combat.summoning', { summoner: enemy.name, summoned: summonedEnemy.name }), 'warning');
                return summonedEnemy;
            }
            return enemy;
        });

        enemies = processedEnemies; // Update reference

        const names = enemies.map(e => e.name).join(' & ');

        this.game.addLog(t('combat.fightAgainst', { enemy: names }), 'combat');

        // Create combat instance - Combat constructor handles array
        this.game.combat = new Combat(this.game.hero, enemies, (result) => this.onCombatEnd(result));
        this.game.combat.start();
        this.game.gameState = 'combat';

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;

        // UI Updates - Pass array
        this.game.ui.showCombatPanel(enemies, this.game.combat.phase, (e) => this.handleEnemyClick(e));
        this.game.updatePhaseIndicator();

        // Emit event for other systems
        eventBus.emit(GAME_EVENTS.COMBAT_STARTED, { enemies });
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

            // Smart Consumption Calculation for Cumbersome
            // Only spend what is needed appropriately
            let movementToSpend = movementPoints;

            if (enemy.cumbersome && movementPoints > 0) {
                // Logic preserved for cumbersome movement point spending usage, if we need it later.
                // Currently simplified to spending logic in blockEnemy.
            }

            const result = this.game.combat.blockEnemy(enemy, this.activeBlocks, movementToSpend);

            if (result.success && result.blocked) {
                // If cumbersome was utilized, determine actual needed points
                if (enemy.cumbersome && movementPoints > 0) {
                    // Current system: consumes 'movementToSpend' (all).
                    // We want to retroactively adjust or calculate precisely BEFORE.

                    // Optimized:
                    // 1. Get raw block requirement (without move reduction)
                    const rawReq = typeof enemy.getBlockRequirement === 'function' ? enemy.getBlockRequirement() : enemy.attack;

                    // 2. Calculate effective block provided by cards/units
                    // This is returned in result.totalBlock!
                    // const totalBlock = result.totalBlock;

                    // 3. Gap = rawReq - totalBlock (but totalBlock might ALREADY include move reduction? No, wait.)
                    // BlockingEngine:
                    // blockRequired = Math.max(0, blockRequired - internalMovementSpent);
                    // totalEffectiveBlock = cards + units
                    // Check: totalEffectiveBlock >= blockRequired

                    // So: totalEffectiveBlock >= (rawReq - moveSpent)
                    // => moveSpent >= rawReq - totalEffectiveBlock

                    const effectiveFromCardsAndUnits = result.totalBlock; // This is purely cards + units

                    const neededMove = Math.max(0, rawReq - effectiveFromCardsAndUnits);
                    const actualSpent = Math.min(movementPoints, neededMove);

                    if (actualSpent > 0) {
                        this.game.hero.movementPoints = Math.max(0, this.game.hero.movementPoints - actualSpent);
                        this.game.addLog(t('combat.cumbersomeUsed', { enemy: enemy.name, amount: actualSpent }), 'info');
                    }
                }

                // Particle Effect for successful block
                // const pixelPos = this.game.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
                // this.game.particleSystem.shieldBlockEffect(pixelPos.x, pixelPos.y); // Moved to event listener

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

                    // Trigger reward selection
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
                    const healed = this.game.hero.healWound(false); // No cost
                    if (healed) {
                        this.game.addLog('Die reinigende Energie heilt eine Wunde!', 'success');
                        this.game.particleSystem.buffEffect(
                            this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r).x,
                            this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r).y,
                            'green'
                        );
                    }
                } else if (currentSite.type === 'keep' || currentSite.type === 'mage_tower' || currentSite.type === 'mine') {
                    currentSite.conquered = true;
                    this.game.addLog(t('combat.siteConquered', { site: currentSite.getName() }), 'success');
                    this.game.statisticsManager.increment('sitesConquered');

                    // Check Victory Condition after every conquest
                    if (this.game.scenarioManager) {
                        const win = this.game.scenarioManager.checkVictory();
                        if (win && win.victory) {
                            // Delay slightly for dramatic effect
                            setTimeout(() => {
                                this.game.showNotification('🎉 ' + win.message, 'success', 10000);
                                this.game.addLog(win.message, 'success');
                                // Could trigger a victory modal here
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
