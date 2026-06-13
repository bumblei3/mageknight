import { COMBAT_PHASES, ATTACK_ELEMENTS, ACTION_TYPES } from '../constants';

export interface CombatPrediction {
    expectedWounds: number;
    poisonWounds: number;
    isPoisoned: boolean;
    enemiesDefeated: string[];
    totalEnemyAttack: number;
    // Extended predictions
    assassinRestriction: boolean;
    elementalEfficiencyWarnings: string[];
    blockEfficiencyWarnings: string[];
}

export class CombatPredictor {
    /**
     * Calculates block efficiency based on element matching
     */
    private static getBlockEfficiency(attackElement: string, blockElement: string): number {
        if (attackElement === ATTACK_ELEMENTS.FIRE) {
            // Ice and Cold Fire block Fire fully
            if (blockElement === ATTACK_ELEMENTS.ICE || blockElement === ATTACK_ELEMENTS.COLD_FIRE) return 1.0;
            if (blockElement === ATTACK_ELEMENTS.FIRE) return 0.5; // Fire vs Fire = inefficient
            return 0.5; // Physical vs Fire = inefficient
        }
        if (attackElement === ATTACK_ELEMENTS.ICE) {
            // Fire and Cold Fire block Ice fully
            if (blockElement === ATTACK_ELEMENTS.FIRE || blockElement === ATTACK_ELEMENTS.COLD_FIRE) return 1.0;
            if (blockElement === ATTACK_ELEMENTS.ICE) return 0.5; // Ice vs Ice = inefficient
            return 0.5; // Physical vs Ice = inefficient
        }
        if (attackElement === ATTACK_ELEMENTS.COLD_FIRE) {
            // Only Cold Fire blocks Cold Fire fully
            if (blockElement === ATTACK_ELEMENTS.COLD_FIRE) return 1.0;
            return 0.5; // Everything else = inefficient
        }
        if (attackElement === ATTACK_ELEMENTS.PHYSICAL) {
            // Physical blocks Physical fully
            if (blockElement === ATTACK_ELEMENTS.PHYSICAL) return 1.0;
            // Elemental blocks block Physical with penalty
            return 0.5;
        }
        return 1.0; // Holy etc.
    }

    /**
     * Calculates effective block value considering element
     */
    private static getEffectiveBlockValue(value: number, attackElement: string, blockElement: string): number {
        const efficiency = this.getBlockEfficiency(attackElement, blockElement);
        return Math.floor(value * efficiency);
    }

    /**
     * Gets resistance multiplier for an attack element against an enemy
     */
    private static getEnemyResistanceMultiplier(enemy: any, attackElement: string): number {
        if (attackElement === ATTACK_ELEMENTS.FIRE && enemy.fireResist) return 0.5;
        if (attackElement === ATTACK_ELEMENTS.ICE && enemy.iceResist) return 0.5;
        if (attackElement === ATTACK_ELEMENTS.PHYSICAL && enemy.physicalResist) return 0.5;
        if (attackElement === ATTACK_ELEMENTS.COLD_FIRE) {
            // Cold Fire is resisted by Fire OR Ice resistance
            if (enemy.fireResist || enemy.iceResist) return 0.5;
        }
        return 1.0;
    }

    /**
     * Checks if unit has resistance to element
     */
    private static unitHasResistance(unit: any, element: string): boolean {
        const resistances = unit.getResistances ? unit.getResistances() : [];
        if (element === ATTACK_ELEMENTS.FIRE && resistances.includes('fire')) return true;
        if (element === ATTACK_ELEMENTS.ICE && resistances.includes('ice')) return true;
        if (element === ATTACK_ELEMENTS.PHYSICAL && resistances.includes('physical')) return true;
        // Units with Cold Fire resistance would need both fire and ice, but usually units have one or the other
        return false;
    }

