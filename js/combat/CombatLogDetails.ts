import { logger } from '../logger';
import { ATTACK_ELEMENTS } from '../constants';

export interface BlockBreakdown {
    enemyName: string;
    enemyElement: string;
    requiredBlock: number;
    cardBlocks: Array<{ value: number; element: string; effective: number; efficient: boolean }>;
    unitBlock: { value: number; effective: number; efficient: boolean };
    totalEffective: number;
    totalInput: number;
    blocked: boolean;
    inefficiencyReasons: string[];
    cumbersomeUsed?: number;
}

export interface DamageBreakdown {
    totalEnemyAttack: number;
    unblockedEnemies: Array<{ name: string; attack: number; element: string; abilities: string[] }>;
    heroArmor: number;
    baseWounds: number;
    poisonWounds: number;
    paralyzeTriggered: boolean;
    vampirismArmorGained: number;
    totalWoundsReceived: number;
    message: string;
}

export interface AttackBreakdown {
    totalAttack: number;
    cardAttack: number;
    unitAttack: number;
    attackElement: string;
    targets: Array<{
        name: string;
        type: 'regular' | 'boss';
        armor: number;
        resistanceMultiplier: number;
        effectiveArmor: number;
        damageDealt: number;
        defeated: boolean;
    }>;
    remainingAttack: number;
    message: string;
}

export interface RangedBreakdown {
    enemyName: string;
    rangedValue: number;
    siegeValue: number;
    resistanceMultiplier: number;
    isFortified: boolean;
    damageDealt: number;
    defeated: boolean;
}

export class CombatLogDetails {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Generates a detailed block log message
     */
    logDetailedBlock(breakdown: BlockBreakdown): string {
        const lines: string[] = [];

        lines.push(`🛡️ Block-Details: ${breakdown.enemyName}`);
        lines.push(`   Angriff: ${breakdown.requiredBlock} (${this.formatElement(breakdown.enemyElement)})`);

        if (breakdown.cardBlocks && breakdown.cardBlocks.length > 0) {
            lines.push(`   Karten:`);
            breakdown.cardBlocks.forEach(card => {
                const eff = card.efficient ? '✓' : '½';
                lines.push(`      ${card.value} ${this.formatElement(card.element)} → ${card.effective} ${eff}`);
            });
        }

        if (breakdown.unitBlock.value > 0) {
            const eff = breakdown.unitBlock.efficient ? '✓' : '½';
            lines.push(`   Einheiten: ${breakdown.unitBlock.value} → ${breakdown.unitBlock.effective} ${eff}`);
        }

        if (breakdown.cumbersomeUsed && breakdown.cumbersomeUsed > 0) {
            lines.push(`   ⬇ Schwerfällig: −${breakdown.cumbersomeUsed} Bewegungspunkte`);
        }

        if (breakdown.inefficiencyReasons?.length > 0) {
            lines.push(`   ⚠ Ineffizienz: ${breakdown.inefficiencyReasons.join(', ')}`);
        }

        lines.push(`   ${breakdown.blocked ? '✅ GEBLOCKT' : '❌ NICHT GEBLOCKT'} (${breakdown.totalEffective} / ${breakdown.requiredBlock})`);

        return lines.join('\n');
    }

    /**
     * Generates a detailed damage phase log message
     */
    logDetailedDamage(breakdown: DamageBreakdown): string {
        const lines: string[] = [];

        lines.push(`💥 Schaden-Phase`);

        if (breakdown.unblockedEnemies.length > 0) {
            lines.push(`   Ungeschützte Feinde:`);
            breakdown.unblockedEnemies.forEach(enemy => {
                const abilities = enemy.abilities.length > 0 ? ` [${enemy.abilities.join(', ')}]` : '';
                lines.push(`      ${enemy.name}: ${enemy.attack} ${this.formatElement(enemy.element)}${abilities}`);
            });
        }

        lines.push(`   Gesamtschaden: ${breakdown.totalEnemyAttack}`);
        lines.push(`   Held-Rüstung: ${breakdown.heroArmor}`);
        lines.push(`   Basis-Wunden: ⌈${breakdown.totalEnemyAttack} / ${breakdown.heroArmor}⌉ = ${breakdown.baseWounds}`);

        if (breakdown.poisonWounds > 0) {
            lines.push(`   ☠ Gift: +${breakdown.poisonWounds} Wunden (Ablagestapel)`);
        }

        if (breakdown.paralyzeTriggered) {
            lines.push(`   🗿 Versteinerung: Karten-Abwurf erzwungen!`);
        }

        if (breakdown.vampirismArmorGained > 0) {
            lines.push(`   🧛 Vampirismus: Feind +${breakdown.vampirismArmorGained} Rüstung`);
        }

        lines.push(`   🩸 Gesamt-Wunden: ${breakdown.totalWoundsReceived}`);

        return lines.join('\n');
    }

