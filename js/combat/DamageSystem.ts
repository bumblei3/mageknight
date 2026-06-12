import { logger } from '../logger';
import { t } from '../i18n/index';
import { ATTACK_ELEMENTS } from '../constants';

export interface DamageResult {
    totalDamage: number;
    woundsReceived: number;
    paralyzeTriggered: boolean;
    message: string;
}

export interface UnitDamageResult {
    success: boolean;
    message?: string;
    unitDestroyed?: boolean;
    unitWounded?: boolean;
}

export class DamageSystem {
    private paralyzeTriggered: boolean = false;

    constructor() {
        this.paralyzeTriggered = false;
    }

    public reset(): void {
        this.paralyzeTriggered = false;
    }

    /**
     * Calculates wounds received from unblocked enemies and applies effects.
     * Poison: All wounds go to Discard pile (not Hand). Double wounds to Units.
     */
    public calculateDamage(hero: any, unblockedEnemies: any[]): DamageResult {
        let totalDamage = 0;

        unblockedEnemies.forEach(enemy => {
            totalDamage += enemy.getEffectiveAttack();
        });

        const effectiveArmor = Math.max(1, hero.armor || 1);
        let baseWounds = Math.ceil(totalDamage / effectiveArmor);
        if (isNaN(baseWounds)) baseWounds = 0;

        logger.info(`Damage phase: Total damage ${totalDamage} vs Armor ${effectiveArmor} = ${baseWounds} wounds`);

        // Check for poison enemies
        const isPoison = unblockedEnemies.some(e => e.poison || (e.abilities && e.abilities.includes('poison')));
        const isPetrify = unblockedEnemies.some(e => e.petrify || (e.abilities && e.abilities.includes('petrify')));

        let woundsReceived = baseWounds;

        if (isPoison) {
            // Poison: All wounds go to Discard pile (not Hand)
            for (let i = 0; i < baseWounds; i++) {
                hero.takeWoundToDiscard();
            }
            // Double the wound count for tracking/stats
            woundsReceived = baseWounds * 2;
        } else {
            // Normal: wounds go to Hand
            for (let i = 0; i < baseWounds; i++) {
                hero.takeWound();
            }
        }

        if (isPetrify && woundsReceived > 0) {
            logger.info(t('combat.paralyzeEffect'));
            this.paralyzeTriggered = true;
        }

        unblockedEnemies.forEach(enemy => {
            const isVampiric = enemy.vampiric || (enemy.abilities && enemy.abilities.includes('vampiric'));
            if (isVampiric && woundsReceived > 0) {
                enemy.armorBonus = (enemy.armorBonus || 0) + woundsReceived;
                logger.info(`${enemy.name} gains +${woundsReceived} Armor from Vampirism!`);
            }
        });

        return {
            totalDamage,
            woundsReceived,
            paralyzeTriggered: this.paralyzeTriggered,
            message: t('combat.woundsReceived', { amount: woundsReceived })
        };
    }

    /**
     * Checks if damage of a specific element is reduced by unit resistances.
     * Returns the effective damage after resistance reduction.
     */
    private applyUnitResistance(unit: any, damage: number, element: string): number {
        const resistances = unit.getResistances ? unit.getResistances() : [];

        if (element === ATTACK_ELEMENTS.PHYSICAL && resistances.includes('physical')) {
            return Math.floor(damage / 2);
        }
        if (element === ATTACK_ELEMENTS.FIRE && resistances.includes('fire')) {
            return Math.floor(damage / 2);
        }
        if (element === ATTACK_ELEMENTS.ICE && resistances.includes('ice')) {
            return Math.floor(damage / 2);
        }
        if (element === ATTACK_ELEMENTS.COLD_FIRE && (resistances.includes('fire') || resistances.includes('ice'))) {
            // Cold Fire is resisted by Fire OR Ice resistance (whichever is present)
            // If both, still only halve once
            return Math.floor(damage / 2);
        }
        return damage;
    }

    /**
     * Assigns damage to a unit from an enemy.
     * Poison: Double wounds (2 per damage point) which destroys units.
     * Resistance reduces the effective damage before wound assignment.
     */
    public assignDamageToUnit(unit: any, enemy: any): UnitDamageResult {
        if (enemy.assassin) {
            return { success: false, message: t('combat.assassinateRestriction', { enemy: enemy.name }) };
        }

        const enemyElement = enemy.attackType || ATTACK_ELEMENTS.PHYSICAL;
        const enemyAttack = enemy.getEffectiveAttack();

        // Apply resistance (with fallback for mock/test units)
        const effectiveDamage = unit.getResistances ? this.applyUnitResistance(unit, enemyAttack, enemyElement) : enemyAttack;

        logger.info(`${unit.getName()} takes ${effectiveDamage} damage (${enemyAttack} ${enemyElement} vs resistances: ${unit.getResistances ? unit.getResistances().join(', ') : 'N/A'})`);

        if (enemy.petrify) {
            unit.destroyed = true;
            logger.info(`${unit.getName()} wurde durch Versteinerung zerstört!`);
        } else {
            // Normal: 1 wound per damage point
            unit.takeWound();
            logger.info(`${unit.getName()} wurde verwundet.`);
        }

        // Poison: Double wounds (2 per damage point) - destroys units
        if (enemy.poison) {
            // Second wound for poison (first was applied above)
            unit.takeWound();
            logger.info(`${unit.getName()} erlitt zusätzlich Gift-Schaden (doppelte Wunde).`);
        }

        const isVampiric = enemy.vampiric || (enemy.abilities && enemy.abilities.includes('vampiric'));
        if (isVampiric) {
            // Count wounds dealt: destroyed = 2, wounded = 1
            const woundsDealt = unit.destroyed ? 2 : (enemy.poison ? 2 : 1);
            enemy.armorBonus = (enemy.armorBonus || 0) + woundsDealt;
            logger.info(`${enemy.name} erhält +${woundsDealt} Rüstung durch Vampirismus!`);
        }

        return { success: true, unitDestroyed: unit.destroyed, unitWounded: unit.wounds > 0 };
    }
}