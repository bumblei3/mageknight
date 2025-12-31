import { StatusEffectManager, EFFECT_TYPES } from './statusEffects.js';
import { BossEnemy } from './enemy.js';
import { COMBAT_PHASES } from './constants.js';

// For backward compatibility
export const COMBAT_PHASE = COMBAT_PHASES;

export class Combat {
    constructor(hero, enemies) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
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
        this.phase = COMBAT_PHASES.RANGED;
        return {
            phase: this.phase,
            enemies: this.enemies,
            message: `Kampf begonnen gegen ${this.enemies.length} Feinde! Fernkampf-Phase.`
        };
    }

    // Ranged phase - player uses ranged/siege attacks
    rangedPhase() {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: 'Nicht in der Fernkampf-Phase' };
        }

        return {
            enemies: this.enemies,
            message: 'Nutze Fernkampf- oder Belagerungsangriffe!'
        };
    }

    // Attempt to defeat enemies with Ranged/Siege Attack
    rangedAttackEnemy(enemy, attackValue, isSiege = false, element = 'physical') {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { success: false, error: 'Nicht in der Fernkampf-Phase' };
        }

        // Check immunities
        if (enemy.fortified && !isSiege) {
            return {
                success: false,
                message: `${enemy.name} ist befestigt! Nur Belagerungsangriffe wirken.`
            };
        }

        const multiplier = enemy.getResistanceMultiplier(element);
        const totalAttack = attackValue; // Use passed value plus unit points
        const unitPoints = isSiege ? this.unitSiegePoints : this.unitRangedPoints;
        const combinedAttack = totalAttack + unitPoints;

        // Handle boss enemies (health-based damage)
        if (enemy.isBoss) {
            const effectiveDamage = Math.floor(combinedAttack * multiplier);
            const damageResult = enemy.takeDamage(effectiveDamage);

            // Consume unit points after use
            if (isSiege) this.unitSiegePoints = 0; else this.unitRangedPoints = 0;

            const result = {
                success: true,
                isBoss: true,
                damage: effectiveDamage,
                consumedPoints: totalAttack, // Amount of passed attackValue used
                healthPercent: damageResult.healthPercent,
                bossTransitions: [],
                message: `${enemy.name} erleidet ${effectiveDamage} Fernkampf-Schaden! (${enemy.currentHealth}/${enemy.maxHealth} HP)`
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
                result.message = `🏆 ${enemy.name} im Fernkampf besiegt! +${enemy.fame} Ruhm!`;
            }

            return result;
        }

        // Handle regular enemies (armor-based defeat)
        const effectiveArmor = enemy.armor / multiplier;

        if (combinedAttack >= effectiveArmor) {
            this.defeatedEnemies.push(enemy);
            this.hero.gainFame(enemy.fame);
            this.enemies = this.enemies.filter(e => e.id !== enemy.id);

            // Consume unit points after use
            if (isSiege) this.unitSiegePoints = 0; else this.unitRangedPoints = 0;

            return {
                success: true,
                defeated: [enemy],
                fameGained: enemy.fame,
                consumedPoints: Math.max(0, effectiveArmor - unitPoints),
                message: `${enemy.name} im Fernkampf besiegt!`
            };
        }

        return {
            success: false,
            message: `Fernkampf zu schwach (${combinedAttack} vs ${effectiveArmor})`
        };
    }

    // End ranged phase and proceed to block
    endRangedPhase() {
        if (this.phase !== COMBAT_PHASES.RANGED) {
            return { error: 'Nicht in der Fernkampf-Phase' };
        }

        // Check if all enemies dead
        if (this.enemies.length === 0) {
            return this.endCombat();
        }

        this.phase = COMBAT_PHASES.BLOCK;
        return {
            phase: this.phase,
            message: 'Block-Phase begonnen.'
        };
    }

    // Block phase - player plays blocks against enemy attacks
    blockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: 'Nicht in der Block-Phase' };
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
            message: `Gesamtschaden: ${this.totalDamage}`
        };
    }

    // Attempt to block an enemy (includes unit contributions)
    blockEnemy(enemy, blockValue) {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { success: false, error: 'Nicht in der Block-Phase' };
        }

        if (this.blockedEnemies.has(enemy.id)) {
            return { success: false, message: 'Feind bereits geblockt' };
        }

        const blockRequired = enemy.getBlockRequirement();
        const totalBlock = blockValue + this.unitBlockPoints;

        if (totalBlock >= blockRequired) {
            this.blockedEnemies.add(enemy.id);

            // Calculate how many unit points were used
            const unitPointsUsed = Math.min(this.unitBlockPoints, blockRequired);
            this.unitBlockPoints -= unitPointsUsed;

            return {
                success: true,
                blocked: true,
                consumedPoints: Math.max(0, blockRequired - unitPointsUsed),
                totalBlock: totalBlock,
                message: `${enemy.name} erfolgreich geblockt! ${enemy.swift ? '(Flink: Doppelter Block nötig)' : ''}`
            };
        }

        return {
            success: true,
            blocked: false,
            totalBlock: totalBlock,
            message: `Block zu schwach (${totalBlock} vs ${blockRequired})`
        };
    }

    // End block phase and move to damage phase
    endBlockPhase() {
        if (this.phase !== COMBAT_PHASES.BLOCK) {
            return { error: 'Nicht in der Block-Phase' };
        }

        this.phase = COMBAT_PHASES.DAMAGE;
        return this.damagePhase();
    }

    // Damage phase - calculate and assign damage
    damagePhase() {
        if (this.phase !== COMBAT_PHASES.DAMAGE) {
            return { error: 'Nicht in der Schadens-Phase' };
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
            message: `${this.woundsReceived} Verletzungen erhalten!`,
            nextPhase: COMBAT_PHASES.ATTACK
        };
    }

    // Attack phase - player attacks enemies
    attackPhase() {
        if (this.phase !== COMBAT_PHASES.ATTACK) {
            return { error: 'Nicht in der Angriffs-Phase' };
        }

        return {
            enemies: this.enemies,
            defeatedEnemies: this.defeatedEnemies,
            message: 'Greife Feinde an!'
        };
    }

    // Activate a unit to contribute to combat
    activateUnit(unit) {
        if (!unit.isReady()) {
            return { success: false, message: 'Einheit nicht bereit' };
        }

        const unitId = unit.id || unit.getName();
        if (this.activatedUnits.has(unitId)) {
            return { success: false, message: 'Einheit bereits aktiviert' };
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
            } else if (this.phase === COMBAT_PHASES.ATTACK && ability.type === 'attack') {
                this.unitAttackPoints += ability.value;
                applied.push(`+${ability.value} Angriff`);
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
            message: `${unit.getName()} aktiviert: ${applied.join(', ')}`
        };
    }

    // Attempt to defeat enemies with attack (includes unit contributions)
    attackEnemies(attackValue, attackElement = 'physical', targetEnemies = null) {
        if (this.phase !== COMBAT_PHASES.ATTACK) {
            return { error: 'Nicht in der Angriffs-Phase' };
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
                result.messages.push(`${regularEnemies.length} Feinde besiegt!`);
                result.success = true;
            } else {
                result.messages.push(`Angriff zu schwach für normale Feinde (${totalAttack} vs ${totalArmor})`);
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

            result.messages.push(`${boss.name} erleidet ${effectiveDamage} Schaden! (${boss.currentHealth}/${boss.maxHealth} HP)`);

            // Check if boss is defeated
            if (damageResult.defeated) {
                this.defeatedEnemies.push(boss);
                this.hero.gainFame(boss.fame);
                result.defeated.push(boss);
                result.fameGained += boss.fame;
                this.enemies = this.enemies.filter(e => e.id !== boss.id);
                result.messages.push(`🏆 ${boss.name} wurde besiegt! +${boss.fame} Ruhm!`);
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
        const names = {
            'red': 'Rot',
            'blue': 'Blau',
            'green': 'Grün',
            'white': 'Weiß'
        };
        return names[color] || color;
    }

    // Calculate critical hit chance
    calculateCriticalHit(baseAttack, critChance = 0.15) {
        if (Math.random() < critChance) {
            return {
                isCrit: true,
                damage: Math.floor(baseAttack * 1.5),
                multiplier: 1.5,
                message: '💥 KRITISCHER TREFFER!'
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
            results.messages.push(`Held erleidet ${heroResult.damage} Schaden durch Statuseffekte!`);
        }

        // Process enemy effects
        const enemyResults = this.statusEffects.processEnemyPhaseStart(this.enemies);
        for (const result of enemyResults) {
            if (result.damage) {
                results.enemyDamage.push({ enemy: result.enemy, damage: result.damage });
                results.messages.push(`${result.enemy.name} erleidet ${result.damage} Schaden!`);
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
            message: allDefeated ? 'Sieg!' : 'Kampf beendet.'
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
