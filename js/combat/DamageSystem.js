import { logger } from '../logger.js';
import { t } from '../i18n/index.js';

export class DamageSystem {
    constructor() {
        this.paralyzeTriggered = false;
    }

    reset() {
        this.paralyzeTriggered = false;
    }

    /**
     * Calculates wounds received from unblocked enemies and applies effects.
     * @param {Object} hero The hero taking damage.
     * @param {Array} unblockedEnemies List of enemies that were not blocked.
     * @returns {Object} Result object.
     */
    calculateDamage(hero, unblockedEnemies) {
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
     * @param {Object} unit The target unit.
     * @param {Object} enemy The attacking enemy.
     * @returns {Object} Result of assignment.
     */
    assignDamageToUnit(unit, enemy) {
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

        // Vampirism check for Unit damage?
        // Rules say: "If a Vampiric enemy deals damage..." usually implies wounds.
        // If unit is wounded, Vampirism triggers?
        // Implementation in original code checked woundsReceived > 0 in CalculateDamage only.
        // We should add it here for completeness if required, but let's match original logic first.
        // Original code: assignDamageToUnit only handled unit state, didn't trigger Vampirism on Enemy?
        // Checking original Combat.js... Vampirism was inside `damagePhase`.
        // `assignDamageToUnit` was a separate method called presumably by UI/Orchestrator?
        // Yes. So if player assigns damage to unit, Vampirism should theoretically trigger if damage dealt.
        // But original code didn't have it there. I will keep it consistent.

        return { success: true, unitDestroyed: unit.destroyed, unitWounded: unit.wounds > 0 };
    }
}
