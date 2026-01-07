import { COMBAT_PHASES, ENEMY_DEFINITIONS } from '../constants';
import { logger } from '../logger';
import { t } from '../i18n/index';

export class RangedPhase {
    private combat: any;

    constructor(combatCtx: any) {
        this.combat = combatCtx;
    }

    public update(enemies: any[]): any {
        if (this.combat.phase !== COMBAT_PHASES.RANGED) {
            return { error: t('ui.phases.ranged') };
        }
        return {
            enemies: enemies,
            message: t('combat.phaseRanged')
        };
    }

    public executeAttack(enemy: any, rangedValue: number, siegeValue: number, element: string = 'physical'): any {
        if (this.combat.phase !== COMBAT_PHASES.RANGED) {
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
        const unitManager = this.combat.unitManager;

        // Fortified Rule: If fortified, only Siege contributes. If not, both do.
        let combinedAttack = 0;
        if (enemy.fortified) {
            combinedAttack = siegeValue + unitManager.unitSiegePoints;
        } else {
            combinedAttack = rangedValue + siegeValue + unitManager.unitRangedPoints + unitManager.unitSiegePoints;
        }

        // Handle boss enemies (health-based damage)
        if (enemy.isBoss) {
            return this._handleBossAttack(enemy, rangedValue, siegeValue, combinedAttack, multiplier);
        }

        // Handle regular enemies (armor-based defeat)
        return this._handleRegularEnemyAttack(enemy, rangedValue, siegeValue, combinedAttack, multiplier);
    }

    private _handleBossAttack(enemy: any, rangedValue: number, siegeValue: number, combinedAttack: number, multiplier: number): any {
        const effectiveDamage = Math.floor(combinedAttack * multiplier);
        const damageResult = enemy.takeDamage(effectiveDamage);
        const unitManager = this.combat.unitManager;

        // Consume points (Bosses take all available relevant damage)
        let consumedRanged = 0;
        let consumedSiege = 0;

        if (enemy.fortified) {
            consumedSiege = siegeValue;
            unitManager.unitSiegePoints = 0;
        } else {
            consumedRanged = rangedValue;
            consumedSiege = siegeValue;
            unitManager.unitRangedPoints = 0;
            unitManager.unitSiegePoints = 0;
        }

        const result: any = {
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
        if (damageResult.transitions && damageResult.transitions.length > 0) {
            damageResult.transitions.forEach((transition: any) => {
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
            this._handleEnemyDefeated(enemy);
            result.defeated = [enemy];
            result.fameGained = enemy.fame;
            result.message = t('combat.bossDefeated', { enemy: enemy.name, amount: enemy.fame });
        }

        return result;
    }

    private _handleRegularEnemyAttack(enemy: any, rangedValue: number, siegeValue: number, combinedAttack: number, multiplier: number): any {
        const currentArmor = typeof enemy.getCurrentArmor === 'function' ? enemy.getCurrentArmor() : enemy.armor;
        const effectiveArmor = currentArmor / multiplier;
        const unitManager = this.combat.unitManager;

        logger.debug(`Ranged attack: ${combinedAttack} vs ${effectiveArmor} (Armor: ${enemy.armor}, Multiplier: ${multiplier})`);

        if (combinedAttack >= effectiveArmor) {
            this._handleEnemyDefeated(enemy);

            // Consume points used
            let consumedRanged = 0;
            let consumedSiege = 0;

            if (enemy.fortified) {
                consumedSiege = Math.max(0, effectiveArmor - unitManager.unitSiegePoints);
                unitManager.unitSiegePoints = 0;
            } else {
                // Greedy consumption: use units first, then siege, then ranged
                let remaining = effectiveArmor;

                // Units first
                const unitTotal = unitManager.unitRangedPoints + unitManager.unitSiegePoints;
                remaining = Math.max(0, remaining - unitTotal);
                unitManager.unitRangedPoints = 0;
                unitManager.unitSiegePoints = 0;

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

    private _handleEnemyDefeated(enemy: any): void {
        if (this.combat.defeatedEnemies) {
            this.combat.defeatedEnemies.push(enemy);
        }
        if (this.combat.hero && typeof this.combat.hero.gainFame === 'function') {
            this.combat.hero.gainFame(enemy.fame);
        }
        if (this.combat.enemies) {
            this.combat.enemies = this.combat.enemies.filter((e: any) => e.id !== enemy.id);
        }
    }

    public handleSummoning(enemies: any[], defeatedEnemies: any[]): void {
        const summoners = enemies.filter(e => e.summoner && !defeatedEnemies.includes(e));

        if (summoners.length === 0) return;

        summoners.forEach(summoner => {
            // Draw a random brown token (Orcs/Goblins/etc)
            const brownTokens = Object.keys(ENEMY_DEFINITIONS).filter(key =>
                key === 'orc' || key === 'weakling' || key === 'robber'
            );

            const randomType = brownTokens[Math.floor(Math.random() * brownTokens.length)];
            const definition = (ENEMY_DEFINITIONS as any)[randomType];

            const summonedId = `summoned_${summoner.id}_${Date.now()}`;

            let summoned: any;
            if (summoner.constructor && typeof summoner.constructor === 'function') {
                summoned = new (summoner.constructor as any)({
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

            if (this.combat.summonedEnemies) {
                this.combat.summonedEnemies.set(summoned.id, summoner);
            }

            // Replace summoner with summoned in the active enemies list within combat context
            if (this.combat.enemies) {
                this.combat.enemies = this.combat.enemies.map((e: any) => e.id === summoner.id ? summoned : e);
            }
        });
    }
}
