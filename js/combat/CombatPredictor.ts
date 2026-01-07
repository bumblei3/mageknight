import { COMBAT_PHASES } from '../constants';

export interface CombatPrediction {
    expectedWounds: number;
    poisonWounds: number;
    isPoisoned: boolean;
    enemiesDefeated: string[];
    totalEnemyAttack: number;
}

export class CombatPredictor {
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
            totalEnemyAttack: 0
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
            });

            prediction.totalEnemyAttack = predDamage;

            // If we have "floating" block points, we could try to 'auto-assign' them for prediction
            // but for simplicity, let's just show the damage from unblocked enemies.

            const effectiveArmor = Math.max(1, combat.hero.armor || 1);
            prediction.expectedWounds = Math.ceil(predDamage / effectiveArmor);
            prediction.isPoisoned = predIsPoison;
            prediction.poisonWounds = predIsPoison ? prediction.expectedWounds : 0;
        }

        // 2. ATTACK PHASE PREDICTION
        if (combat.phase === COMBAT_PHASES.ATTACK || combat.phase === COMBAT_PHASES.BLOCK || combat.phase === COMBAT_PHASES.RANGED) {
            const combinedAttack = currentAttack + (combat.unitManager?.unitAttackPoints || 0);

            // For now, only predict against the first enemy (main target) or all if simple
            // In MK, you can distribute attack.
            // Simplified prediction: can we defeat the first non-blocked enemy?
            const targetableEnemies = combat.enemies.filter((e: any) => !combat.defeatedEnemies.includes(e));

            targetableEnemies.forEach((enemy: any) => {
                const multiplier = enemy.getResistanceMultiplier('physical');
                const req = enemy.isBoss ? enemy.currentHealth : (enemy.armor / multiplier);

                if (combinedAttack >= req) {
                    prediction.enemiesDefeated.push(enemy.name);
                }
            });
        }

        return prediction;
    }
}
