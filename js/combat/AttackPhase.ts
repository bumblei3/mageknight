import { COMBAT_PHASES } from '../constants';
import { t } from '../i18n/index';

export class AttackPhase {
    private combat: any;

    constructor(combatCtx: any) {
        this.combat = combatCtx;
    }

    public update(enemies: any[]): any {
        if (this.combat.phase !== COMBAT_PHASES.ATTACK) {
            return { error: t('ui.phases.attack') };
        }
        return {
            enemies: enemies,
            defeatedEnemies: this.combat.defeatedEnemies,
            message: t('ui.phases.attack')
        };
    }

    public executeAttack(attackValue: number, attackElement: string = 'physical', targetEnemies: any[] | null = null): any {
        if (this.combat.phase !== COMBAT_PHASES.ATTACK) {
            return { error: t('ui.phases.attack') };
        }

        const targets = targetEnemies || this.combat.enemies;
        const totalAttack = attackValue + this.combat.unitManager.unitAttackPoints;

        // Split targets into bosses and regular enemies
        const bosses = targets.filter((e: any) => e.isBoss);
        const regularEnemies = targets.filter((e: any) => !e.isBoss);

        const result: any = {
            success: false,
            defeated: [],
            damaged: [],
            bossTransitions: [],
            fameGained: 0,
            totalAttack: totalAttack,
            unitContribution: this.combat.unitManager.unitAttackPoints,
            messages: []
        };

        // Handle regular enemies (armor-based defeat)
        if (regularEnemies.length > 0) {
            this._handleRegularEnemies(regularEnemies, totalAttack, attackElement, result);
        }

        // Handle bosses (health-based damage)
        if (bosses.length > 0) {
            this._handleBosses(bosses, totalAttack, attackElement, result);
        }

        // Create combined message
        result.message = result.messages.join(' ');
        if (result.success && !result.message) {
            // Fallback if success but no message generated
            result.message = t('combat.attackSuccess');
        }

        return result;
    }

    private _handleRegularEnemies(regularEnemies: any[], totalAttack: number, attackElement: string, result: any): void {
        const totalArmor = regularEnemies.reduce((sum, enemy) => {
            const multiplier = enemy.getResistanceMultiplier(attackElement);
            // Use getCurrentArmor logic (Elusive checks blocked status + attack phase)
            const isBlocked = this.combat.blockedEnemies.has(enemy.id);
            const currentArmor = typeof enemy.getCurrentArmor === 'function' ? enemy.getCurrentArmor(isBlocked, true) : enemy.armor;
            return sum + (currentArmor / multiplier);
        }, 0);

        if (totalAttack >= totalArmor) {
            regularEnemies.forEach(enemy => {
                this.combat.defeatedEnemies.push(enemy);
                this.combat.hero.gainFame(enemy.fame);
                result.defeated.push(enemy);
                result.fameGained += enemy.fame;
            });
            this.combat.enemies = this.combat.enemies.filter((e: any) => !regularEnemies.includes(e));
            result.messages.push(t('combat.enemiesDefeated', { count: regularEnemies.length }));
            result.success = true;
        } else {
            result.messages.push(t('combat.attackWeak', { attack: totalAttack, armor: totalArmor }));
        }
    }

    private _handleBosses(bosses: any[], totalAttack: number, attackElement: string, result: any): void {
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
            if (damageResult.transitions && damageResult.transitions.length > 0) {
                damageResult.transitions.forEach((transition: any) => {
                    result.bossTransitions.push({
                        boss: boss,
                        phase: transition.phase,
                        ability: transition.ability,
                        message: transition.message || `${boss.name} erreicht ${transition.phase}!`
                    });

                    // Execute phase ability if exists
                    if (transition.ability && transition.ability !== 'enrage' && typeof boss.executePhaseAbility === 'function') {
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
                this.combat.defeatedEnemies.push(boss);
                this.combat.hero.gainFame(boss.fame);
                result.defeated.push(boss);
                result.fameGained += boss.fame;
                this.combat.enemies = this.combat.enemies.filter((e: any) => e.id !== boss.id);
                result.messages.push(t('combat.bossDefeatedAttack', { enemy: boss.name, amount: boss.fame }));
            }

            result.success = true;
        });
    }
}
