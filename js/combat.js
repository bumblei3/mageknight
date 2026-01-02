import { StatusEffectManager } from './statusEffects.js';
// Enemy types imported as needed
import { COMBAT_PHASES, ATTACK_ELEMENTS, ENEMY_DEFINITIONS } from './constants.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';
import { BlockingEngine } from './combat/BlockingEngine.js';
import { DamageSystem } from './combat/DamageSystem.js';

// For backward compatibility
export const COMBAT_PHASE = COMBAT_PHASES;

export class Combat {
    constructor(hero, enemies) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.enemy = this.enemies[0]; // For backward compatibility with CombatOrchestrator
        this.phase = COMBAT_PHASES.NOT_IN_COMBAT;
        this.defeatedEnemies = [];
        this.blockedEnemies = new Set();
        this.totalDamage = 0;
        this.woundsReceived = 0;

        // Status Effects
        this.statusEffects = new StatusEffectManager();

        // Sub-Systems
        this.blockingEngine = new BlockingEngine();
        this.damageSystem = new DamageSystem();

        // Unit contribution tracking
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.unitRangedPoints = 0;
        this.unitSiegePoints = 0;
        this.activatedUnits = new Set(); // Store unit IDs to allow multiple units of same type

        this.summonedEnemies = new Map(); // Track original summoners: summonedId -> originalEnemy
    }

    // Start combat
    start() {
        logger.info(`Combat started against ${this.enemies.length} enemies`);
        this.damageSystem.reset();
        this.phase = COMBAT_PHASES.RANGED;
        return {
            phase: this.phase,
            enemies: this.enemies,
            message: t('combat.message', { count: this.enemies.length }) + ' ' + t('ui.phases.ranged') + '.'
        };
    }

    // Ranged phase - player uses ranged/siege attacks
    rangedPhase() {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: t('ui.phases.ranged') };
        }

        return {
            enemies: this.enemies,
            message: t('combat.phaseRanged') // Or a specific 'how to' key
        };
    }

    // Attempt to defeat enemies with Ranged/Siege Attack
    rangedAttackEnemy(enemy, rangedValue, siegeValue, element = 'physical') {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { success: false, error: t('combat.phaseRanged') };
        }

        // Check immunities
        if (enemy.fortified && siegeValue === 0) {
            return {
                success: false,
                message: t('combat.fortifiedImmunity', { enemy: enemy.name })
            };
        }

        const multiplier = enemy.getResistanceMultiplier(element);

        // Fortified Rule: If fortified, only Siege contributes. If not, both do.
        let combinedAttack = 0;
        if (enemy.fortified) {
            combinedAttack = siegeValue + this.unitSiegePoints;
        } else {
            combinedAttack = rangedValue + siegeValue + this.unitRangedPoints + this.unitSiegePoints;
        }

        // Handle boss enemies (health-based damage)
        if (enemy.isBoss) {
            const effectiveDamage = Math.floor(combinedAttack * multiplier);
            const damageResult = enemy.takeDamage(effectiveDamage);

            // Consume points (Bosses take all available relevant damage)
            let consumedRanged = 0;
            let consumedSiege = 0;

            if (enemy.fortified) {
                consumedSiege = siegeValue;
                this.unitSiegePoints = 0;
            } else {
                consumedRanged = rangedValue;
                consumedSiege = siegeValue;
                this.unitRangedPoints = 0;
                this.unitSiegePoints = 0;
            }

            const result = {
                success: true,
                isBoss: true,
                damage: effectiveDamage,
                consumedRanged,
                consumedSiege,
                healthPercent: damageResult.healthPercent,
                bossTransitions: [],
                message: t('combat.rangedAttack', { enemy: enemy.name, amount: effectiveDamage, current: enemy.currentHealth, max: enemy.maxHealth })
            };

            // Handle phase transitions
            if (damageResult.transitions.length > 0) {
                damageResult.transitions.forEach(transition => {
                    result.bossTransitions.push({
                        boss: enemy,
                        phase: transition.phase,
                        ability: transition.ability,
                        message: transition.message || `${enemy.name} erreicht ${transition.phase}!`
                    });
                });
            }

            // Check if boss is defeated
            if (damageResult.defeated) {
                this.defeatedEnemies.push(enemy);
                this.hero.gainFame(enemy.fame);
                this.enemies = this.enemies.filter(e => e.id !== enemy.id);
                result.defeated = [enemy];
                result.fameGained = enemy.fame;
                result.message = t('combat.bossDefeated', { enemy: enemy.name, amount: enemy.fame });
            }

            return result;
        }

        // Handle regular enemies (armor-based defeat)
        const currentArmor = typeof enemy.getCurrentArmor === 'function' ? enemy.getCurrentArmor() : enemy.armor;
        const effectiveArmor = currentArmor / multiplier;
        logger.debug(`Ranged attack: ${combinedAttack} vs ${effectiveArmor} (Armor: ${enemy.armor}, Multiplier: ${multiplier})`);

        if (combinedAttack >= effectiveArmor) {
            this.defeatedEnemies.push(enemy);
            this.hero.gainFame(enemy.fame);
            this.enemies = this.enemies.filter(e => e.id !== enemy.id);

            // Consume points used
            let consumedRanged = 0;
            let consumedSiege = 0;

            if (enemy.fortified) {
                consumedSiege = Math.max(0, effectiveArmor - this.unitSiegePoints);
                this.unitSiegePoints = 0;
            } else {
                // Greedy consumption: use units first, then siege, then ranged
                let remaining = effectiveArmor;

                // Units first
                const unitTotal = this.unitRangedPoints + this.unitSiegePoints;
                remaining = Math.max(0, remaining - unitTotal);
                this.unitRangedPoints = 0;
                this.unitSiegePoints = 0;

                if (remaining > 0) {
                    const siegeUsed = Math.min(siegeValue, remaining);
                    consumedSiege = siegeUsed;
                    remaining -= siegeUsed;
                }
                if (remaining > 0) {
                    consumedRanged = Math.min(rangedValue, remaining);
                }
            }

            const nameWithFortified = enemy.fortified ? `${enemy.name} (${t('mana.fortified')})` : enemy.name;
            return {
                success: true,
                defeated: [enemy],
                fameGained: enemy.fame,
                consumedRanged,
                consumedSiege,
                message: t('combat.defeatedInCombat', { enemy: nameWithFortified, type: t('ui.phases.ranged') })
            };
        }

        return {
            success: false,
            message: t('combat.rangedWeak', { attack: combinedAttack, armor: effectiveArmor })
        };
    }

    // End ranged phase and proceed to block
    endRangedPhase() {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: t('ui.phases.ranged') };
        }

        // Check if all enemies dead
        if (this.enemies.length === 0) {
            return this.endCombat();
        }

        // Handle Summoning before entering block phase
        this.handleSummoning();

        this.phase = COMBAT_PHASES.BLOCK;
        return {
            phase: this.phase,
            message: t('combat.blockStarted')
        };
    }

    // Handle enemies with summoner ability
    handleSummoning() {
        const summoners = this.enemies.filter(e => e.summoner && !this.defeatedEnemies.includes(e));

        if (summoners.length === 0) return;

        summoners.forEach(summoner => {
            // Draw a random brown token (Orcs/Goblins/etc)
            const brownTokens = Object.keys(ENEMY_DEFINITIONS).filter(key =>
                key === 'orc' || key === 'weakling' || key === 'robber'
            );

            const randomType = brownTokens[Math.floor(Math.random() * brownTokens.length)];
            const definition = ENEMY_DEFINITIONS[randomType];

            const summonedId = `summoned_${summoner.id}_${Date.now()}`;

            let summoned;
            if (summoner.constructor) {
                summoned = new summoner.constructor({
                    ...definition,
                    id: summonedId,
                    summoned: true
                });
            } else {
                summoned = {
                    ...definition,
                    id: summonedId,
                    summoned: true,
                    getEffectiveAttack: () => definition.attack,
                    getBlockRequirement: () => definition.attack,
                    getResistanceMultiplier: () => 1,
                    getCurrentArmor: () => definition.armor
                };
            }

            logger.info(`${summoner.name} beschwört ${summoned.name}!`);

            this.summonedEnemies.set(summoned.id, summoner);

            // Replace summoner with summoned in the active enemies list
            this.enemies = this.enemies.map(e => e.id === summoner.id ? summoned : e);
        });
    }

    // Block phase - player plays blocks against enemy attacks
    blockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        // Calculate total enemy attack (unblocked enemies only)
        this.totalDamage = 0;

        this.enemies.forEach(enemy => {
            if (!this.blockedEnemies.has(enemy.id)) {
                this.totalDamage += enemy.getEffectiveAttack();
            }
        });

        return {
            totalDamage: this.totalDamage,
            blockedEnemies: Array.from(this.blockedEnemies),
            message: t('combat.totalDamage', { amount: this.totalDamage })
        };
    }

    // Attempt to block an enemy
    blockEnemy(enemy, blockInput) {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            console.log('DEBUG: blockEnemy Phase Warning. Current:', this.phase, 'Expected:', COMBAT_PHASES.BLOCK);
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        const result = this.blockingEngine.calculateBlock(enemy, blockInput, this.unitBlockPoints);

        if (result.success && result.blocked) {
            this.blockedEnemies.add(enemy.id);
            // Deduct unit points if used
            if (result.unitPointsConsumed > 0) {
                this.unitBlockPoints = 0; // consumed
            }
        }

        return result;
    }

    // End block phase and move to damage phase
    endBlockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: t('ui.phases.block') };
        }

        this.phase = COMBAT_PHASES.DAMAGE;
        return this.damagePhase();
    }

    // Damage phase - calculate and assign damage
    damagePhase() {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { error: t('ui.phases.combat') };
        }

        // Identify unblocked enemies
        const unblockedEnemies = this.enemies.filter(e => !this.blockedEnemies.has(e.id));

        // Calculate wounds
        const result = this.damageSystem.calculateDamage(this.hero, unblockedEnemies);

        this.totalDamage = result.totalDamage;
        this.woundsReceived = result.woundsReceived;
        this.paralyzeTriggered = result.paralyzeTriggered;

        this.phase = COMBAT_PHASES.ATTACK;

        return {
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            unblockedEnemies,
            paralyzeTriggered: this.paralyzeTriggered,
            message: result.message,
            nextPhase: COMBAT_PHASES.ATTACK
        };
    }

    // Assign damage to a unit from an enemy
    assignDamageToUnit(unit, enemy) {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { success: false, message: t('combat.phaseDamageOnly') };
        }

        return this.damageSystem.assignDamageToUnit(unit, enemy);
    }

    // Attack phase - player attacks enemies
    attackPhase() {
        if (this.phase !== COMBAT_PHASES.ATTACK) {
            return { error: t('ui.phases.attack') };
        }

        return {
            enemies: this.enemies,
            defeatedEnemies: this.defeatedEnemies,
            message: t('ui.phases.attack') // Or a help message
        };
    }

    // Activate a unit to contribute to combat
    activateUnit(unit) {
        if (!unit.isReady()) {
            return { success: false, message: t('combat.unitNotReady') };
        }

        const unitId = unit.id || unit.getName();
        if (this.activatedUnits.has(unitId)) {
            return { success: false, message: t('combat.unitAlreadyActivated') };
        }

        // Activate the unit
        unit.activate();
        this.activatedUnits.add(unitId);

        // Apply unit abilities based on phase
        const abilities = unit.getAbilities();
        let applied = [];

        abilities.forEach(ability => {
            if (this.phase === COMBAT_PHASES.BLOCK && ability.type === 'block') {
                this.unitBlockPoints += ability.value;
                applied.push(`+${ability.value} Block`);
            } else if (this.phase === COMBAT_PHASES.ATTACK) {
                if (ability.type === 'attack') {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff`);
                } else if (ability.type === 'ranged') {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Fernkampf)`);
                } else if (ability.type === 'siege') {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Belagerung)`);
                }
            } else if (this.phase === COMBAT_PHASES.RANGED) {
                if (ability.type === 'ranged') {
                    this.unitRangedPoints += ability.value;
                    applied.push(`+${ability.value} Fernkampf`);
                } else if (ability.type === 'siege') {
                    this.unitSiegePoints += ability.value;
                    applied.push(`+${ability.value} Belagerung`);
                }
            }
        });

        return {
            success: true,
            unit: unit,
            applied: applied.join(', '),
            message: t('combat.unitActivated', { unit: unit.getName(), applied: applied.join(', ') })
        };
    }

    // Attempt to defeat enemies with attack (includes unit contributions)
    attackEnemies(attackValue, attackElement = 'physical', targetEnemies = null) {
        if (this.phase !== COMBAT_PHASES.ATTACK) {
            return { error: t('ui.phases.attack') };
        }

        const targets = targetEnemies || this.enemies;
        const totalAttack = attackValue + this.unitAttackPoints;

        // Split targets into bosses and regular enemies
        const bosses = targets.filter(e => e.isBoss);
        const regularEnemies = targets.filter(e => !e.isBoss);

        const result = {
            success: false,
            defeated: [],
            damaged: [],
            bossTransitions: [],
            fameGained: 0,
            totalAttack: totalAttack,
            unitContribution: this.unitAttackPoints,
            messages: []
        };

        // Handle regular enemies (armor-based defeat)
        if (regularEnemies.length > 0) {
            const totalArmor = regularEnemies.reduce((sum, enemy) => {
                const multiplier = enemy.getResistanceMultiplier(attackElement);
                // Use getCurrentArmor logic (Elusive checks blocked status + attack phase)
                const isBlocked = this.blockedEnemies.has(enemy.id);
                const currentArmor = typeof enemy.getCurrentArmor === 'function' ? enemy.getCurrentArmor(isBlocked, true) : enemy.armor;
                return sum + (currentArmor / multiplier);
            }, 0);

            if (totalAttack >= totalArmor) {
                regularEnemies.forEach(enemy => {
                    this.defeatedEnemies.push(enemy);
                    this.hero.gainFame(enemy.fame);
                    result.defeated.push(enemy);
                    result.fameGained += enemy.fame;
                });
                this.enemies = this.enemies.filter(e => !regularEnemies.includes(e));
                result.messages.push(t('combat.enemiesDefeated', { count: regularEnemies.length }));
                result.success = true;
            } else {
                result.messages.push(t('combat.attackWeak', { attack: totalAttack, armor: totalArmor }));
            }
        }

        // Handle bosses (health-based damage)
        bosses.forEach(boss => {
            const multiplier = boss.getResistanceMultiplier(attackElement);
            const effectiveDamage = Math.floor(totalAttack * multiplier);

            const damageResult = boss.takeDamage(effectiveDamage);
            result.damaged.push({
                boss: boss,
                damage: effectiveDamage,
                healthPercent: damageResult.healthPercent
            });

            // Handle phase transitions
            if (damageResult.transitions.length > 0) {
                damageResult.transitions.forEach(transition => {
                    result.bossTransitions.push({
                        boss: boss,
                        phase: transition.phase,
                        ability: transition.ability,
                        message: transition.message || `${boss.name} erreicht ${transition.phase}!`
                    });

                    // Execute phase ability if exists
                    if (transition.ability && transition.ability !== 'enrage') {
                        const abilityResult = boss.executePhaseAbility(transition.ability);
                        if (abilityResult) {
                            result.bossTransitions.push({
                                boss: boss,
                                abilityResult: abilityResult
                            });
                        }
                    }
                });
            }

            result.messages.push(t('combat.bossDamaged', { enemy: boss.name, amount: effectiveDamage, current: boss.currentHealth, max: boss.maxHealth }));

            // Check if boss is defeated
            if (damageResult.defeated) {
                this.defeatedEnemies.push(boss);
                this.hero.gainFame(boss.fame);
                result.defeated.push(boss);
                result.fameGained += boss.fame;
                this.enemies = this.enemies.filter(e => e.id !== boss.id);
                result.messages.push(t('combat.bossDefeatedAttack', { enemy: boss.name, amount: boss.fame }));
            }

            result.success = true;
        });

        // Create combined message
        result.message = result.messages.join(' ');

        return result;
    }

    // Combo System - detects and applies bonuses for card combinations
    detectCombo(playedCards) {
        if (!playedCards || playedCards.length < 2) {
            return null;
        }

        // Filter out wound cards
        const validCards = playedCards.filter(c => !c.isWound());
        if (validCards.length < 2) return null;

        const colors = validCards.map(c => c.color);

        // Check for Mono-Color Combo (3+ same color)
        if (this.isMonoColor(colors) && colors.length >= 3) {
            const multiplier = 1 + (colors.length * 0.15); // 15% per card
            return {
                type: 'mono_color',
                color: colors[0],
                multiplier: multiplier,
                message: `${this.getColorName(colors[0]).toUpperCase()} COMBO! x${multiplier.toFixed(2)} Bonus!`
            };
        }

        // Check for Rainbow Combo (all 4 colors)
        if (this.hasAllColors(colors)) {
            return {
                type: 'rainbow',
                multiplier: 2.0,
                message: '🌈 RAINBOW COMBO! Effekt verdoppelt!'
            };
        }

        // Check for Element Synergy (3+ cards with same element)
        const elements = validCards.map(c => c.basicEffect?.element).filter(e => e);
        if (elements.length >= 3 && this.isMonoElement(elements)) {
            return {
                type: 'element_synergy',
                element: elements[0],
                multiplier: 1.5,
                message: `${elements[0].toUpperCase()} SYNERGY! +50% Elementarschaden!`
            };
        }

        return null;
    }

    // Check if all cards are the same color
    isMonoColor(colors) {
        if (colors.length === 0) return false;
        const firstColor = colors[0];
        return colors.every(c => c === firstColor);
    }

    // Check if cards contain all 4 colors
    hasAllColors(colors) {
        const uniqueColors = new Set(colors.filter(c => c !== null));
        return uniqueColors.size >= 4;
    }

    // Check if all elements are the same
    isMonoElement(elements) {
        if (elements.length === 0) return false;
        const firstElement = elements[0];
        return elements.every(e => e === firstElement);
    }

    // Get color name for display
    getColorName(color) {
        return t(`cards.colors.${color}`) || color;
    }

    // Calculate critical hit chance
    calculateCriticalHit(baseAttack, critChance = 0.15) {
        if (Math.random() < critChance) {
            return {
                isCrit: true,
                damage: Math.floor(baseAttack * 1.5),
                multiplier: 1.5,
                message: t('combat.critHit')
            };
        }
        return {
            isCrit: false,
            damage: baseAttack,
            multiplier: 1.0
        };
    }

    // Apply combo bonus to attack value
    applyComboBonus(baseValue, combo) {
        if (!combo) return baseValue;
        return Math.floor(baseValue * combo.multiplier);
    }

    // ============ STATUS EFFECTS ============

    // Apply a status effect to hero
    applyEffectToHero(effectType, source = null) {
        return this.statusEffects.applyToHero(this.hero, effectType, source);
    }

    // Apply a status effect to an enemy
    applyEffectToEnemy(enemy, effectType, source = null) {
        return this.statusEffects.applyToEnemy(enemy, effectType, source);
    }

    // Get all effects on hero
    getHeroEffects() {
        return this.statusEffects.getHeroEffects();
    }

    // Get all effects on an enemy
    getEnemyEffects(enemy) {
        return this.statusEffects.getEnemyEffects(enemy);
    }

    // Process effects at phase start (called by game.js)
    processPhaseEffects() {
        const results = {
            heroDamage: 0,
            enemyDamage: [],
            messages: []
        };

        // Process hero effects
        const heroResult = this.statusEffects.processHeroPhaseStart(this.hero);
        if (heroResult && heroResult.damage) {
            results.heroDamage = heroResult.damage;
            results.messages.push(t('combat.heroStatusDamage', { amount: heroResult.damage }));
        }

        // Process enemy effects
        const enemyResults = this.statusEffects.processEnemyPhaseStart(this.enemies);
        for (const result of enemyResults) {
            if (result.damage) {
                results.enemyDamage.push({ enemy: result.enemy, damage: result.damage });
                results.messages.push(t('combat.enemyStatusDamage', { enemy: result.enemy.name, amount: result.damage }));
            }
        }

        return results;
    }

    // End combat
    endCombat() {
        // Process end-of-combat effects (like Poison)
        const endResult = this.statusEffects.processCombatEnd(this.hero);
        if (endResult.wounds > 0) {
            for (let i = 0; i < endResult.wounds; i++) {
                this.hero.takeWound();
            }
            this.woundsReceived += endResult.wounds;
        }

        // Clear all status effects
        this.statusEffects.clear();

        this.phase = COMBAT_PHASES.COMPLETE;

        const allDefeated = this.enemies.length === 0;
        const result = {
            victory: allDefeated,
            defeatedEnemies: this.defeatedEnemies,
            remainingEnemies: this.enemies,
            woundsReceived: this.woundsReceived,
            fameGained: this.defeatedEnemies.reduce((sum, e) => sum + e.fame, 0),
            poisonWounds: endResult.wounds,
            message: allDefeated ? t('game.victory') : t('combat.combatEnded')
        };

        return result;
    }

    /**
     * Calculates the predicted outcome based on current actions
     * @param {number} currentAttack - Player's accumulated attack points
     * @param {number} currentBlock - Player's accumulated block points (not yet assigned)
     * @returns {Object} Prediction details
     */
    getPredictedOutcome(currentAttack = 0, currentBlock = 0) {
        if (this.phase === COMBAT_PHASES.COMPLETE) return null;

        const prediction = {
            expectedWounds: 0,
            poisonWounds: 0,
            isPoisoned: false,
            enemiesDefeated: [],
            totalEnemyAttack: 0
        };

        // 1. BLOCK PHASE PREDICTION
        if (this.phase === COMBAT_PHASES.BLOCK || this.phase === COMBAT_PHASES.RANGED) {
            let predDamage = 0;
            let predIsPoison = false;

            this.enemies.forEach(enemy => {
                // If it's already blocked, it contributes nothing
                if (this.blockedEnemies.has(enemy.id)) return;

                predDamage += enemy.getEffectiveAttack();
                if (enemy.poison || (enemy.abilities && enemy.abilities.includes('poison'))) {
                    predIsPoison = true;
                }
            });

            prediction.totalEnemyAttack = predDamage;

            // If we have "floating" block points, we could try to 'auto-assign' them for prediction
            // but for simplicity, let's just show the damage from unblocked enemies.

            const effectiveArmor = Math.max(1, this.hero.armor || 1);
            prediction.expectedWounds = Math.ceil(predDamage / effectiveArmor);
            prediction.isPoisoned = predIsPoison;
            prediction.poisonWounds = predIsPoison ? prediction.expectedWounds : 0;
        }

        // 2. ATTACK PHASE PREDICTION
        if (this.phase === COMBAT_PHASES.ATTACK || this.phase === COMBAT_PHASES.BLOCK || this.phase === COMBAT_PHASES.RANGED) {
            const combinedAttack = currentAttack + this.unitAttackPoints;

            // For now, only predict against the first enemy (main target) or all if simple
            // In MK, you can distribute attack. 
            // Simplified prediction: can we defeat the first non-blocked enemy?
            const targetableEnemies = this.enemies.filter(e => !this.defeatedEnemies.includes(e));

            targetableEnemies.forEach(enemy => {
                const multiplier = enemy.getResistanceMultiplier('physical');
                const req = enemy.isBoss ? enemy.currentHealth : (enemy.armor / multiplier);

                if (combinedAttack >= req) {
                    prediction.enemiesDefeated.push(enemy.name);
                }
            });
        }

        return prediction;
    }

    // Check if combat is complete
    isComplete() {
        return this.phase === COMBAT_PHASES.COMPLETE;
    }

    // Get current combat state
    getState() {
        return {
            phase: this.phase,
            enemies: this.enemies,
            defeatedEnemies: this.defeatedEnemies,
            blockedEnemies: Array.from(this.blockedEnemies),
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived
        };
    }
}

export default Combat;