    /**
     * Generates a detailed attack phase log message
     */
    logDetailedAttack(breakdown: AttackBreakdown): string {
        const lines: string[] = [];

        lines.push(`⚔️ Angriffs-Phase`);
        lines.push(`   Karten: ${breakdown.cardAttack} + Einheiten: ${breakdown.unitAttack} = ${breakdown.totalAttack} (${this.formatElement(breakdown.attackElement)})`);

        if (breakdown.targets.length > 0) {
            lines.push(`   Ziele:`);
            breakdown.targets.forEach(target => {
                const status = target.defeated ? '💀 BESEITIGT' : `▸ ${target.damageDealt} Schaden`;
                lines.push(`      ${target.name}: ${target.effectiveArmor} eff. Rüstung (×${target.resistanceMultiplier}) → ${status}`);
            });
        }

        if (breakdown.remainingAttack > 0) {
            lines.push(`   Verbleibend: ${breakdown.remainingAttack}`);
        }

        return lines.join('\n');
    }

    /**
     * Generates a detailed ranged phase log message
     */
    logDetailedRanged(breakdown: RangedBreakdown): string {
        const lines: string[] = [];

        lines.push(`🏹 Fernkampf: ${breakdown.enemyName}`);
        lines.push(`   Wert: ${breakdown.rangedValue} Fernkampf + ${breakdown.siegeValue} Belagerung = ${breakdown.rangedValue + breakdown.siegeValue}`);
        lines.push(`   Resistenz: ×${breakdown.resistanceMultiplier} ${breakdown.isFortified ? '(Befestigt)' : ''}`);
        lines.push(`   Schaden: ${breakdown.damageDealt} ${breakdown.defeated ? '💀 BESEITIGT' : ''}`);

        return lines.join('\n');
    }

    /**
     * Logs a compact summary for immediate feedback
     */
    logCompactBlock(enemyName: string, blocked: boolean, totalBlock: number, required: number, inefficient: boolean): void {
        const icon = blocked ? '✅' : '❌';
        const ineff = inefficient ? ' (½)' : '';
        this.game.addLog(`${icon} ${enemyName}: Block ${totalBlock} / ${required}${ineff}`, blocked ? 'success' : 'warning');
    }

    logCompactDamage(wounds: number, hasPoison: boolean, hasParalyze: boolean): void {
        let msg = `💥 ${wounds} Wunden`;
        if (hasPoison) msg += ' + Gift';
        if (hasParalyze) msg += ' + Versteinerung';
        this.game.addLog(msg, 'combat');
    }

    logCompactAttack(defeatedCount: number, totalTargets: number, remainingAttack: number): void {
        if (defeatedCount > 0) {
            this.game.addLog(`⚔️ ${defeatedCount}/${totalTargets} besiegt (Rest-Angriff: ${remainingAttack})`, 'success');
        } else {
            this.game.addLog(`⚔️ Zu schwach (Angriff: ${remainingAttack})`, 'warning');
        }
    }

    private formatElement(element: string): string {
        const icons: Record<string, string> = {
            [ATTACK_ELEMENTS.PHYSICAL]: '⚔',
            [ATTACK_ELEMENTS.FIRE]: '🔥',
            [ATTACK_ELEMENTS.ICE]: '❄',
            [ATTACK_ELEMENTS.COLD_FIRE]: '🧊',
        };
        return icons[element] || element;
    }
}

export default CombatLogDetails;