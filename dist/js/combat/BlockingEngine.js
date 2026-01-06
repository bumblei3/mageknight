import { ATTACK_ELEMENTS } from '../constants.js';
import { logger } from '../logger.js';
import { t } from '../i18n/index.js';

export class BlockingEngine {
    constructor() {
    }

    /**
     * Attempts to block an enemy attack.
     * @param {Object} enemy The enemy being blocked.
     * @param {Object|Array} blockInput The block input provided by the player.
     * @param {number} unitBlockPoints Generic block points from units.
     * @returns {Object} Result object containing success, totalBlock, etc.
     */
    calculateBlock(enemy, blockInput, unitBlockPoints = 0, movementSpent = 0) {
        // Normalize input to array
        let blocks = [];
        let internalMovementSpent = movementSpent;

        if (Array.isArray(blockInput)) {
            blocks = blockInput;
        } else if (typeof blockInput === 'object' && blockInput !== null) {
            if (blockInput.blocks) {
                blocks = blockInput.blocks;
                if (blockInput.movementPoints && !movementSpent) {
                    internalMovementSpent = blockInput.movementPoints;
                }
            } else if (blockInput.value !== undefined) {
                blocks = [blockInput];
                if (blockInput.movementPoints && !movementSpent) {
                    internalMovementSpent = blockInput.movementPoints;
                }
            } else {
                // Fallback for objects that might just be a block source
                blocks = [blockInput];
            }
        } else {
            blocks = [{ value: Number(blockInput) || 0, element: ATTACK_ELEMENTS.PHYSICAL }];
        }

        // Calculate Required Block Power
        let blockRequired = enemy.getBlockRequirement();

        // Cumbersome (Schwerfällig): Reduce attack by spending movement
        if (enemy.cumbersome && internalMovementSpent > 0) {
            blockRequired = Math.max(0, blockRequired - internalMovementSpent);
            logger.debug(`Cumbersome: Reduced block requirement by ${internalMovementSpent} to ${blockRequired}`);
        }
        const enemyElement = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;

        // Calculate block from cards
        let totalEffectiveBlock = 0;
        let totalInputBlock = 0;
        let isInefficient = false;
        const inefficiencyReasons = new Set();

        blocks.forEach(block => {
            const val = block.value || 0;
            const el = block.element || ATTACK_ELEMENTS.PHYSICAL;
            totalInputBlock += val;
            let efficiency = 1.0;

            if (enemyElement === ATTACK_ELEMENTS.FIRE) {
                if (el !== ATTACK_ELEMENTS.ICE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    if (el === ATTACK_ELEMENTS.FIRE) inefficiencyReasons.add('fire_vs_fire');
                    else inefficiencyReasons.add('physical_vs_fire');
                }
            } else if (enemyElement === ATTACK_ELEMENTS.ICE) {
                if (el !== ATTACK_ELEMENTS.FIRE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    if (el === ATTACK_ELEMENTS.ICE) inefficiencyReasons.add('ice_vs_ice');
                    else inefficiencyReasons.add('physical_vs_ice');
                }
            } else if (enemyElement === ATTACK_ELEMENTS.COLD_FIRE) {
                if (el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    if (el === ATTACK_ELEMENTS.FIRE) inefficiencyReasons.add('fire_vs_cold_fire');
                    else if (el === ATTACK_ELEMENTS.ICE) inefficiencyReasons.add('ice_vs_cold_fire');
                    else inefficiencyReasons.add('physical_vs_cold_fire');
                }
            }

            totalEffectiveBlock += Math.floor(val * efficiency);
        });

        // Add Unit Block (assume inefficient against elemental for now)
        let unitEfficiency = 1.0;
        if (enemyElement !== ATTACK_ELEMENTS.PHYSICAL && unitBlockPoints > 0) {
            unitEfficiency = 0.5;
            inefficiencyReasons.add('unit_vs_elemental');
        }

        // Calculate unit contribution
        const unitContribution = Math.floor(unitBlockPoints * unitEfficiency);
        totalEffectiveBlock += unitContribution;

        // Debug log
        logger.debug(`Block vs ${enemy.name} (${enemyElement}): Input total ${totalInputBlock} -> Effective total ${totalEffectiveBlock}. Required: ${blockRequired}`);

        // Format inefficiency reasons
        let limitNote = '';
        if (inefficiencyReasons.size > 0) {
            const reasons = Array.from(inefficiencyReasons).map(r => t(`combat.efficiency.${r}`));
            limitNote = ` (${reasons.join(', ')})`;
        }

        if (totalEffectiveBlock >= blockRequired) {
            // Determine if unit points were needed
            let unitPointsUsed = 0;
            if (unitBlockPoints > 0) {
                const blockWithoutUnits = totalEffectiveBlock - unitContribution;
                if (blockWithoutUnits < blockRequired) {
                    // Units were needed
                    unitPointsUsed = unitBlockPoints; // Consume all provided unit points for simplicity
                }
            }

            return {
                success: true,
                blocked: true,
                totalBlock: totalEffectiveBlock,
                consumedPoints: totalInputBlock,
                unitPointsConsumed: unitPointsUsed,
                isInefficient: isInefficient,
                message: t('combat.blockSuccess', { enemy: enemy.name, note: limitNote })
            };
        }

        return {
            success: true, // The calculation was successful, but the block failed
            blocked: false,
            totalBlock: totalEffectiveBlock,
            consumedPoints: totalInputBlock,
            unitPointsConsumed: 0, // Failed block consumes usage? Usually yes, but here we return false for blocked
            isInefficient: isInefficient,
            message: t('combat.blockWeak', { attack: totalEffectiveBlock, armor: blockRequired, note: limitNote })
        };
    }
}
