import { logger } from '../logger';
import { t } from '../i18n/index';

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
     * @param {any} hero The hero taking damage.
     * @param {any[]} unblockedEnemies List of enemies that were not blocked.
     * @returns {DamageResult} Result object.
     */
    public calculateDamage(hero: any, unblockedEnemies: any[]): DamageResult {
        let totalDamage = 0;

        unblockedEnemies.forEach(enemy => {
            totalDamage += enemy.getEffectiveAttack();
        });

        // Calculate wounds (damage / hero armor, rounded up)
        const effectiveArmor = Math.max(1, hero.armor || 1);
        let woundsReceived = Math.ceil(totalDamage / effectiveArmor);
        if (isNaN(woundsReceived)) woundsReceived = 0;

        logger.info(`Damage phase: Total damage ${totalDamage} vs Armor ${effectiveArmor} = ${woundsReceived} wounds`);

        // Apply wounds to hero
        for (let i = 0; i < woundsReceived; i++) {
            hero.takeWound();
        }

        // --- Apply Special Abilities ---

        const isPoison = unblockedEnemies.some(e => e.poison || (e.abilities && e.abilities.includes('poison')));
        const isPetrify = unblockedEnemies.some(e => e.petrify || (e.abilities && e.abilities.includes('petrify')));

        if (isPoison) {
            // Poison deals equal amount of wounds to Discard
            const poisonWounds = woundsReceived;
            for (let i = 0; i < poisonWounds; i++) {
                hero.takeWoundToDiscard();
            }
            woundsReceived += poisonWounds; // Track total wounds received
        }

        if (isPetrify && woundsReceived > 0) {
            // Paralyze: Hero must discard all non-wound cards
            logger.info(t('combat.paralyzeEffect'));
            this.paralyzeTriggered = true;
        }

        unblockedEnemies.forEach(enemy => {
            // Vampiric: Increases Armor if they deal damage (wound hero)
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
     * Assigns damage to a unit from an enemy.
     * @param {any} unit The target unit.
     * @param {any} enemy The attacking enemy.
     * @returns {UnitDamageResult} Result of assignment.
     */
    public assignDamageToUnit(unit: any, enemy: any): UnitDamageResult {
        // Assassinate Rule: Cannot assign damage to units
        if (enemy.assassin) {
            return { success: false, message: t('combat.assassinateRestriction', { enemy: enemy.name }) };
        }

        if (enemy.petrify) {
            // Paralyze: Unit is destroyed instantly if wounded
            unit.destroyed = true;
            logger.info(`${unit.getName()} wurde durch Versteinerung zerstört!`);
        } else {
            unit.takeWound();
            logger.info(`${unit.getName()} wurde verwundet.`);
        }

        if (enemy.poison) {
            // Poison: Unit takes 2 Wounds (instantly wounded again)
            unit.takeWound();
            logger.info(`${unit.getName()} erlitt zusätzlich Gift-Schaden.`);
        }

        // Vampiric: Increases Armor for each wound dealt
        const isVampiric = enemy.vampiric || (enemy.abilities && enemy.abilities.includes('vampiric'));
        if (isVampiric) {
            // A unit destroyed by Petrify counts as wound(s)?
            // Simplified: if unit wounded or destroyed, increment armorBonus.
            const woundsDealt = unit.destroyed ? 2 : 1;
            enemy.armorBonus = (enemy.armorBonus || 0) + woundsDealt;
            logger.info(`${enemy.name} erhält +${woundsDealt} Rüstung durch Vampirismus!`);
        }

        return { success: true, unitDestroyed: unit.destroyed, unitWounded: unit.wounds > 0 };
    }
}
