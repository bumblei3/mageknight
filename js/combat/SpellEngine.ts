/**
 * Spell Engine — Handles spell card effects in combat
 * 
 * Spell types:
 * - Direct Damage: Deal damage ignoring armor
 * - Area Damage: Deal damage to all enemies
 * - Heal: Restore hero health (remove wounds)
 * - Draw: Draw cards from deck
 * - Mana Drain: Steal mana from enemies
 * - Buff: Temporary combat bonuses
 * - Debuff: Apply status effects to enemies
 */

import { logger } from '../logger';
import { t } from '../i18n/index';

export interface SpellEffect {
    type: 'direct_damage' | 'area_damage' | 'heal' | 'draw' | 'mana_drain' | 'buff' | 'debuff';
    value: number;
    element?: string;
    target?: 'single' | 'all' | 'self';
    duration?: number;  // For buffs/debuffs
}

export interface SpellResult {
    success: boolean;
    message: string;
    damageDealt?: number;
    cardsDrawn?: number;
    manaGained?: number;
    healingDone?: number;
    targetsAffected?: string[];
}

export class SpellEngine {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Cast a spell card — returns result for UI feedback
     */
    castSpell(card: any, useStrong: boolean = false): SpellResult {
        // Guard: card must have getEffect or basicEffect
        if (!card) return { success: false, message: 'Keine Karte' };

        const effect = typeof card.getEffect === 'function' ? card.getEffect(useStrong) : card.basicEffect;
        if (!effect) {
            return { success: false, message: 'Kein Spell-Effekt' };
        }

        const spellType = this.detectSpellType(effect);
        const value = useStrong ? (effect.strongValue || (effect.value ? effect.value * 2 : 0)) : (effect.value || 0);

        switch (spellType) {
            case 'direct_damage':
                return this.castDirectDamage(value, effect.element);
            case 'area_damage':
                return this.castAreaDamage(value, effect.element);
            case 'heal':
                return this.castHeal(value);
            case 'draw':
                return this.castDraw(value);
            case 'mana_drain':
                return this.castManaDrain(value);
            case 'buff':
                return this.castBuff(value, effect);
            case 'debuff':
                return this.castDebuff(value, effect);
            default:
                return this.castBasicSpell(card, effect, useStrong);
        }
    }

    /**
     * Detect spell type from card effect properties
     */
    private detectSpellType(effect: any): string {
        if (effect.spellType) return effect.spellType;
        if (effect.healing && !effect.attack) return 'heal';
        if (effect.draw) return 'draw';
        if (effect.manaDrain) return 'mana_drain';
        if (effect.buff) return 'buff';
        if (effect.debuff) return 'debuff';
        if (effect.attack && effect.aoe) return 'area_damage';
        if (effect.attack) return 'direct_damage';
        return 'unknown';
    }

    /**
     * Direct damage spell — ignores armor
     */
    private castDirectDamage(value: number, element?: string): SpellResult {
        const combat = this.game?.combat;
        if (!combat?.enemies?.length) {
            return { success: false, message: 'Kein Ziel' };
        }

        // Target first unblocked enemy
        const target = combat.enemies.find((e: any) => !combat.blockedEnemies.has(e.id)) || combat.enemies[0];
        const damage = value;

        // Apply elemental stacks
        if (element === 'fire') target.fireStacks = (target.fireStacks || 0) + value;
        else if (element === 'ice') {
            target.iceStacks = (target.iceStacks || 0) + value;
            target.slowed = true;
        }

        // Direct damage bypasses armor — reduce effective armor temporarily
        target.armorBonus = (target.armorBonus || 0) - damage;
        if (target.armorBonus + target.armor < 0) {
            target.armorBonus = -target.armor; // Can't go below 0 armor
        }

        const msg = `${target.name} erleidet ${value} ${element || 'Magie'}-Schaden (ignoriert Rüstung)`;
        this.game.addLog(msg, 'combat');

        return {
            success: true,
            message: msg,
            damageDealt: damage,
            targetsAffected: [target.name]
        };
    }

    /**
     * Area damage spell — hits all enemies
     */
    private castAreaDamage(value: number, element?: string): SpellResult {
        const combat = this.game?.combat;
        if (!combat?.enemies?.length) {
            return { success: false, message: 'Keine Ziele' };
        }

        const targets: string[] = [];
        combat.enemies.forEach((enemy: any) => {
            const resistance = enemy.getResistanceMultiplier?.(element || 'physical') || 1;
            const actualDamage = Math.ceil(value * resistance);

            if (element === 'fire') enemy.fireStacks = (enemy.fireStacks || 0) + actualDamage;
            else if (element === 'ice') {
                enemy.iceStacks = (enemy.iceStacks || 0) + actualDamage;
                enemy.slowed = true;
            }

            enemy.armorBonus = (enemy.armorBonus || 0) - actualDamage;
            if (enemy.armorBonus + enemy.armor < 0) {
                enemy.armorBonus = -enemy.armor;
            }
            targets.push(enemy.name);
        });

        const msg = `Flächenschaden! Alle Feinde erleiden ${value} ${element || 'Magie'}-Schaden`;
        this.game.addLog(msg, 'combat');

        return {
            success: true,
            message: msg,
            damageDealt: value * combat.enemies.length,
            targetsAffected: targets
        };
    }

