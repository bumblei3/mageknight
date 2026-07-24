/**
 * Smart End Turn — pure helpers for "are you sure?" warnings.
 * Keeps confirm copy out of InputController / ActionBarManager.
 */
import { t } from '../i18n/index.js';

export interface EndTurnWarning {
    id: string;
    text: string;
}

/**
 * Collect soft warnings before ending a turn (exploration only).
 */
export function getEndTurnWarnings(game: any): EndTurnWarning[] {
    if (!game || game.combat || game.gameState === 'combat') return [];

    const warnings: EndTurnWarning[] = [];
    const hero = game.hero;
    if (!hero) return warnings;

    const mp = hero.movementPoints ?? 0;
    if (mp > 0) {
        warnings.push({
            id: 'mp',
            text:
                t('ui.endTurn.mpLeft', { points: mp }) ||
                `Noch ${mp} Bewegungspunkte übrig`
        });
    }

    if ((hero.wounds || 0) > 0 && (hero.healingPoints || 0) > 0) {
        warnings.push({
            id: 'heal',
            text:
                t('ui.endTurn.healAvailable') ||
                'Heilung verfügbar — Wunden könnten geheilt werden'
        });
    }

    // Site under the hero that can still be visited
    const pos = hero.position;
    if (pos && game.hexGrid?.getHex) {
        const hex = game.hexGrid.getHex(pos.q, pos.r);
        if (hex?.site) {
            warnings.push({
                id: 'site',
                text:
                    t('ui.endTurn.siteHere') ||
                    'Du stehst an einem Ort — noch besuchen?'
            });
        }
    }

    // Movement cards while stranded (0 MP)
    if (mp <= 0) {
        const hand = hero.hand || [];
        const hasMoveCard = hand.some((c: any) => {
            if (!c || (typeof c.isWound === 'function' ? c.isWound() : c.isWound)) return false;
            const b = c.basicEffect || {};
            const s = c.strongEffect || {};
            return !!(b.movement || s.movement);
        });
        if (hasMoveCard) {
            warnings.push({
                id: 'moveCards',
                text:
                    t('ui.endTurn.moveCards') ||
                    'Bewegungskarten noch auf der Hand'
            });
        }
    }

    return warnings;
}

/**
 * Build a confirm dialog message, or null if no warnings (safe to end without prompt).
 */
export function buildEndTurnConfirmMessage(game: any): string | null {
    const warnings = getEndTurnWarnings(game);
    if (warnings.length === 0) return null;

    const header = t('ui.endTurn.confirmTitle') || 'Zug beenden?';
    const body = warnings.map((w) => `• ${w.text}`).join('\n');
    const footer = t('ui.endTurn.confirmFooter') || 'Trotzdem beenden?';
    return `${header}\n${body}\n\n${footer}`;
}

/**
 * Returns true if the player confirmed (or no warning needed).
 */
export function confirmEndTurnIfNeeded(game: any): boolean {
    const msg = buildEndTurnConfirmMessage(game);
    if (!msg) return true;
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
    return window.confirm(msg);
}
