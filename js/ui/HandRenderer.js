import * as CardAnimations from '../cardAnimations.js';

export class HandRenderer {
    constructor(elements, tooltipManager) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
    }

    // Render hand cards
    renderHandCards(hand, onCardClick, onCardRightClick) {
        this.elements.handCards.innerHTML = '';

        hand.forEach((card, index) => {
            const cardEl = this.createCardElement(card, index);

            // Animate card draw with stagger
            CardAnimations.animateCardDraw(cardEl, index);

            cardEl.addEventListener('click', () => onCardClick(index, card));
            cardEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (onCardRightClick) onCardRightClick(index, card);
            });

            // Add 3D tilt on mouse move
            let isHovering = false;
            cardEl.addEventListener('mouseenter', () => {
                isHovering = true;
            });

            cardEl.addEventListener('mousemove', (e) => {
                if (isHovering && !card.isWound()) {
                    CardAnimations.animate3DTilt(cardEl, e.clientX, e.clientY);
                }
            });

            cardEl.addEventListener('mouseleave', () => {
                isHovering = false;
                CardAnimations.reset3DTilt(cardEl);
            });

            // Add tooltip events
            if (!card.isWound()) {
                cardEl.addEventListener('mouseenter', () => {
                    this.tooltipManager.showCardTooltip(cardEl, card);
                });
                cardEl.addEventListener('mouseleave', () => {
                    this.tooltipManager.hideTooltip(100);
                });
            }

            this.elements.handCards.appendChild(cardEl);
        });
    }

    // Create card HTML element
    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.index = index;
        cardDiv.dataset.color = card.color; // For CSS styling

        if (card.isWound()) {
            cardDiv.classList.add('wound-card');
            cardDiv.innerHTML = `
                <div class="card-icon-large">💔</div>
                <div class="card-header">
                    <span class="card-name">${card.name}</span>
                </div>
                <div class="card-effects">
                    <div class="card-effect">Blockiert einen Kartenslot</div>
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
                <div class="card-effect"><strong>Basic:</strong> ${basicEffect}</div>
                ${strongEffect && strongEffect !== 'Keine' ?
        `<div class="card-effect"><strong>Strong:</strong> ${strongEffect}</div>` : ''}
            </div>
            <div class="card-hint">Rechtsklick: Seitlich (+1)</div>
        `;

        return cardDiv;
    }

    // Get large icon for card type
    getCardIcon(card) {
        // Determine icon based on card color and primary effect
        if (card.color === 'red') return '⚔️';
        if (card.color === 'blue') return '🛡️';
        if (card.color === 'green') return '👣';
        if (card.color === 'white') return '💬';
        return '🎴';
    }

    // Get color name in German
    getColorName(color) {
        const names = {
            red: 'Angriff',
            blue: 'Block',
            green: 'Bewegung',
            white: 'Einfluss'
        };
        return names[color] || color;
    }

    // Format card effect for display
    formatEffect(effect) {
        const parts = [];
        if (effect.movement) parts.push(`+${effect.movement} 👣`);
        if (effect.attack) parts.push(`+${effect.attack} ⚔️`);
        if (effect.block) parts.push(`+${effect.block} 🛡️`);
        if (effect.influence) parts.push(`+${effect.influence} 💬`);
        if (effect.healing) parts.push(`+${effect.healing} ❤️`);
        return parts.join(' ') || 'Keine';
    }

    // Get hex color for mana color
    getColorHex(color) {
        const colors = {
            red: '#ef4444',
            blue: '#3b82f6',
            white: '#f3f4f6',
            green: '#10b981',
            gold: '#fbbf24',
            black: '#1f2937'
        };
        return colors[color] || '#6b7280';
    }

    // Show played cards area
    showPlayArea() {
        this.elements.playArea.style.display = 'flex';
    }

    // Hide played cards area
    hidePlayArea() {
        this.elements.playArea.style.display = 'none';
        this.elements.playedCards.innerHTML = '';
    }

    // Add card to played area
    addPlayedCard(card, effect) {
        const cardEl = this.createCardElement(card, -1);
        cardEl.classList.add('played');

        const effectDiv = document.createElement('div');
        effectDiv.style.fontSize = '0.75rem';
        effectDiv.style.marginTop = '0.5rem';
        effectDiv.style.color = '#fbbf24';
        effectDiv.textContent = this.formatEffect(effect);
        cardEl.appendChild(effectDiv);

        this.elements.playedCards.appendChild(cardEl);

        // Animate card play to area
        if (this.elements.playArea) {
            CardAnimations.animateCardPlay(cardEl, this.elements.playArea);
        }
    }
}
