import { StatusEffectManager } from './statusEffects.js';
// Enemy types imported as needed
import { COMBAT_PHASES, ATTACK_ELEMENTS, ENEMY_DEFINITIONS, ACTION_TYPES } from './constants.js';
import { logger } from './logger.js';
import { t } from './i18n/index.js';
import { BlockingEngine } from './combat/BlockingEngine.js';
import { DamageSystem } from './combat/DamageSystem.js';
import { CombatCombos } from './combat/CombatCombos.js';
import { CombatPredictor } from './combat/CombatPredictor.js';

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
    blockEnemy(enemy, blockInput, movementPoints = 0) {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            console.log('DEBUG: blockEnemy Phase Warning. Current:', this.phase, 'Expected:', COMBAT_PHASES.BLOCK);
            return { success: false, error: t('ui.phases.block') };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: t('combat.alreadyBlocked') };
        }

        const result = this.blockingEngine.calculateBlock(enemy, blockInput, this.unitBlockPoints, movementPoints);

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

    /**
     * Handles the discard effect for Paralyze.
     * Should be called when paralyzeTriggered is true.
     */
    handleParalyzeEffect() {
        if (!this.paralyzeTriggered) return 0;

        // Count wounds received to determine how many cards to discard
        const discarded = this.hero.discardNonWoundCards(this.woundsReceived);
        this.paralyzeTriggered = false; // Reset after handling
        return discarded;
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
            if (this.phase === COMBAT_PHASES.BLOCK && ability.type === ACTION_TYPES.BLOCK) {
                this.unitBlockPoints += ability.value;
                applied.push(`+${ability.value} Block`);
            } else if (this.phase === COMBAT_PHASES.ATTACK) {
                if (ability.type === ACTION_TYPES.ATTACK) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff`);
                } else if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Fernkampf)`);
                } else if (ability.type === ACTION_TYPES.SIEGE) {
                    this.unitAttackPoints += ability.value;
                    applied.push(`+${ability.value} Angriff (aus Belagerung)`);
                }
            } else if (this.phase === COMBAT_PHASES.RANGED) {
                if (ability.type === ACTION_TYPES.RANGED) {
                    this.unitRangedPoints += ability.value;
                    applied.push(`+${ability.value} Fernkampf`);
                } else if (ability.type === ACTION_TYPES.SIEGE) {
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

    // Combo System - delegated to CombatCombos
    detectCombo(playedCards) {
        return CombatCombos.detectCombo(playedCards);
    }

    // Helper delegations for backward compatibility if needed, else remove
    calculateCriticalHit(baseAttack, critChance = 0.15) {
        return CombatCombos.calculateCriticalHit(baseAttack, critChance);
    }

    applyComboBonus(baseValue, combo) {
        return CombatCombos.applyComboBonus(baseValue, combo);
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
        return CombatPredictor.getPredictedOutcome(this, currentAttack, currentBlock);
    }

    // Check if combat is complete
    isComplete() {
        return this.phase === COMBAT_PHASES.COMPLETE;
    }

    // Get current combat state
    getState() {
        return {
            phase: this.phase,
            enemies: this.enemies.map(e => e.getState()), // Save full enemy state (health etc)
            defeatedEnemies: this.defeatedEnemies,
            blockedEnemies: Array.from(this.blockedEnemies),
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            unitAttackPoints: this.unitAttackPoints,
            unitBlockPoints: this.unitBlockPoints,
            unitRangedPoints: this.unitRangedPoints,
            unitSiegePoints: this.unitSiegePoints,
            activatedUnits: Array.from(this.activatedUnits)
        };
    }

    // Load state
    loadState(state) {
        if (!state) return;
        this.phase = state.phase;
        // Restore enemies (find by ID or reconstruct?)
        // Reconstructing might lose references if UI holds them.
        // Better: Update existing enemy instances if possible, or replace.
        // For Undo, replacing is safer to ensure exact state match.
        this.enemies = state.enemies.map(eState => {
            // We need to re-instantiate correct class (Enemy vs BossEnemy)
            // But we don't have easy access to factory here.
            // However, we can just assume basic Enemy functionality or try to find matching enemy in current this.enemies if IDs match?
            // Undo usually happens immediately, so this.enemies likely contains the same objects.
            const existing = this.enemies.find(e => e.id === eState.id);
            if (existing) {
                existing.loadState(eState);
                return existing;
            }
            // Fallback: This is tricky without factories.
            // For now, assume enemies array structure hasn't changed drastically (Undo only steps back).
            return eState; // This might be raw data, need real objects?
            // Actually, for Undo we typically clone deep.
            // Let's assume for now we just restore the properties we care about.
        });

        this.defeatedEnemies = state.defeatedEnemies;
        this.blockedEnemies = new Set(state.blockedEnemies);
        this.totalDamage = state.totalDamage;
        this.woundsReceived = state.woundsReceived;
        this.unitAttackPoints = state.unitAttackPoints || 0;
        this.unitBlockPoints = state.unitBlockPoints || 0;
        this.unitRangedPoints = state.unitRangedPoints || 0;
        this.unitSiegePoints = state.unitSiegePoints || 0;
        this.activatedUnits = new Set(state.activatedUnits || []);
    }
}

export default Combat;
