import { store, ACTIONS } from '../game/Store';
import { t } from '../i18n/index';
import * as CardAnimations from '../cardAnimations';
import { UIElements } from '../ui';
import { TooltipManager } from './TooltipManager';

export class HandRenderer {
    private elements: UIElements;
    private tooltipManager: TooltipManager;
    private ui: any;
    private callbacks: {
        onCardClick: ((index: number, card: any) => void) | null;
        onCardRightClick: ((index: number, card: any) => void) | null;
    };
    private animatedCards: WeakMap<any, boolean> = new WeakMap(); // Track if a card instance has been animated

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
                    this.renderHandCards(state.hero.hand, this.callbacks.onCardClick, this.callbacks.onCardRightClick || undefined);
                }
            }
        });
    }

    /**
     * Render hand cards
     * @param {any[]} hand - List of card objects
     * @param {Function} onCardClick - Callback for card click
     * @param {Function} [onCardRightClick] - Optional callback for right click
     */
    public renderHandCards(hand: any[], onCardClick: (index: number, card: any) => void, onCardRightClick?: (index: number, card: any) => void): void {
        if (!this.elements || !this.elements.handCards) return;
        if (onCardClick) this.callbacks.onCardClick = onCardClick;
        if (onCardRightClick) this.callbacks.onCardRightClick = onCardRightClick;
        this.elements.handCards.innerHTML = '';

        hand.forEach((card, index) => {
            const isWound = typeof card.isWound === 'function' ? card.isWound() : !!card.isWound;
            const cardEl = this.createCardElement(card, index);

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

            cardEl.addEventListener('pointerdown', (e) => {
                startX = e.clientX;
                startY = e.clientY;
                isClick = true;
            });

            cardEl.addEventListener('pointermove', (e) => {
                if (!isClick) return;
                const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
                if (dist > CLICK_THRESHOLD) {
                    isClick = false;
                }
            });

            cardEl.addEventListener('pointerup', (e) => {
                if (isClick && e.button === 0) { // Left click only
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound.cardPlay();
                    }
                    onCardClick(index, card);
                }
            });

            cardEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.ui && this.ui.game && this.ui.game.sound) {
                    this.ui.game.sound.cardPlaySideways();
                }
                if (onCardRightClick) onCardRightClick(index, card);
            });

            // Add 3D tilt on mouse move
            let isHovering = false;
            let cachedRect: DOMRect | null = null;
            cardEl.addEventListener('mouseenter', () => {
                isHovering = true;
                cachedRect = cardEl.getBoundingClientRect(); // Cache layout once
                if (this.ui && this.ui.game && this.ui.game.sound) {
                    this.ui.game.sound.hover();
                }
            });

            cardEl.addEventListener('mousemove', (e: MouseEvent) => {
                if (isHovering && !isWound) {
                    // Pass cached rect to avoid forced reflow
                    (CardAnimations as any).animate3DTilt(cardEl, e.clientX, e.clientY, cachedRect);
                }
            });

            cardEl.addEventListener('mouseleave', () => {
                isHovering = false;
                (CardAnimations as any).reset3DTilt(cardEl);
            });

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
                    setTimeout(() => cardEl.style.opacity = '0.5', 0);
                });

                cardEl.addEventListener('dragend', () => {
                    cardEl.classList.remove('dragging');
                    cardEl.style.opacity = '1';
                });
            }

            // Add tooltip events
            if (!isWound) {
                cardEl.addEventListener('mouseenter', () => {
                    this.tooltipManager.showCardTooltip(cardEl, card);
                });
                cardEl.addEventListener('mouseleave', () => {
                    this.tooltipManager.hideTooltip(100);
                });
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
                ${strongEffect && strongEffect !== (t as any)('cards.none') ?
                `<div class="card-effect"><strong>${(t as any)('cards.strong')}:</strong> ${strongEffect}</div>` : ''}
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
