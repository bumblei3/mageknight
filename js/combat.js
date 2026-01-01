import { StatusEffectManager } from './statusEffects.js';
// Enemy types imported as needed
import { COMBAT_PHASES, ATTACK_ELEMENTS } from './constants.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';

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

        // Unit contribution tracking
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.unitRangedPoints = 0;
        this.unitSiegePoints = 0;
        this.activatedUnits = new Set(); // Store unit IDs to allow multiple units of same type
    }

    // Start combat
    start() {
        logger.info(`Combat started against ${this.enemies.length} enemies`);
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
        const effectiveArmor = enemy.armor / multiplier;
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

        this.phase = COMBAT_PHASES.BLOCK;
        return {
            phase: this.phase,
            message: t('combat.blockStarted')
        };
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
    // blockValue can be a number (backward compat) or { value: number, element: string }
    blockEnemy(enemy, blockInput) {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        // Normalize input to array
        let blocks = [];
        if (Array.isArray(blockInput)) {
            blocks = blockInput;
        } else if (typeof blockInput === 'object' && blockInput !== null) {
            blocks = [blockInput];
        } else {
            blocks = [{ value: Number(blockInput) || 0, element: ATTACK_ELEMENTS.PHYSICAL }];
        }

        // Add unit block points
        // NOTE: Unit block points are currently generic. 
        // Improvement: Units should contribute specific elements too.
        // For now, assume unit block adapts or is physical? 
        // Let's assume Unit Block is PHYSICAL unless specified.
        // We add it to the 'Physical' pool for calculation.

        // Calculate Required Block Power
        const blockRequired = enemy.getBlockRequirement();
        const enemyElement = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;

        // Calculate block from cards
        let totalEffectiveBlock = 0;
        let totalInputBlock = 0;
        let isInefficient = false;

        blocks.forEach(block => {
            const val = block.value || 0;
            const el = block.element || ATTACK_ELEMENTS.PHYSICAL;
            totalInputBlock += val; // Accumulate input value
            let efficiency = 1.0;

            if (enemyElement === ATTACK_ELEMENTS.FIRE) {
                if (el !== ATTACK_ELEMENTS.ICE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                }
            } else if (enemyElement === ATTACK_ELEMENTS.ICE) {
                if (el !== ATTACK_ELEMENTS.FIRE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                }
            } else if (enemyElement === ATTACK_ELEMENTS.COLD_FIRE) {
                if (el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                }
            }

            totalEffectiveBlock += Math.floor(val * efficiency);
        });

        // Add Unit Block (assume inefficient against elemental for now)
        let unitEfficiency = 1.0;
        if (enemyElement !== ATTACK_ELEMENTS.PHYSICAL) {
            unitEfficiency = 0.5;
        }
        totalEffectiveBlock += Math.floor(this.unitBlockPoints * unitEfficiency);

        // Debug log
        logger.debug(`Block vs ${enemy.name} (${enemyElement}): Input total ${totalInputBlock} -> Effective total ${totalEffectiveBlock}. Required: ${blockRequired}`);

        if (totalEffectiveBlock >= blockRequired) {
            this.blockedEnemies.add(enemy.id);

            // Calculate consumption (this is tricky with efficiency).
            // Simplified: All input is consumed if successful. 
            // Or try to spare unit points?
            // Let's consume all Unit Points used to bridge the gap?
            // Let's just reset generic unit block points if used.
            if (this.unitBlockPoints > 0) {
                const blockWithoutUnits = totalEffectiveBlock - Math.floor(this.unitBlockPoints * unitEfficiency);
                if (blockWithoutUnits < blockRequired) {
                    this.unitBlockPoints = 0;
                }
            }

            return {
                success: true,
                blocked: true,
                totalBlock: totalEffectiveBlock,
                consumedPoints: totalInputBlock,
                isInefficient: isInefficient,
                message: t('combat.blockSuccess', { enemy: enemy.name, note: isInefficient ? t('combat.blockInefficient') : '' })
            };
        }

        return {
            success: true,
            blocked: false,
            totalBlock: totalEffectiveBlock,
            consumedPoints: totalInputBlock,
            isInefficient: isInefficient,
            message: t('combat.blockWeak', { attack: totalEffectiveBlock, armor: blockRequired, note: isInefficient ? t('combat.weakInefficient') : '' })
        };
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
            return { error: t('ui.phases.combat') }; // Schadensphase matches combat phase indicator
        }

        // Recalculate damage from unblocked enemies
        this.totalDamage = 0;
        const unblockedEnemies = [];

        this.enemies.forEach(enemy => {
            if (!this.blockedEnemies.has(enemy.id)) {
                this.totalDamage += enemy.getEffectiveAttack();
                unblockedEnemies.push(enemy);
            }
        });

        // Calculate wounds (damage / hero armor, rounded up)
        const effectiveArmor = Math.max(1, this.hero.armor || 1);
        this.woundsReceived = Math.ceil(this.totalDamage / effectiveArmor);
        logger.info(`Damage phase: Total damage ${this.totalDamage} vs Armor ${effectiveArmor} = ${this.woundsReceived} wounds`);
        if (isNaN(this.woundsReceived)) this.woundsReceived = 0;

        // Apply wounds to hero
        for (let i = 0; i < this.woundsReceived; i++) {
            this.hero.takeWound();
        }

        // Apply Special Abilities
        // Apply Special Abilities Logic

        // Check for Poison (if any unblocked enemy has poison, the whole attack is poisonous)
        const isPoison = unblockedEnemies.some(e => e.poison || (e.abilities && e.abilities.includes('poison')));

        if (isPoison) {
            // Poison deals equal amount of wounds to Discard
            const poisonWounds = this.woundsReceived;
            for (let i = 0; i < poisonWounds; i++) {
                this.hero.takeWoundToDiscard();
            }
            this.woundsReceived += poisonWounds; // Track total wounds received
        }

        unblockedEnemies.forEach(enemy => {
            // Vampiric: Heals enemy if they deal damage
            // Note: Vampiric usually heals if attack is unblocked (damage dealt)
            if (enemy.abilities && enemy.abilities.includes('vampiric')) {
                if (enemy.currentHealth < enemy.maxHealth) {
                    enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + 1);
                }
            }
        });

        this.phase = COMBAT_PHASES.ATTACK;

        return {
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            unblockedEnemies,
            message: t('combat.woundsReceived', { amount: this.woundsReceived }),
            nextPhase: COMBAT_PHASES.ATTACK
        };
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
                return sum + (enemy.armor / multiplier);
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