    /**
     * Calculates the predicted outcome based on current actions
     * @param {any} combat - The combat instance
     * @param {number} currentAttack - Player's accumulated attack points
     * @param {number} _currentBlock - Player's accumulated block points (not yet assigned)
     * @returns {CombatPrediction | null} Prediction details
     */
    public static getPredictedOutcome(combat: any, currentAttack: number = 0, _currentBlock: number = 0): CombatPrediction | null {
        if (combat.phase === COMBAT_PHASES.COMPLETE) return null;

        const prediction: CombatPrediction = {
            expectedWounds: 0,
            poisonWounds: 0,
            isPoisoned: false,
            enemiesDefeated: [],
            totalEnemyAttack: 0,
            assassinRestriction: false,
            elementalEfficiencyWarnings: [],
            blockEfficiencyWarnings: []
        };

        // 1. BLOCK PHASE PREDICTION
        if (combat.phase === COMBAT_PHASES.BLOCK || combat.phase === COMBAT_PHASES.RANGED) {
            let predDamage = 0;
            let predIsPoison = false;

            combat.enemies.forEach((enemy: any) => {
                // If it's already blocked, it contributes nothing
                if (combat.blockedEnemies.has(enemy.id)) return;

                predDamage += enemy.getEffectiveAttack();
                if (enemy.poison || (enemy.abilities && enemy.abilities.includes('poison'))) {
                    predIsPoison = true;
                }
                if (enemy.assassin && !enemy.damageAssigned) {
                    prediction.assassinRestriction = true;
                }
            });

            prediction.totalEnemyAttack = predDamage;

            // Check for elemental block efficiency warnings from unit blocks
            if (combat.unitManager) {
                const unitBlockSources = combat.unitManager.getBlockSources();
                unitBlockSources.forEach((src: { value: number; element: string }) => {
                    combat.unblockedEnemies?.forEach((enemy: any) => {
                        if (combat.blockedEnemies.has(enemy.id)) return;
                        const enemyElement = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;
                        const efficiency = this.getBlockEfficiency(enemyElement, src.element);
                        if (efficiency < 1.0) {
                            const elementName = this.getElementDisplayName(enemyElement);
                            const blockName = this.getElementDisplayName(src.element);
                            prediction.blockEfficiencyWarnings.push(
                                `${blockName}-Block gegen ${elementName}-Angriff nur 50% wirksam`
                            );
                        }
                    });
                });
            }

            const effectiveArmor = Math.max(1, combat.hero.armor || 1);
            prediction.expectedWounds = Math.ceil(predDamage / effectiveArmor);
            prediction.isPoisoned = predIsPoison;
            prediction.poisonWounds = predIsPoison ? prediction.expectedWounds : 0;
        }

        // 2. ATTACK PHASE PREDICTION
        if (combat.phase === COMBAT_PHASES.ATTACK || combat.phase === COMBAT_PHASES.BLOCK || combat.phase === COMBAT_PHASES.RANGED) {
            const unitAttackSources = combat.unitManager ? combat.unitManager.getAttackSources() : [];
            const unitRangedSources = combat.unitManager ? combat.unitManager.getRangedSources() : [];
            
            // Calculate total attack by element
            const attackByElement: Record<string, number> = {};
            const rangesByElement: Record<string, number> = {};
            
            // Current card attack (assumed physical for simplicity, but could be extended)
            if (currentAttack > 0) {
                attackByElement[ATTACK_ELEMENTS.PHYSICAL] = (attackByElement[ATTACK_ELEMENTS.PHYSICAL] || 0) + currentAttack;
            }

            // Unit attacks
            [...unitAttackSources, ...unitRangedSources].forEach((src: { value: number; element: string }) => {
                const elem = src.element || ATTACK_ELEMENTS.PHYSICAL;
                attackByElement[elem] = (attackByElement[elem] || 0) + src.value;
            });

            // Total attack across all elements
            const combinedAttack = Object.values(attackByElement).reduce((sum, val) => sum + val, 0);

            // For prediction: show which enemies can be defeated
            const targetableEnemies = combat.enemies.filter((e: any) => !combat.defeatedEnemies.includes(e));

            targetableEnemies.forEach((enemy: any) => {
                // Skip already blocked enemies
                if (combat.blockedEnemies.has(enemy.id)) return;

                let canDefeat = false;
                
                // Check each element of our attack against enemy
                Object.entries(attackByElement).forEach(([element, attackValue]) => {
                    if (attackValue <= 0) return;
                    
                    const multiplier = this.getEnemyResistanceMultiplier(enemy, element);
                    const requiredArmor = enemy.isBoss 
                        ? enemy.currentHealth 
                        : (enemy.getCurrentArmor ? enemy.getCurrentArmor(false, true) : enemy.armor) / multiplier;
                    
                    if (attackValue >= requiredArmor) {
                        canDefeat = true;
                    }
                    
                    // Efficiency warning for elemental attack
                    if (multiplier < 1.0) {
                        const elementName = this.getElementDisplayName(element);
                        prediction.elementalEfficiencyWarnings.push(
                            `${elementName}-Angriff gegen ${enemy.name} nur 50% wirksam (Resistenz)`
                        );
                    }
                });

                // Also check if combined attack (if player groups attacks) can defeat
                if (!canDefeat && combinedAttack > 0) {
                    // Simplified: if player can group all attack on this enemy
                    const avgMultiplier = Object.keys(attackByElement).length > 1 ? 0.75 : 1.0; // approximation
                    const requiredArmor = enemy.isBoss 
                        ? enemy.currentHealth 
                        : (enemy.getCurrentArmor ? enemy.getCurrentArmor(false, true) : enemy.armor) / avgMultiplier;
                    if (combinedAttack >= requiredArmor) {
                        canDefeat = true;
                    }
                }

                if (canDefeat) {
                    prediction.enemiesDefeated.push(enemy.name);
                }
            });
        }

        // Helper: get element display name
        const elementNames: Record<string, string> = {
            [ATTACK_ELEMENTS.PHYSICAL]: 'Physisch',
            [ATTACK_ELEMENTS.FIRE]: 'Feuer',
            [ATTACK_ELEMENTS.ICE]: 'Eis',
            [ATTACK_ELEMENTS.COLD_FIRE]: 'Kaltes Feuer',
            [ATTACK_ELEMENTS.HOLY]: 'Heilig'
        };

        // Add unique warnings only
        prediction.elementalEfficiencyWarnings = [...new Set(prediction.elementalEfficiencyWarnings)];
        prediction.blockEfficiencyWarnings = [...new Set(prediction.blockEfficiencyWarnings)];

        return prediction;
    }

