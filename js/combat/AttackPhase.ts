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
        const totalAttack = attackValue + this.combat.unitManager.totalAttackPoints;

        const bosses = targets.filter((e: any) => e.isBoss);
        const regularEnemies = targets.filter((e: any) => !e.isBoss);

        const result: any = {
            success: false,
            defeated: [],
            damaged: [],
            bossTransitions: [],
            fameGained: 0,
            totalAttack: totalAttack,
            unitContribution: this.combat.unitManager.totalAttackPoints,
            messages: []
        };

        if (regularEnemies.length > 0) {
            this._handleRegularEnemies(regularEnemies, totalAttack, attackElement, result);
        }

        if (bosses.length > 0) {
            this._handleBosses(bosses, totalAttack, attackElement, result);
        }

        result.message = result.messages.join(' ');
        if (result.success && !result.message) {
            result.message = t('combat.attackSuccess');
        }

        return result;
    }

    private _handleRegularEnemies(regularEnemies: any[], totalAttack: number, attackElement: string, result: any): void {
        // Calculate armor needed for each enemy (considering resistances and block status)
        const enemiesWithArmor = regularEnemies.map(enemy => ({
            enemy,
            multiplier: enemy.getResistanceMultiplier(attackElement),
            isBlocked: this.combat.blockedEnemies.has(enemy.id),
            armor: typeof enemy.getCurrentArmor === 'function' ? enemy.getCurrentArmor(this.combat.blockedEnemies.has(enemy.id), true) : enemy.armor
        }));

        // Try to find the largest group that can be defeated together
        // Strategy: Try all combinations from largest to smallest
        const n = enemiesWithArmor.length;
        let bestGroup: any[] = [];
        
        // Try groups from largest to smallest
        for (let size = n; size >= 1; size--) {
            const combinations = this._getCombinations(enemiesWithArmor, size);
            for (const combo of combinations) {
                const totalNeeded = combo.reduce((sum, e) => sum + (e.armor / e.multiplier), 0);
                if (totalAttack >= totalNeeded) {
                    bestGroup = combo;
                    break;
                }
            }
            if (bestGroup.length > 0) break;
        }

        const defeated: any[] = [];
        if (bestGroup.length > 0) {
            // Defeat the grouped enemies
            bestGroup.forEach(groupMember => {
                const enemy = groupMember.enemy;
                this.combat.defeatedEnemies.push(enemy);
                this.combat.hero.gainFame(enemy.fame);
                result.defeated.push(enemy);
                result.fameGained += enemy.fame;
                this.combat.enemies = this.combat.enemies.filter((e: any) => e.id !== enemy.id);
            });
            result.messages.push(t('combat.enemiesDefeated', { count: bestGroup.length }));
            result.success = true;
        }

        // Try to defeat remaining enemies with sequential logic
        const remainingEnemies = enemiesWithArmor.filter(e => !bestGroup.includes(e));
        if (remainingEnemies.length > 0) {
            let remainingAttack = totalAttack;
            const defeated: any[] = [];
            
            // Use the same amount as if we attacked the best group
            const groupArmor = bestGroup.reduce((sum, e) => sum + (e.armor / e.multiplier), 0);
            remainingAttack -= groupArmor;
            
            for (const member of remainingEnemies) {
                const neededForThis = member.armor / member.multiplier;
                if (remainingAttack >= neededForThis) {
                    remainingAttack -= neededForThis;
                    defeated.push(member.enemy);
                }
            }

            defeated.forEach(enemy => {
                this.combat.defeatedEnemies.push(enemy);
                this.combat.hero.gainFame(enemy.fame);
                result.defeated.push(enemy);
                result.fameGained += enemy.fame;
                this.combat.enemies = this.combat.enemies.filter((e: any) => e.id !== enemy.id);
            });

            if (defeated.length > 0) {
                result.messages.push(t('combat.enemiesDefeated', { count: defeated.length }));
                result.success = true;
            }
        }

        // Report remaining enemies
        const allDefeated = [...bestGroup, ...defeated].map(d => d.enemy || d);
        if (allDefeated.length < regularEnemies.length) {
            const remainingArmorSum = allDefeated.reduce((sum, d) => {
                const m = d.getResistanceMultiplier(attackElement);
                const isB = this.combat.blockedEnemies.has(d.id);
                const arm = typeof d.getCurrentArmor === 'function' ? d.getCurrentArmor(isB, true) : d.armor;
                return sum + (arm / m);
            }, 0);

            const remainingAttackUsed = totalAttack - remainingArmorSum;
            const totalRemainingArmor = regularEnemies
                .filter(e => !allDefeated.includes(e))
                .reduce((sum, e) => {
                    const mult = e.getResistanceMultiplier(attackElement);
                    const isB = this.combat.blockedEnemies.has(e.id);
                    const armor = typeof e.getCurrentArmor === 'function' ? e.getCurrentArmor(isB, true) : e.armor;
                    return sum + (armor / mult);
                }, 0);
            result.messages.push(t('combat.attackWeak', { attack: Math.floor(remainingAttackUsed), armor: Math.floor(totalRemainingArmor) }));
        }
    }

    // Helper to get all combinations of size k
    private _getCombinations(arr: any[], k: number): any[][] {
        if (k === 0) return [[]];
        if (k > arr.length) return [];
        if (k === arr.length) return [arr];
        
        const result: any[][] = [];
        for (let i = 0; i <= arr.length - k; i++) {
            const rest = this._getCombinations(arr.slice(i + 1), k - 1);
            for (const combo of rest) {
                result.push([arr[i], ...combo]);
            }
        }
        return result;
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

            if (damageResult.transitions && damageResult.transitions.length > 0) {
                damageResult.transitions.forEach((transition: any) => {
                    result.bossTransitions.push({
                        boss: boss,
                        phase: transition.phase,
                        ability: transition.ability,
                        message: transition.message || `${boss.name} erreicht ${transition.phase}!`
                    });

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