    /**
     * Heal spell — remove wounds from hero
     */
    private castHeal(value: number): SpellResult {
        const hero = this.game?.hero;
        if (!hero) return { success: false, message: 'Kein Held' };

        let healed = 0;
        for (let i = 0; i < value; i++) {
            if (hero.healWound(false)) { // Don't use healing points for spell healing
                healed++;
            } else break; // No more wounds to heal
        }

        const msg = healed > 0
            ? `Heilung! ${healed} Wunden geheilt`
            : 'Keine Wunden zu heilen';
        this.game.addLog(msg, healed > 0 ? 'success' : 'info');

        return {
            success: healed > 0,
            message: msg,
            healingDone: healed
        };
    }

    /**
     * Draw spell — draw cards from deck
     */
    private castDraw(value: number): SpellResult {
        const hero = this.game?.hero;
        if (!hero) return { success: false, message: 'Kein Held' };

        const drawn = hero.drawCards(value);
        const count = drawn.length;

        const msg = count > 0
            ? `${count} Karten gezogen`
            : 'Keine Karten mehr im Deck';
        this.game.addLog(msg, count > 0 ? 'success' : 'info');

        return {
            success: count > 0,
            message: msg,
            cardsDrawn: count
        };
    }

    /**
     * Mana drain — steal mana from enemies
     */
    private castManaDrain(value: number): SpellResult {
        const hero = this.game?.hero;
        const combat = this.game?.combat;
        if (!hero || !combat?.enemies?.length) {
            return { success: false, message: 'Kein Ziel' };
        }

        let manaGained = 0;
        const manaColors = ['red', 'blue', 'green', 'white'];

        for (let i = 0; i < value; i++) {
            const color = manaColors[Math.floor(Math.random() * manaColors.length)];
            if (hero.addCrystal(color as any)) {
                manaGained++;
            }
        }

        const msg = manaGained > 0
            ? `${manaGained} Mana erlangt`
            : 'Kein Mana verfügbar';
        this.game.addLog(msg, manaGained > 0 ? 'success' : 'info');

        return {
            success: manaGained > 0,
            message: msg,
            manaGained
        };
    }

    /**
     * Buff spell — temporary combat bonuses
     */
    private castBuff(value: number, effect: any): SpellResult {
        const hero = this.game?.hero;
        if (!hero) return { success: false, message: 'Kein Held' };

        // Apply temporary attack bonus
        hero.attackPoints += value;
        hero.buffTurns = (hero.buffTurns || 0) + (effect.duration || 1);

        const msg = `Stärkung! +${value} Angriff für ${effect.duration || 1} Runde(n)`;
        this.game.addLog(msg, 'success');

        return { success: true, message: msg };
    }

    /**
     * Debuff spell — apply status effects to enemies
     */
    private castDebuff(value: number, effect: any): SpellResult {
        const combat = this.game?.combat;
        if (!combat?.enemies?.length) {
            return { success: false, message: 'Keine Ziele' };
        }

        const targets: string[] = [];
        combat.enemies.forEach((enemy: any) => {
            // Reduce enemy attack temporarily
            enemy.attackDebuff = (enemy.attackDebuff || 0) + value;
            targets.push(enemy.name);
        });

        const msg = `Schwächung! Feinde verlieren ${value} Angriff`;
        this.game.addLog(msg, 'combat');

        return {
            success: true,
            message: msg,
            targetsAffected: targets
        };
    }

    /**
     * Fallback: basic spell handling (ranged attack)
     */
    private castBasicSpell(card: any, effect: any, useStrong: boolean): SpellResult {
        // Treat as ranged attack if no special spell type detected
        const combat = this.game?.combat;
        if (combat) {
            const damage = useStrong ? (effect.strongValue || effect.attack * 2) : effect.attack;
            if (damage) {
                this.game.combatRangedTotal = (this.game.combatRangedTotal || 0) + damage;
                const msg = `${card.name} wirft Fernkampf für ${damage}`;
                this.game.addLog(msg, 'combat');
                return { success: true, message: msg, damageDealt: damage };
            }
        }

        return { success: false, message: 'Unbekannter Spell-Effekt' };
    }

    /**
     * Check if a card is a spell
     */
    static isSpell(card: any): boolean {
        return card.type === 'spell' || card.type === 'artifact';
    }

    /**
     * Get spell effect description for UI
     */
    static getSpellDescription(card: any, useStrong: boolean = false): string {
        const effect = card.getEffect(useStrong);
        if (!effect) return 'Kein Effekt';

        const value = useStrong ? (effect.strongValue || effect.value * 2) : effect.value;
        const engine = new SpellEngine(null);
        const type = engine.detectSpellType(effect);

        switch (type) {
            case 'direct_damage': return `${value} direkter Schaden (ignoriert Rüstung)`;
            case 'area_damage': return `${value} Flächenschaden an allen Feinden`;
            case 'heal': return `Heilt ${value} Wunden`;
            case 'draw': return `Ziehe ${value} Karten`;
            case 'mana_drain': return `Erlange ${value} Mana`;
            case 'buff': return `+${value} Angriff für ${effect.duration || 1} Runden`;
            case 'debuff': return `Feinde verlieren ${value} Angriff`;
            default: return card.name;
        }
    }
}

export default SpellEngine;