    private static getElementDisplayName(element: string): string {
        const names: Record<string, string> = {
            [ATTACK_ELEMENTS.PHYSICAL]: 'Physisch',
            [ATTACK_ELEMENTS.FIRE]: 'Feuer',
            [ATTACK_ELEMENTS.ICE]: 'Eis',
            [ATTACK_ELEMENTS.COLD_FIRE]: 'Kaltes Feuer',
            [ATTACK_ELEMENTS.HOLY]: 'Heilig'
        };
        return names[element] || element;
    }

    /**
     * Pre-combat prediction: predicts outcome BEFORE combat starts
     * Based on hero's current hand, units, mana, and enemy stats
     * @param {any} hero - Hero object
     * @param {any[]} enemies - Array of enemy objects
     * @returns {CombatPrediction | null} Prediction details
     */
    public static getPreCombatPrediction(hero: any, enemies: any[]): CombatPrediction | null {
        if (!hero || !enemies || enemies.length === 0) return null;

        const prediction: CombatPrediction = {
            expectedWounds: 0,
            poisonWounds: 0,
            isPoisoned: false,
            enemiesDefeated: [],
            totalEnemyAttack: 0,
            assassinRestriction: false,
            elementalEfficiencyWarnings: [],
            blockEfficiencyWarnings: []
        };

        // Calculate maximum possible attack from hero's hand
        let maxAttack = 0;
        let maxBlock = 0;
        let hasRanged = false;
        let hasSiege = false;

        // Analyze hand cards for potential
        if (hero.hand) {
            hero.hand.forEach((card: any) => {
                if (card.isWound()) return;
                
                const basicEffect = card.getEffect(false);
                const strongEffect = card.getEffect(true);
                
                // Best case: play card sideways or with mana for strong effect
                const attackValue = Math.max(
                    basicEffect.attack || 0,
                    strongEffect.attack || 0,
                    basicEffect.ranged || 0,
                    strongEffect.ranged || 0,
                    basicEffect.siege || 0,
                    strongEffect.siege || 0
                );
                if (attackValue > 0) maxAttack += attackValue;
                if (strongEffect.ranged || basicEffect.ranged) hasRanged = true;
                if (strongEffect.siege || basicEffect.siege) hasSiege = true;
                
                const blockValue = Math.max(
                    basicEffect.block || 0,
                    strongEffect.block || 0
                );
                if (blockValue > 0) maxBlock += blockValue;
            });
        }

        // Add unit potential
        if (hero.units) {
            hero.units.forEach((unit: any) => {
                if (!unit.isReady()) return;
                
                const abilities = unit.getAbilities();
                abilities.forEach((ability: any) => {
                    if (ability.type === ACTION_TYPES.ATTACK || ability.type === ACTION_TYPES.RANGED || ability.type === ACTION_TYPES.SIEGE) {
                        maxAttack += ability.value;
                        if (ability.type === ACTION_TYPES.RANGED) hasRanged = true;
                        if (ability.type === ACTION_TYPES.SIEGE) hasSiege = true;
                    }
                    if (ability.type === ACTION_TYPES.BLOCK) {
                        maxBlock += ability.value;
                    }
                });
            });
        }

        // 1. PREDICT ENEMY DAMAGE (Block Phase)
        let predDamage = 0;
        let predIsPoison = false;
        let hasAssassin = false;
        
        enemies.forEach((enemy: any) => {
            // Add enemy attack
            predDamage += enemy.getEffectiveAttack();
            
            // Check special abilities
            if (enemy.poison || (enemy.abilities && enemy.abilities.includes('poison'))) {
                predIsPoison = true;
            }
            if (enemy.assassin) {
                hasAssassin = true;
                prediction.assassinRestriction = true;
            }
            if (enemy.fortified && !hasSiege && !hasRanged) {
                prediction.blockEfficiencyWarnings.push(
                    `⚠️ ${enemy.name} ist BEFESTIGT - normaler Fernkampf wirkungslos! (Belagerung nötig)`
                );
            }
            if (enemy.swift) {
                prediction.blockEfficiencyWarnings.push(
                    `⚠️ ${enemy.name} ist FLINK - benötigt doppelt so viel Block!`
                );
            }
        });

        prediction.totalEnemyAttack = predDamage;
        prediction.isPoisoned = predIsPoison;

        const effectiveArmor = Math.max(1, hero.armor || 1);
        prediction.expectedWounds = Math.ceil(predDamage / effectiveArmor);
        prediction.poisonWounds = predIsPoison ? prediction.expectedWounds * 2 : 0; // Poison = double wounds to hero

        // 2. PREDICT ATTACK POTENTIAL
        enemies.forEach((enemy: any) => {
            const attackPower = Math.ceil(maxAttack * 0.8); // Realistic estimate: can't use all cards perfectly
            
            // Check each element
            const multiplier = enemy.getResistanceMultiplier ? enemy.getResistanceMultiplier('physical') : 1.0;
            const requiredArmor = enemy.isBoss 
                ? enemy.maxHealth 
                : Math.ceil((enemy.armor || 0) / multiplier);
            
            if (attackPower >= requiredArmor) {
                prediction.enemiesDefeated.push(enemy.name);
            } else if (attackPower > 0) {
                // Show partial progress
                const progress = Math.min(100, Math.round((attackPower / requiredArmor) * 100));
                prediction.enemiesDefeated.push(`${enemy.name} (${progress}%)`);
            }
        });

        // Efficiency warnings
        if (predIsPoison) {
            prediction.blockEfficiencyWarnings.push('⚠️ GIFT-Fehler: Alle Wunden gehen auf Ablage & doppelte Wunden auf Einheiten!');
        }
        if (hasAssassin) {
            prediction.blockEfficiencyWarnings.push('🗡️ ATTENTÄTER: Schaden KANN NICHT auf Einheiten zugewiesen werden!');
        }

        // Deduplicate warnings
        prediction.elementalEfficiencyWarnings = [...new Set(prediction.elementalEfficiencyWarnings)];
        prediction.blockEfficiencyWarnings = [...new Set(prediction.blockEfficiencyWarnings)];

        return prediction;
    }
}
