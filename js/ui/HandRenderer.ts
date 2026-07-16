import { store, ACTIONS } from '../store';
import { t } from '../i18n/index';
import * as CardAnimations from '../cardAnimations';
import { UIElements } from '../ui';
import { TooltipManager } from './TooltipManager';
import { createCard, showCardPreview, injectCardPreviewStyles } from './components';
import type { CardData } from './components';
import { COMBAT_PHASES } from '../constants';

export interface CardPlayContext {
    disabled: boolean;
    dimmed: boolean;
    relevant: boolean;
    reason?: string;
}

export class HandRenderer {
    private elements: UIElements;
    private tooltipManager: TooltipManager;
    private ui: any;
    /** Public so ActionBarManager can refresh highlights without re-wiring clicks */
    public callbacks: {
        onCardClick: ((index: number, card: any) => void) | null;
        onCardRightClick: ((index: number, card: any) => void) | null;
    };
    private animatedCards: WeakMap<any, boolean> = new WeakMap(); // Track if a card instance has been animated
    private stylesInjected: boolean = false;

    constructor(elements: UIElements, tooltipManager: TooltipManager, ui: any) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
        this.ui = ui;
        this.callbacks = {
            onCardClick: null,
            onCardRightClick: null
        };
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_HERO_STATS || action === (ACTIONS as any).SET_LANGUAGE) {
                if (state.hero.hand && this.callbacks.onCardClick) {
                    this.renderHandCards(
                        state.hero.hand,
                        this.callbacks.onCardClick,
                        this.callbacks.onCardRightClick || undefined
                    );
                }
            }
        });
    }

    /**
     * Assess how a card should look in the current game context
     * (combat phase guidance + wound handling).
     */
    public assessCardContext(card: any, game: any = this.ui?.game): CardPlayContext {
        const isWound = typeof card?.isWound === 'function' ? card.isWound() : !!card?.isWound;
        if (isWound) {
            return {
                disabled: true,
                dimmed: false,
                relevant: false,
                reason: t('ui.cardReasons.wound') || 'Wunde — blockiert diesen Handslot'
            };
        }

        const basic = card?.basicEffect || {};
        const strong = card?.strongEffect || {};
        const has = (key: string) => !!(basic[key] || strong[key]);
        const hasBlock = has('block');
        const hasAttack = has('attack') || has('ranged') || has('siege');
        const hasRanged = has('ranged') || has('siege');
        const hasMove = has('movement');

        const combat = game?.combat;
        if (combat) {
            const phase = String(combat.phase || '').toLowerCase();
            if (phase === COMBAT_PHASES.BLOCK || phase === 'block') {
                if (hasBlock) {
                    return {
                        disabled: false,
                        dimmed: false,
                        relevant: true,
                        reason: t('ui.cardReasons.recommendedBlock') || 'Empfohlen: Block'
                    };
                }
                return {
                    disabled: false,
                    dimmed: true,
                    relevant: false,
                    reason: t('ui.cardReasons.wrongPhaseBlock') || 'Jetzt Block-Phase — diese Karte blockt nicht'
                };
            }
            if (phase === COMBAT_PHASES.ATTACK || phase === 'attack') {
                if (hasAttack) {
                    return {
                        disabled: false,
                        dimmed: false,
                        relevant: true,
                        reason: t('ui.cardReasons.recommendedAttack') || 'Empfohlen: Angriff'
                    };
                }
                return {
                    disabled: false,
                    dimmed: true,
                    relevant: false,
                    reason: t('ui.cardReasons.wrongPhaseAttack') || 'Jetzt Angriff-Phase — diese Karte greift nicht an'
                };
            }
            if (phase === COMBAT_PHASES.RANGED || phase === 'ranged') {
                if (hasRanged) {
                    return {
                        disabled: false,
                        dimmed: false,
                        relevant: true,
                        reason: t('ui.cardReasons.recommendedRanged') || 'Empfohlen: Fernkampf'
                    };
                }
                // Allow other cards but dim non-ranged
                return {
                    disabled: false,
                    dimmed: true,
                    relevant: false,
                    reason: t('ui.cardReasons.wrongPhaseRanged') || 'Jetzt Fernkampf — keine Fern-/Belagerungskarte'
                };
            }
        } else {
            // Exploration: highlight movement when no MP left
            const mp = game?.hero?.movementPoints ?? 0;
            if (mp <= 0 && hasMove) {
                return {
                    disabled: false,
                    dimmed: false,
                    relevant: true,
                    reason: t('ui.cardReasons.recommendedMove') || 'Empfohlen: Bewegung'
                };
            }
        }

        return { disabled: false, dimmed: false, relevant: false };
    }

    /**
     * Render hand cards
     * @param {any[]} hand - List of card objects
     * @param {Function} onCardClick - Callback for card click
     * @param {Function} [onCardRightClick] - Optional callback for right click
     */
    public renderHandCards(
        hand: any[],
        onCardClick: (index: number, card: any) => void,
        onCardRightClick?: (index: number, card: any) => void
    ): void {
        if (!this.elements || !this.elements.handCards) return;
        if (onCardClick) this.callbacks.onCardClick = onCardClick;
        if (onCardRightClick) this.callbacks.onCardRightClick = onCardRightClick;

        // Inject styles once
        if (!this.stylesInjected) {
            injectCardPreviewStyles();
            this.stylesInjected = true;
        }

        this.elements.handCards.innerHTML = '';
        const game = this.ui?.game;

        hand.forEach((card, index) => {
            const isWound = typeof card.isWound === 'function' ? card.isWound() : !!card.isWound;
            const ctx = this.assessCardContext(card, game);

            // Card data for new component
            const cardData = {
                id: card.id || `card_${index}`,
                name: card.name,
                color: card.color,
                type: card.type,
                basicEffect: card.basicEffect || {},
                strongEffect: card.strongEffect,
                isWound: () => isWound,
                canPlaySideways: () => card.canPlaySideways?.() ?? !isWound,
                getEffect: (strong: boolean) => (strong ? card.strongEffect : card.basicEffect)
            };

            const cardEl = createCard({
                card: cardData,
                compact: true,
                showSideways: true,
                showManaCost: true,
                isWound,
                disabled: ctx.disabled,
                disabledReason: ctx.reason,
                dimmed: ctx.dimmed,
                relevant: ctx.relevant,
                selected: false,
                played: false,
                onClick: (cardData: CardData, useStrong: boolean) => {
                    if (ctx.disabled) return;
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound[useStrong ? 'cardPlayStrong' : 'cardPlay']();
                    }
                    onCardClick(index, card);
                },
                onPreview: (cardData: CardData) => {
                    showCardPreview({
                        card: cardData,
                        onPlay: (useStrong: boolean) => {
                            if (this.ui && this.ui.game && this.ui.game.sound) {
                                this.ui.game.sound[useStrong ? 'cardPlayStrong' : 'cardPlay']();
                            }
                            onCardClick(index, card);
                        },
                        onPlaySideways: (effectType: string) => {
                            if (this.ui && this.ui.game && this.ui.game.sound) {
                                this.ui.game.sound.cardPlaySideways();
                            }
                            // Handle sideways play via existing right-click or new system
                            const actionManager = this.ui?.game?.actionManager;
                            if (actionManager && typeof actionManager.playCardSideways === 'function') {
                                actionManager.playCardSideways(index, effectType);
                            }
                        }
                    });
                },
                onKeySelect: (cardData: CardData, useStrong: boolean) => {
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound[useStrong ? 'cardPlayStrong' : 'cardPlay']();
                    }
                    onCardClick(index, card);
                }
            });

            // Animate card draw only if it's new
            if (!this.animatedCards.has(card)) {
                (CardAnimations as any).animateCardDraw(cardEl, index);
                this.animatedCards.set(card, true);
            }

            // Custom click handling to co-exist with Drag & Drop
            const CLICK_THRESHOLD = 5;
            let startX = 0;
            let startY = 0;
            let isClick = true;

            // Note: createCard handles its own click/preview events
            // We just need to add drag & drop and tooltip integration

            // Drag and Drop
            if (!isWound) {
                cardEl.draggable = true;
                cardEl.addEventListener('dragstart', (e: DragEvent) => {
                    if (e.dataTransfer) {
                        e.dataTransfer.setData('text/plain', index.toString());
                        e.dataTransfer.effectAllowed = 'copyMove';
                    }
                    cardEl.classList.add('dragging');
                    this.tooltipManager.hideTooltip();

                    // Add subtle scale down during drag
                    setTimeout(() => (cardEl.style.opacity = '0.5'), 0);
                });

                cardEl.addEventListener('dragend', () => {
                    cardEl.classList.remove('dragging');
                    cardEl.style.opacity = '1';
                });
            }

            // Add tooltip events (hover + keyboard focus for a11y parity)
            if (!isWound) {
                const showCard = () => this.tooltipManager.showCardTooltip(cardEl, card);
                const hideCard = () => this.tooltipManager.hideTooltip(100);
                cardEl.addEventListener('mouseenter', showCard);
                cardEl.addEventListener('mouseleave', hideCard);
                cardEl.addEventListener('focus', showCard);
                cardEl.addEventListener('blur', hideCard);
            }

            this.elements.handCards!.appendChild(cardEl);
        });
    }

    /**
     * Create card HTML element
     * @param {any} card - Card object
     * @param {number} index - Index in hand
     * @returns {HTMLElement} Card element
     */
    public createCardElement(card: any, index: number): HTMLElement {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.index = index.toString();
        cardDiv.dataset.color = card.color; // For CSS styling

        const isWound = typeof card.isWound === 'function' ? card.isWound() : !!card.isWound;

        if (isWound) {
            cardDiv.classList.add('wound-card');
            cardDiv.innerHTML = `
                <div class="card-icon-large">💔</div>
                <div class="card-header">
                    <span class="card-name">${card.name}</span>
                </div>
                <div class="card-effects">
                    <div class="card-effect">${(t as any)('cards.woundHint')}</div>
                </div>
            `;
            return cardDiv;
        }

        // Get large icon based on card color/type
        const cardIcon = this.getCardIcon(card);
        const colorName = this.getColorName(card.color);

        const basicEffect = this.formatEffect(card.basicEffect);
        const strongEffect = this.formatEffect(card.strongEffect);

        cardDiv.innerHTML = `
            <div class="card-icon-large">${cardIcon}</div>
            <div class="card-type-badge" style="background: ${this.getColorHex(card.color)};">
                ${colorName}
            </div>
            ${card.manaCost > 0 ? `<div class="card-mana-cost">${card.manaCost}</div>` : ''}
            <div class="card-header">
                <span class="card-name">${card.name}</span>
            </div>
            <div class="card-effects">
                <div class="card-effect"><strong>${(t as any)('cards.basic')}:</strong> ${basicEffect}</div>
                ${
                    strongEffect && strongEffect !== (t as any)('cards.none')
                        ? `<div class="card-effect"><strong>${(t as any)('cards.strong')}:</strong> ${strongEffect}</div>`
                        : ''
                }
            </div>
            <div class="card-hint">${(t as any)('cards.sidewaysAction')}</div>
        `;
        return cardDiv;
    }

    /**
     * Get large icon for card type
     * @param {any} card - Card object
     * @returns {string} Icon string
     */
    public getCardIcon(card: any): string {
        // Determine icon based on card color and primary effect
        if (card.color === 'red') return '⚔️';
        if (card.color === 'blue') return '🛡️';
        if (card.color === 'green') return '👣';
        if (card.color === 'white') return '💬';
        return '🎴';
    }

    /**
     * Get color name representation
     * @param {string} color - Card color
     * @returns {string} Color name
     */
    public getColorName(color: string): string {
        const names: Record<string, string> = {
            red: 'Angriff',
            blue: 'Block',
            green: 'Bewegung',
            white: 'Einfluss'
        };
        return names[color] || color;
    }

    /**
     * Format card effect for display
     * @param {any} effect - Effect object
     * @returns {string} Formatted effect
     */
    public formatEffect(effect: any): string {
        if (!effect) return (t as any)('cards.none');
        const parts: string[] = [];
        if (effect.movement) parts.push(`+${effect.movement} 👣`);
        if (effect.attack) parts.push(`+${effect.attack} ⚔️`);
        if (effect.block) parts.push(`+${effect.block} 🛡️`);
        if (effect.influence) parts.push(`+${effect.influence} 💬`);
        if (effect.healing) parts.push(`+${effect.healing} ❤️`);
        return parts.join(' ') || (t as any)('cards.none');
    }

    /**
     * Get hex color for mana color
     * @param {string} color - Mana color
     * @returns {string} Hex color
     */
    public getColorHex(color: string): string {
        const colors: Record<string, string> = {
            red: '#ef4444',
            blue: '#3b82f6',
            white: '#f3f4f6',
            green: '#10b981',
            gold: '#fbbf24',
            black: '#1f2937'
        };
        return colors[color] || '#6b7280';
    }

    /**
     * Show played cards area
     */
    public showPlayArea(): void {
        if (this.elements.playArea) this.elements.playArea.style.display = 'flex';
    }

    /**
     * Hide played cards area
     */
    public hidePlayArea(): void {
        if (this.elements.playArea) {
            this.elements.playArea.style.display = 'none';
        }
        if (this.elements.playedCards) {
            this.elements.playedCards.innerHTML = '';
        }
    }

    /**
     * Add card to played area
     * @param {any} card - Card object
     * @param {any} effect - Effect used
     */
    public addPlayedCard(card: any, effect: any): void {
        const cardEl = this.createCardElement(card, -1);
        cardEl.classList.add('played');

        const effectDiv = document.createElement('div');
        effectDiv.style.fontSize = '0.75rem';
        effectDiv.style.marginTop = '0.5rem';
        effectDiv.style.color = '#fbbf24';
        effectDiv.textContent = this.formatEffect(effect);
        cardEl.appendChild(effectDiv);

        if (this.elements.playedCards) {
            this.elements.playedCards.appendChild(cardEl);
        }

        // Animate card play to area
        if (this.elements.playArea) {
            (CardAnimations as any).animateCardPlay(cardEl, this.elements.playArea);
        }
    }
}
