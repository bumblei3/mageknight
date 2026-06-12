import { ATTACK_ELEMENTS } from '../constants';
import { logger } from '../logger';
import { t } from '../i18n/index';

export interface BlockSource {
    value: number;
    element: string;
}

export interface BlockResult {
    success: boolean;
    blocked: boolean;
    totalBlock: number;
    consumedPoints: number;
    unitPointsConsumed: number;
    isInefficient: boolean;
    message: string;
}

export class BlockingEngine {
    constructor() {
    }

    public calculateBlock(enemy: any, blockInput: BlockSource | BlockSource[] | any, unitBlockSources: BlockSource[] = [], movementSpent: number = 0): BlockResult {
        let cardBlocks: BlockSource[] = [];
        let internalMovementSpent = movementSpent;

        if (Array.isArray(blockInput)) {
            cardBlocks = blockInput;
        } else if (typeof blockInput === 'object' && blockInput !== null) {
            if (blockInput.blocks) {
                cardBlocks = blockInput.blocks;
                if (blockInput.movementPoints && !movementSpent) {
                    internalMovementSpent = blockInput.movementPoints;
                }
            } else if (blockInput.value !== undefined) {
                cardBlocks = [blockInput];
                if (blockInput.movementPoints && !movementSpent) {
                    internalMovementSpent = blockInput.movementPoints;
                }
            } else {
                cardBlocks = [blockInput];
            }
        } else {
            cardBlocks = [{ value: Number(blockInput) || 0, element: ATTACK_ELEMENTS.PHYSICAL }];
        }

        let blockRequired = enemy.getBlockRequirement();

        if (enemy.cumbersome && internalMovementSpent > 0) {
            blockRequired = Math.max(0, blockRequired - internalMovementSpent);
            logger.debug(`Cumbersome: Reduced block requirement by ${internalMovementSpent} to ${blockRequired}`);
        }
        const enemyElement = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;

        let totalEffectiveBlock = 0;
        let totalInputBlock = 0;
        let isInefficient = false;
        const inefficiencyReasons = new Set<string>();

        cardBlocks.forEach(block => {
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

        let unitContribution = 0;
        unitBlockSources.forEach(block => {
            const val = block.value || 0;
            const el = block.element || ATTACK_ELEMENTS.PHYSICAL;
            let efficiency = 1.0;

            if (enemyElement === ATTACK_ELEMENTS.FIRE) {
                if (el !== ATTACK_ELEMENTS.ICE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    if (el === ATTACK_ELEMENTS.FIRE) inefficiencyReasons.add('unit_fire_vs_fire');
                    else inefficiencyReasons.add('unit_vs_elemental');
                }
            } else if (enemyElement === ATTACK_ELEMENTS.ICE) {
                if (el !== ATTACK_ELEMENTS.FIRE && el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    if (el === ATTACK_ELEMENTS.ICE) inefficiencyReasons.add('unit_ice_vs_ice');
                    else inefficiencyReasons.add('unit_vs_elemental');
                }
            } else if (enemyElement === ATTACK_ELEMENTS.COLD_FIRE) {
                if (el !== ATTACK_ELEMENTS.COLD_FIRE) {
                    efficiency = 0.5;
                    isInefficient = true;
                    inefficiencyReasons.add('unit_vs_cold_fire');
                }
            }

            const effectiveVal = Math.floor(val * efficiency);
            unitContribution += effectiveVal;
        });

        totalEffectiveBlock += unitContribution;

        logger.debug(`Block vs ${enemy.name} (${enemyElement}): Card input ${totalInputBlock} + Unit input ${unitBlockSources.reduce((s, b) => s + b.value, 0)} -> Effective total ${totalEffectiveBlock}. Required: ${blockRequired}`);

        let limitNote = '';
        if (inefficiencyReasons.size > 0) {
            const reasons = Array.from(inefficiencyReasons).map(r => t(`combat.efficiency.${r}`));
            limitNote = ` (${reasons.join(', ')})`;
        }

        if (totalEffectiveBlock >= blockRequired) {
            let unitPointsUsed = 0;
            if (unitBlockSources.length > 0) {
                const cardOnlyBlock = cardBlocks.reduce((sum, b) => {
                    const el = b.element || ATTACK_ELEMENTS.PHYSICAL;
                    let eff = 1.0;
                    const enemyEl = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;
                    if (enemyEl === ATTACK_ELEMENTS.FIRE && el !== ATTACK_ELEMENTS.ICE && el !== ATTACK_ELEMENTS.COLD_FIRE) eff = 0.5;
                    else if (enemyEl === ATTACK_ELEMENTS.ICE && el !== ATTACK_ELEMENTS.FIRE && el !== ATTACK_ELEMENTS.COLD_FIRE) eff = 0.5;
                    else if (enemyEl === ATTACK_ELEMENTS.COLD_FIRE && el !== ATTACK_ELEMENTS.COLD_FIRE) eff = 0.5;
                    return sum + Math.floor(b.value * eff);
                }, 0);

                if (cardOnlyBlock < blockRequired) {
                    unitPointsUsed = unitBlockSources.reduce((s, b) => s + b.value, 0);
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
            success: true,
            blocked: false,
            totalBlock: totalEffectiveBlock,
            consumedPoints: totalInputBlock,
            unitPointsConsumed: 0,
            isInefficient: isInefficient,
            message: t('combat.blockWeak', { attack: totalEffectiveBlock, armor: blockRequired, note: limitNote })
        };
    }
}
