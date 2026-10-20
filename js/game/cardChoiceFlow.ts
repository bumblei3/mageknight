/**
 * Player choices that a card effect needs before it can resolve.
 *
 * `wish` (Wish) and `copy_card` (Improvisation) cannot be applied silently —
 * they ask the player. Both the normal play path (`interactionController`) and
 * the combat path (`CombatOrchestrator.playCardInCombat`) call
 * `resolveCardChoice()`, which opens the shared choice modal and applies the
 * pick. Without a UI (headless tests, bots) the effect degrades to a defined
 * default instead of doing nothing.
 */
import { t } from '../i18n/index';

export interface CardChoiceOption {
    label: string;
    action: () => unknown;
}

export interface CardChoiceConfig {
    icon: string;
    title: string;
    description: string;
    options: CardChoiceOption[];
}

/** True when the played card still needs a decision from the player. */
export function needsCardChoice(effect: any): boolean {
    return Boolean(effect && (effect.wish || effect.copyCard));
}

/**
 * Resolve the choice effects of a played card.
 * @returns true when a choice was started (the caller should not treat the card as finished)
 */
export function resolveCardChoice(game: any, result: any): boolean {
    if (!game || !result || !result.effect) return false;

    if (result.effect.wish) {
        openWishChoice(game, Math.max(1, Number(result.effect.wish) || 1));
        return true;
    }

    if (result.effect.copyCard) {
        openCopyChoice(game, Math.max(1, Number(result.effect.copyCard) || 1));
        return true;
    }

    return false;
}

function showChoice(game: any, config: CardChoiceConfig): boolean {
    if (game.ui && typeof game.ui.showCardChoice === 'function') {
        game.ui.showCardChoice(config);
        return true;
    }
    return false;
}

/** Refresh the views a resolved choice usually changes. */
function afterChoice(game: any): void {
    if (typeof game.renderHand === 'function') game.renderHand();
    if (typeof game.updateStats === 'function') game.updateStats();
}

function logChoice(game: any, message: string, success: boolean): void {
    if (typeof game.addLog === 'function') {
        game.addLog(message, success ? 'success' : 'warning');
    }
}

/**
 * Wish: value = number of picks (basic 1, strong 2). Each pick re-opens the
 * same modal once the previous one closed.
 */
export function openWishChoice(game: any, picksLeft: number): void {
    const options: CardChoiceOption[] = [
        {
            label: t('cards.wish.heal', { amount: 5 }) || '❤️ 5 Wunden heilen',
            action: () => pickWish(game, 'heal', picksLeft)
        },
        {
            label: t('cards.wish.attack', { amount: 5 }) || '⚔️ +5 Angriff',
            action: () => pickWish(game, 'attack', picksLeft)
        },
        {
            label: t('cards.wish.artifact') || '💎 Artefakt erhalten',
            action: () => pickWish(game, 'artifact', picksLeft)
        }
    ];

    const shown = showChoice(game, {
        icon: '🪄',
        title: t('cards.wish.title') || 'Wunsch',
        description:
            picksLeft > 1
                ? t('cards.wish.remaining', { count: picksLeft }) || `${picksLeft} Wünsche offen`
                : t('cards.wish.pick') || 'Wähle einen Effekt',
        options
    });

    if (!shown) {
        // No modal available: keep the card meaningful instead of dead
        const fallback = game.hero.resolveWish('attack');
        logChoice(game, fallback.message, fallback.success);
        afterChoice(game);
    }
}

function pickWish(game: any, option: 'heal' | 'attack' | 'artifact', picksLeft: number) {
    const result = game.hero.resolveWish(option);
    logChoice(game, result.message, result.success);

    if (picksLeft > 1) {
        // runSiteAction() closes the modal on success — re-open for the next pick
        setTimeout(() => openWishChoice(game, picksLeft - 1), 0);
    } else {
        afterChoice(game);
    }

    return result;
}

/**
 * Improvisation: value = number of cards copied out of the discard pile.
 */
export function openCopyChoice(game: any, picksLeft: number): void {
    const discard = typeof game.hero.getDiscardCards === 'function'
        ? game.hero.getDiscardCards()
        : [];

    if (discard.length === 0) {
        logChoice(game, t('cards.copy.empty') || 'Ablagestapel ist leer', false);
        afterChoice(game);
        return;
    }

    // One entry per card id: duplicates would copy the same card twice
    const seen = new Set<string>();
    const options: CardChoiceOption[] = discard
        .filter((card: any) => {
            if (seen.has(card.id)) return false;
            seen.add(card.id);
            return true;
        })
        .map((card: any) => ({
            label: t('cards.copy.pick', { card: card.name }) || `${card.name} zurückholen`,
            action: () => pickCopy(game, card.id, picksLeft)
        }));

    const shown = showChoice(game, {
        icon: '📋',
        title: t('cards.copy.title') || 'Improvisation',
        description:
            picksLeft > 1
                ? t('cards.copy.remaining', { count: picksLeft }) || `${picksLeft} Karten wählen`
                : t('cards.copy.pickOne') || 'Wähle eine Karte aus dem Ablagestapel',
        options
    });

    if (!shown) {
        const copied = game.hero.copyCardsFromDiscard([discard[0].id]);
        logChoice(game, `Improvisation: ${copied.map((c: any) => c.name).join(', ')}`, copied.length > 0);
        afterChoice(game);
    }
}

function pickCopy(game: any, cardId: string, picksLeft: number) {
    const copied = game.hero.copyCardsFromDiscard([cardId]);
    const names = copied.map((card: any) => card.name).join(', ');
    const result = {
        success: copied.length > 0,
        message: copied.length > 0
            ? t('cards.copy.copied', { cards: names }) || `${names} aus der Ablage geholt`
            : t('cards.copy.missing') || 'Karte nicht gefunden'
    };
    logChoice(game, result.message, result.success);

    if (copied.length > 0 && picksLeft > 1) {
        setTimeout(() => openCopyChoice(game, picksLeft - 1), 0);
    } else {
        afterChoice(game);
    }

    return result;
}
