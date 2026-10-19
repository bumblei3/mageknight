import { Combat } from '../combat';
import { eventBus } from '../eventBus';
import { GAME_EVENTS, COMBAT_PHASES } from '../constants';
import { t } from '../i18n/index';
import Enemy, { ENEMY_DEFINITIONS } from '../enemy';
import { Card } from '../card';
import { Unit } from '../unit';

export interface BlockSource {
    value: number;
    element: string;
}

interface CombatResult {
    victory: boolean;
    enemy?: Enemy;
    defeat?: boolean;
}

export interface EnemyData {
    id: string;
    name: string;
    defensive?: boolean;
    position?: { q: number; r: number };
    attack?: number;
    getBlockRequirement?: () => number;
    cumbersome?: boolean;
    [key: string]: unknown;
}

export class CombatOrchestrator {
    private game: any; // TODO: Replace with proper Game interface
    public combatAttackTotal: number;
    public combatBlockTotal: number;
    public activeBlocks: BlockSource[];
    public combatRangedTotal: number;
    public combatSiegeTotal: number;

    constructor(game: any) {
        this.game = game;
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.activeBlocks = [];
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;
    }

    playCardInCombat(index: number, card: Card, useStrong: boolean = false): void {
        if (!this.game.combat || card.isWound()) return;

        if (this.game.actionManager) {
            this.game.actionManager.saveCheckpoint();
        }

        const result = this.game.hero.playCard(index, useStrong, this.game.timeManager.isNight());
        if (!result) return;

        if (this.game.ui && this.game.ui.elements && this.game.ui.elements.playedCards) {
            const rect = this.game.ui.elements.playedCards.getBoundingClientRect();
            if (this.game.particleSystem) {
                this.game.particleSystem.playCardEffect(rect.right - 50, rect.top + 75, result.card.color);
            }
        }

        const phase = this.game.combat.phase;
        if (phase === COMBAT_PHASES.BLOCK && result.effect.block) {
            this.combatBlockTotal += result.effect.block;
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

    renderUnitsInCombat(): void {
        if (!this.game.combat || !this.game.ui) return;
        const units = this.game.hero.units;
        this.game.ui.renderUnitsInCombat(units, this.game.combat.phase, (u: any) => this.activateUnitInCombat(u));
    }

    activateUnitInCombat(unit: Unit): void {
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

    endBlockPhase(): void {
        if (!this.game.combat) return;

        this.game.combat.blockEnemy(this.game.combat.enemy, this.combatBlockTotal);

        if (this.game.actionManager) this.game.actionManager.clearHistory();

        const result = this.game.combat.endBlockPhase();

        if (result.waitingForAssignment) {
            this.game.addLog(result.message, 'info');
            this.combatBlockTotal = 0;
            this.activeBlocks = [];

            this.game.updatePhaseIndicator();
            this.updateCombatInfo();
            this.renderUnitsInCombat();
            return;
        }

        this.handleDamageResults(result);

        this.combatBlockTotal = 0;
        this.activeBlocks = [];
        this.renderUnitsInCombat();
        this.game.updatePhaseIndicator();
        this.game.updateStats();
        this.updateCombatTotals();
    }

    assignDamageToUnit(unit: any): void {
        if (!this.game.combat) return;

        const result = this.game.combat.assignDamageToUnit(unit);

        if (result.success) {
            this.game.addLog(result.message, 'warning');

            if (result.unitDestroyed && this.game.particleSystem) {
                this.game.particleSystem.triggerShake(8, 0.4);
                this.game.particleSystem.freeze(0.1);
                if (this.game.haptics) this.game.haptics(80);
            }

            this.updateCombatInfo();
            this.renderUnitsInCombat();
            this.game.updateStats();
        } else {
            this.game.addLog(result.message, 'error');
        }
    }

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

    handleDamageResults(result: any): void {
        if (this.game.hexGrid && this.game.particleSystem) {
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.damageSplatter(heroPixel.x, heroPixel.y, result.woundsReceived);

            const shakeIntensty = Math.min(15, result.woundsReceived * 3);
            this.game.particleSystem.triggerShake(shakeIntensty, 0.4);
            this.game.particleSystem.freeze(0.05);

            this.game.particleSystem.createDamageNumber(heroPixel.x, heroPixel.y - 20, result.woundsReceived, result.woundsReceived > 1);
        }

        eventBus.emit(GAME_EVENTS.COMBAT_DAMAGE, {
            targetPos: this.game.hero.position,
            amount: result.woundsReceived,
            targetType: 'hero'
        });

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

    executeAttackAction(): void {
        if (!this.game.combat) return;

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            // Save checkpoint before ending ranged phase
            if (this.game.actionManager) this.game.actionManager.saveCheckpoint();
            this.endRangedPhase();
            return;
        }

        if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            // Save checkpoint before ending block phase
            if (this.game.actionManager) this.game.actionManager.saveCheckpoint();
            this.endBlockPhase();
            return;
        }

        if (this.game.combat.phase === COMBAT_PHASES.DAMAGE) {
            this.resolveDamagePhase();
            return;
        }

        if (this.game.combat.phase !== COMBAT_PHASES.ATTACK) return;

        if (this.game.actionManager) this.game.actionManager.clearHistory();

        if (this.game.hexGrid && this.game.particleSystem) {
            const pixelPos = this.game.hexGrid.axialToPixel(this.game.combat.enemy.position.q, this.game.combat.enemy.position.r);
            this.game.particleSystem.combatClashEffect(pixelPos.x, pixelPos.y, 'physical');

            if (this.combatAttackTotal > 0) {
                this.game.particleSystem.createDamageNumber(pixelPos.x, pixelPos.y, this.combatAttackTotal, this.combatAttackTotal >= 5);

                if (this.combatAttackTotal >= 4) {
                    this.game.particleSystem.triggerShake(Math.min(10, this.combatAttackTotal), 0.3);
                    this.game.particleSystem.freeze(0.05);
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

        this.onCombatEnd({ victory: attackResult.success, enemy: this.game.combat.enemy });
    }

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

    initiateCombat(enemyOrEnemies: any, onEndCallback?: () => void): void {
        if (this.game.combat) return;
        if (!enemyOrEnemies) return;

        let enemies: any[] = Array.isArray(enemyOrEnemies) ? enemyOrEnemies : [enemyOrEnemies];
        enemies = enemies.filter((e: any) => !!e);
        if (enemies.length === 0) return;

        if (this.game.gameState !== 'playing' && !this.game.isTestEnvironment) return;

        const processedEnemies = enemies.map((enemy: any) => {
            if (enemy.summoner) {
                let summonKey = 'orc';
                const candidates = Object.keys(ENEMY_DEFINITIONS).filter((k: string) => {
                    const def = ENEMY_DEFINITIONS[k];
                    return !def.summoner && !def.fortified && k !== 'weakling';
                });

                if (candidates.length > 0) {
                    summonKey = candidates[Math.floor(Math.random() * candidates.length)];
                }

                const summonDef = ENEMY_DEFINITIONS[summonKey] || ENEMY_DEFINITIONS['orc'];
                const summonedEnemy = new (Enemy as any)({
                    ...summonDef,
                    id: 'summoned_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                });

                this.game.addLog(t('combat.summoning', { summoner: enemy.name, summoned: summonedEnemy.name }), 'warning');
                return summonedEnemy;
            }
            return enemy;
        });

        enemies = processedEnemies;

        // Defensive trait: If any enemy is defensive and at a city/keep site, 
        // nearby defensive enemies join the fight
        const defensiveEnemies = enemies.filter((e: any) => e.defensive);
        if (defensiveEnemies.length > 0 && this.game.hexGrid) {
            const additionalEnemies = this.findDefensiveAllies(defensiveEnemies, enemies);
            if (additionalEnemies.length > 0) {
                enemies.push(...additionalEnemies);
                this.game.addLog(t('combat.defensiveJoin', { count: additionalEnemies.length }), 'warning');
            }
        }

        const names = enemies.map((e: any) => e.name).join(' & ');

        this.game.addLog(t('combat.fightAgainst', { enemy: names }), 'combat');

        this.game.combat = new Combat(this.game.hero, enemies, (result: any) => this.onCombatEnd(result, onEndCallback));
        this.game.combat.start();
        this.game.gameState = 'combat';

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;
        this.activeBlocks = [];

        // Skip empty ranged phase when player has no ranged/siege options
        if (this.shouldAutoSkipRangedPhase()) {
            const skipMsg = t('combat.autoSkipRanged') || 'Keine Fernkampf-Karten — Phase übersprungen';
            this.game.addLog(skipMsg, 'info');
            if (typeof this.game.showToast === 'function') {
                this.game.showToast(skipMsg, 'info');
            }
            const skipResult = this.game.combat.endRangedPhase();
            if (skipResult?.victory) {
                if (this.game.ui) {
                    this.game.ui.showCombatPanel(enemies, this.game.combat.phase, (e: Enemy) => this.handleEnemyClick(e));
                }
                this.onCombatEnd({ victory: true, enemy: this.game.combat.enemy });
                return;
            }
        }

        if (this.game.ui) {
            this.game.ui.showCombatPanel(enemies, this.game.combat.phase, (e: Enemy) => this.handleEnemyClick(e));
        }
        this.updateCombatTotals();
        this.game.updatePhaseIndicator();

        eventBus.emit(GAME_EVENTS.COMBAT_STARTED, { enemies: enemies });
    }

    /**
     * True when the player has no ranged/siege card in hand and no unit ranged source.
     * Used to auto-skip the ranged phase so combat starts where action is possible.
     */
    shouldAutoSkipRangedPhase(): boolean {
        const hand = this.game.hero?.hand || [];
        const hasRangedCard = hand.some((c: any) => {
            if (!c || (typeof c.isWound === 'function' ? c.isWound() : c.isWound)) return false;
            const b = c.basicEffect || {};
            const s = c.strongEffect || {};
            return !!(b.ranged || s.ranged || b.siege || s.siege);
        });
        if (hasRangedCard) return false;

        const units = this.game.hero?.units || [];
        const hasUnitRanged = units.some((u: any) => {
            if (!u || u.isWounded?.() || u.exhausted) return false;
            const abilities = typeof u.getAbilities === 'function' ? u.getAbilities() : u.abilities || [];
            return (abilities as any[]).some(
                (a: any) => a && (a.type === 'ranged' || a.type === 'siege' || a.ranged || a.siege)
            );
        });
        return !hasUnitRanged;
    }

    handleEnemyClick(enemy: Enemy): void {
        if (!this.game.combat) return;

        // Save checkpoint before enemy interaction
        if (this.game.actionManager) this.game.actionManager.saveCheckpoint();

        if (this.game.combat.phase === COMBAT_PHASES.RANGED) {
            this.executeRangedAttack(enemy);
        } else if (this.game.combat.phase === COMBAT_PHASES.BLOCK) {
            // Save checkpoint before block assignment
            if (this.game.actionManager) this.game.actionManager.saveCheckpoint();
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

            this.activeBlocks = [];
            this.combatBlockTotal = 0;

            this.updateCombatInfo();
            this.game.updateStats();
        }
    }

    updateCombatInfo(): void {
        if (!this.game.combat || !this.game.ui) return;
        this.game.ui.updateCombatInfo(this.game.combat.enemies, this.game.combat.phase, (e: any) => this.handleEnemyClick(e));
        this.updateCombatTotals();
    }

    updateCombatTotals(): void {
        if (!this.game.combat || !this.game.ui) return;
        this.game.ui.updateCombatTotals(this.combatAttackTotal, this.combatBlockTotal, this.game.combat.phase);
    }

    onCombatEnd(result: any, siteCallback?: () => void): void {
        this.game.gameState = 'playing';
        const enemy = result.enemy || (this.game.combat ? this.game.combat.enemies[0] : null);
        this.game.combat = null;

        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.activeBlocks = [];
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

        if (result.victory && enemy) {
            this.game.addLog(t('combat.victoryOver', { enemy: enemy.name }), 'success');
            this.game.entityManager.removeEnemy(enemy);

            const fameGained = enemy.fame || 0;
            const levelResult = this.game.hero.gainFame(fameGained);
            if (this.game.statisticsManager) {
                this.game.statisticsManager.increment('enemiesDefeated');
            }

            this.game.addLog(t('combat.fameReward', { amount: fameGained }), 'info');

            if (levelResult && levelResult.leveledUp && this.game.levelUpManager) {
                this.game.levelUpManager.handleLevelUp(levelResult);
            }

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

                    if (this.game.scenarioManager) {
                        const win = this.game.scenarioManager.checkVictory();
                        if (win && win.victory) {
                            setTimeout(() => {
                                this.game.showNotification('🎉 ' + win.message, 'success');
                                this.game.addLog(win.message, 'success');
                                const totalEnemies = this.game.statisticsManager?.getStat?.('enemiesDefeated') ?? 0;
                                const totalSites = this.game.statisticsManager?.getStat?.('sitesConquered') ?? 0;
                                this.game.ui?.showGameOverVictory(win.message, { totalEnemies, totalSites });
                            }, 1000);
                        }
                    }
                }
            }
        } else if (result.defeat && enemy) {
            this.game.addLog(t('combat.defeatAgainst', { enemy: enemy.name }), 'error');
            // Show defeat overlay with combat summary
            const currentSite = this.game.siteManager?.currentSite;
            const siteName = currentSite?.getName?.() ?? 'Unbekannt';
            const defeatMsg = `${t('combat.defeatAgainst', { enemy: enemy.name })} — Dein Held fiel auf ${siteName}.`;
            this.game.ui?.showGameOverDefeat(enemy.name, defeatMsg);
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

        eventBus.emit(GAME_EVENTS.COMBAT_ENDED, { victory: result.victory, enemy: enemy });
        
        // Call site-specific callback if provided
        if (siteCallback) {
            siteCallback();
        }
    }

    executeRangedAttack(enemy: Enemy): void {
        if (!this.game.combat) return;

        // Save checkpoint before ranged attack
        if (this.game.actionManager) this.game.actionManager.saveCheckpoint();

        const attackResult = this.game.combat.rangedAttackEnemy(
            enemy,
            this.combatRangedTotal || 0,
            (this.combatSiegeTotal || 0) + (this.game.hero.hasSkill('siege_mastery') ? 2 : 0)
        );

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

    findDefensiveAllies(defensiveEnemies: EnemyData[], allEnemies: EnemyData[]): EnemyData[] {
        const allies: EnemyData[] = [];
        const processedPositions: Record<string, boolean> = {};

        for (let i = 0; i < defensiveEnemies.length; i++) {
            const enemy = defensiveEnemies[i];
            if (!enemy.position) continue;

            const siteHex = this.game.hexGrid.getHex(enemy.position.q, enemy.position.r);
            if (!siteHex || !siteHex.site) continue;
            
            const siteType = siteHex.site.type;
            if (siteType !== 'city' && siteType !== 'keep') continue;

            const neighbors = this.game.hexGrid.getNeighbors(enemy.position.q, enemy.position.r);
            
            for (let j = 0; j < neighbors.length; j++) {
                const neighbor = neighbors[j];
                const key = neighbor.q + ',' + neighbor.r;
                if (processedPositions[key]) continue;

                const neighborHex = this.game.hexGrid.getHex(neighbor.q, neighbor.r);
                if (!neighborHex || !neighborHex.site) continue;
                
                const neighborSiteType = neighborHex.site.type;
                if (neighborSiteType !== 'city' && neighborSiteType !== 'keep') continue;

                const allyEnemy = this.game.entityManager.getEnemyAt(neighbor.q, neighbor.r);
                if (allyEnemy && allyEnemy.defensive) {
                    let alreadyInCombat = false;
                    for (let k = 0; k < allEnemies.length; k++) {
                        if (allEnemies[k].id === allyEnemy.id) {
                            alreadyInCombat = true;
                            break;
                        }
                    }
                    if (!alreadyInCombat) {
                        allies.push(allyEnemy);
                        processedPositions[key] = true;
                    }
                }
            }
        }

        return allies;
    }
}