import { TooltipManager } from './ui/TooltipManager.js';
import { NotificationManager } from './ui/NotificationManager.js';
import { ModalManager } from './ui/ModalManager.js';
import { CombatUIManager } from './ui/CombatUIManager.js';
import { animator, animateCounter } from './animator.js';
import * as CardAnimations from './cardAnimations.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS } from './constants.js';

/**
 * User Interface Controller (Orchestrator)
 * Manages core HUD elements and delegates specific UI logic to specialized managers.
 */
export class UI {
    constructor() {
        this.elements = this.getElements();

        // Initialize specialized managers
        this.tooltipManager = new TooltipManager();
        this.notifications = new NotificationManager(this.elements);
        this.modals = new ModalManager(this.elements, this);
        this.combatUI = new CombatUIManager(this.elements, this);

        this.setupEventListeners();
        this.setupTooltips();
        this.setupGlobalListeners();
    }

    /**
     * Registers global event listeners for the EventBus.
     * Handles logs, toasts, notifications, and stat updates.
     * @private
     */
    setupGlobalListeners() {
        this._logAddedHandler = ({ message, type }) => this.notifications.addLog(message, type);
        this._toastShowHandler = ({ message, type }) => this.notifications.showToast(message, type);
        this._notificationHandler = ({ message, type }) => this.notifications.showNotification(message, type);
        this._statsHandler = (hero) => {
            this.updateHeroStats(hero);
            this.updateMovementPoints(hero.movementPoints);
        };

        eventBus.on(GAME_EVENTS.LOG_ADDED, this._logAddedHandler);
        eventBus.on(GAME_EVENTS.TOAST_SHOW, this._toastShowHandler);
        eventBus.on(GAME_EVENTS.NOTIFICATION_SHOW, this._notificationHandler);
        eventBus.on(GAME_EVENTS.STAMP_STATS_UPDATED, this._statsHandler);
    }

    /**
     * Removes global event listeners to prevent memory leaks.
     */
    destroy() {
        if (this._logAddedHandler) eventBus.off(GAME_EVENTS.LOG_ADDED, this._logAddedHandler);
        if (this._toastShowHandler) eventBus.off(GAME_EVENTS.TOAST_SHOW, this._toastShowHandler);
        if (this._notificationHandler) eventBus.off(GAME_EVENTS.NOTIFICATION_SHOW, this._notificationHandler);
    }

    /**
     * Initializes tooltips for static UI elements.
     * @private
     */
    setupTooltips() {
        // Hero Stats
        this.tooltipManager.attachToElement(this.elements.heroArmor,
            this.tooltipManager.createStatTooltipHTML('Rüstung', 'Reduziert den Schaden, den du im Kampf erleidest.'));

        this.tooltipManager.attachToElement(this.elements.heroHandLimit,
            this.tooltipManager.createStatTooltipHTML('Handlimit', 'Die maximale Anzahl an Karten, die du am Ende deines Zuges auf der Hand haben darfst.'));

        this.tooltipManager.attachToElement(this.elements.heroWounds,
            this.tooltipManager.createStatTooltipHTML('Verletzungen', 'Verletzungen blockieren deine Hand. Raste oder heile dich, um sie loszuwerden.'));

        this.tooltipManager.attachToElement(this.elements.fameValue.parentElement,
            this.tooltipManager.createStatTooltipHTML('Ruhm', 'Erfahrungspunkte. Sammle Ruhm durch Kämpfe und Erkundung, um im Level aufzusteigen.'));

        this.tooltipManager.attachToElement(this.elements.reputationValue.parentElement,
            this.tooltipManager.createStatTooltipHTML('Ansehen', 'Beeinflusst Interaktionen in Dörfern und Klöstern. Hohes Ansehen macht Rekrutierung günstiger.'));

        // Phase Indicator
        const phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) {
            this.tooltipManager.attachToElement(phaseEl,
                this.tooltipManager.createStatTooltipHTML('Aktuelle Phase', 'Zeigt an, was du gerade tun kannst. Beachte den Hinweis darunter.'));
        }
    }


    /**
     * Caches references to critical DOM elements for performance.
     * @private
     * @returns {Object} Dictionary of DOM elements
     */
    getElements() {
        return {
            // Stats
            fameValue: document.getElementById('fame-value'),
            reputationValue: document.getElementById('reputation-value'),
            heroName: document.getElementById('hero-name'),
            heroArmor: document.getElementById('hero-armor'),
            heroHandLimit: document.getElementById('hero-handlimit'),
            heroWounds: document.getElementById('hero-wounds'),
            movementPoints: document.getElementById('movement-points'),

            // Buttons
            endTurnBtn: document.getElementById('end-turn-btn'),
            restBtn: document.getElementById('rest-btn'),
            exploreBtn: document.getElementById('explore-btn'),
            newGameBtn: document.getElementById('new-game-btn'),

            // Areas
            handCards: document.getElementById('hand-cards'),
            playedCards: document.getElementById('played-cards'),
            playArea: document.getElementById('play-area'),
            manaSource: document.getElementById('mana-source'),
            gameLog: document.getElementById('game-log'),
            combatPanel: document.getElementById('combat-panel'),
            combatInfo: document.getElementById('combat-info'),
            combatUnits: document.getElementById('combat-units'),
            heroUnits: document.getElementById('hero-units'),
            healBtn: document.getElementById('heal-btn'),

            // Canvas
            gameBoard: document.getElementById('game-board'),

            // Site Modal
            siteModal: document.getElementById('site-modal'),
            siteClose: document.getElementById('site-close'),
            siteModalIcon: document.getElementById('site-modal-icon'),
            siteModalTitle: document.getElementById('site-modal-title'),
            siteModalDescription: document.getElementById('site-modal-description'),
            siteOptions: document.getElementById('site-options'),
            siteCloseBtn: document.getElementById('site-close-btn'),

            // Level Up Modal
            levelUpModal: document.getElementById('level-up-modal'),
            newLevelDisplay: document.getElementById('new-level-display'),
            skillChoices: document.getElementById('skill-choices'),
            cardChoices: document.getElementById('card-choices'),
            confirmLevelUpBtn: document.getElementById('confirm-level-up')
        };
    }

    setupEventListeners() {
        // Event listeners will be set from game.js
        if (this.elements.siteClose) {
            this.elements.siteClose.addEventListener('click', () => this.hideSiteModal());
        }
    }

    // Show floating text animation
    showFloatingText(element, text, color = '#fff') {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const floatEl = document.createElement('div');
        floatEl.className = 'floating-text';
        floatEl.textContent = text;
        floatEl.style.color = color;
        floatEl.style.left = `${rect.left + rect.width / 2}px`;
        floatEl.style.top = `${rect.top}px`;

        document.body.appendChild(floatEl);

        // Remove after animation
        floatEl.addEventListener('animationend', () => {
            floatEl.remove();
        });
    }

    // Update hero stats display
    updateHeroStats(hero) {
        const stats = hero.getStats();
        if (this.elements.heroName) this.elements.heroName.textContent = stats.name;

        // Animate numeric values (with null checks)
        if (this.elements.heroArmor) {
            const currentArmor = parseInt(this.elements.heroArmor.textContent) || 0;
            if (currentArmor !== stats.armor) {
                animateCounter(this.elements.heroArmor, currentArmor, stats.armor, 500, animator);
                const diff = stats.armor - currentArmor;
                if (diff !== 0) this.showFloatingText(this.elements.heroArmor, `${diff > 0 ? '+' : ''}${diff} 🛡️`, diff > 0 ? '#10b981' : '#ef4444');
            }
        }

        if (this.elements.heroHandLimit) {
            const currentHand = parseInt(this.elements.heroHandLimit.textContent) || 0;
            if (currentHand !== stats.handLimit) {
                this.elements.heroHandLimit.textContent = stats.handLimit;
                const diff = stats.handLimit - currentHand;
                if (diff !== 0) this.showFloatingText(this.elements.heroHandLimit, `${diff > 0 ? '+' : ''}${diff} 🎴`, '#3b82f6');
            }
        }

        if (this.elements.heroWounds) {
            const currentWounds = parseInt(this.elements.heroWounds.textContent) || 0;
            if (currentWounds !== stats.wounds) {
                this.elements.heroWounds.textContent = stats.wounds;
                const diff = stats.wounds - currentWounds;
                if (diff > 0) this.showFloatingText(this.elements.heroWounds, `+${diff} 💔`, '#ef4444');
            }
        }

        if (this.elements.fameValue) {
            const currentFame = parseInt(this.elements.fameValue.textContent) || 0;
            if (currentFame !== stats.fame) {
                animateCounter(this.elements.fameValue, currentFame, stats.fame, 1000, animator);
                const diff = stats.fame - currentFame;
                if (diff > 0) this.showFloatingText(this.elements.fameValue, `+${diff} ⭐`, '#fbbf24');
            }
        }

        if (this.elements.reputationValue) {
            const currentRep = parseInt(this.elements.reputationValue.textContent) || 0;
            if (currentRep !== stats.reputation) {
                animateCounter(this.elements.reputationValue, currentRep, stats.reputation, 800, animator);
                const diff = stats.reputation - currentRep;
                if (diff !== 0) this.showFloatingText(this.elements.reputationValue, `${diff > 0 ? '+' : ''}${diff} 💬`, '#f3f4f6');
            }
        }

        // Update healing button visibility
        if (this.elements.healBtn) {
            const hasWounds = stats.wounds > 0;
            const hasHealing = hero.healingPoints > 0;
            this.elements.healBtn.style.display = (hasWounds && hasHealing) ? 'block' : 'none';
            this.elements.healBtn.textContent = `Heilen (${hero.healingPoints})`;
        }
    }

    // Update movement points display
    updateMovementPoints(points) {
        this.elements.movementPoints.textContent = points;
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

    // Render mana source
    renderManaSource(manaSource, onDieClick, isNight = false) {
        this.elements.manaSource.innerHTML = '';

        const dice = manaSource.getAvailableDice(isNight);
        dice.forEach((die, index) => {
            const dieEl = document.createElement('div');
            dieEl.className = `mana-die ${die.color}`;
            if (!die.available) {
                dieEl.classList.add('used');
            }

            const icon = this.getManaIcon(die.color);
            dieEl.textContent = icon;

            if (die.available && onDieClick) {
                dieEl.addEventListener('click', () => onDieClick(index, die.color));
            }

            // Add tooltip
            const manaInfo = this.getManaTooltipInfo(die.color);
            let tooltipContent = '';
            if (this.tooltipManager && typeof this.tooltipManager.createStatTooltipHTML === 'function') {
                tooltipContent = this.tooltipManager.createStatTooltipHTML(manaInfo.title, manaInfo.desc);
            }
            this.tooltipManager.attachToElement(dieEl, tooltipContent);

            this.elements.manaSource.appendChild(dieEl);
        });
    }

    getManaTooltipInfo(color) {
        const info = {
            red: { title: 'Rotes Mana', desc: 'Verstärkt Angriffs- und Feuerzauber.' },
            blue: { title: 'Blaues Mana', desc: 'Verstärkt Eiszauber und Block-Effekte.' },
            green: { title: 'Grünes Mana', desc: 'Verstärkt Bewegungs- und Heilzauber.' },
            white: { title: 'Weißes Mana', desc: 'Verstärkt Einfluss und spirituelle Effekte.' },
            gold: { title: 'Goldenes Mana', desc: 'Joker! Kann als jede Farbe (außer Schwarz) verwendet werden. Nur tagsüber.' },
            black: { title: 'Schwarzes Mana', desc: 'Mächtiges, aber gefährliches Mana. Verstärkt dunkle Zauber. Nur nachts.' }
        };
        return info[color] || { title: 'Mana', desc: 'Magische Energie.' };
    }

    // Get mana icon
    getManaIcon(color) {
        const icons = {
            red: '🔥',
            blue: '💧',
            white: '✨',
            green: '🌿',
            gold: '⭐',
            black: '💀'
        };
        return icons[color] || '❓';
    }

    // Render hero's collected mana
    renderHeroMana(manaInventory) {
        // Create or get hero mana display element
        let heroManaEl = document.getElementById('hero-mana');

        if (!heroManaEl) {
            // Create it if it doesn't exist
            const manaPanel = this.elements.manaSource.parentElement;
            const inventoryDiv = document.createElement('div');
            inventoryDiv.className = 'mana-inventory';
            inventoryDiv.innerHTML = '<h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">💎 Gesammelt</h3><div id="hero-mana" class="hero-mana-display"></div>';
            manaPanel.appendChild(inventoryDiv);
            heroManaEl = document.getElementById('hero-mana');
        }

        heroManaEl.innerHTML = '';

        if (!manaInventory || manaInventory.length === 0) {
            heroManaEl.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 0.85rem; padding: 0.5rem;">Kein Mana</div>';
            return;
        }

        manaInventory.forEach(color => {
            const manaEl = document.createElement('div');
            manaEl.className = `mana-die mini ${color}`;
            manaEl.textContent = this.getManaIcon(color);
            manaEl.title = color.toUpperCase();
            heroManaEl.appendChild(manaEl);
        });
    }

    // Log configuration

    addLog(message, type = 'info') { this.notifications.addLog(message, type); }
    clearLog() { this.notifications.clearLog(); }

    showCombatPanel(enemies, phase, onEnemyClick) { this.combatUI.showCombatPanel(enemies, phase, onEnemyClick); }
    hideCombatPanel() { this.combatUI.hideCombatPanel(); }
    updateCombatInfo(enemies, phase, onEnemyClick) { this.combatUI.updateCombatInfo(enemies, phase, onEnemyClick); }
    updateCombatTotals(attackTotal, blockTotal, phase) { this.combatUI.updateCombatTotals(attackTotal, blockTotal, phase); }

    getCombatPhaseName(phase) { return this.combatUI.getCombatPhaseName(phase); }
    getPhaseHint(phase) { return this.combatUI.getPhaseHint(phase); }

    // Render units in hero panel
    renderUnits(units) {
        if (!this.elements.heroUnits) return;

        this.elements.heroUnits.innerHTML = '';

        if (!units || units.length === 0) {
            this.elements.heroUnits.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 1rem; font-size: 0.9rem;">Keine Einheiten</div>';
            return;
        }

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr';
        grid.style.gap = '0.5rem';

        units.forEach(unit => {
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-card';
            unitCard.style.padding = '0.75rem';
            unitCard.style.background = 'rgba(59, 130, 246, 0.1)';
            unitCard.style.border = '2px solid rgba(59, 130, 246, 0.3)';
            unitCard.style.borderRadius = '6px';
            unitCard.style.transition = 'all 0.2s';

            // Status-based styling (with defensive checks for mock units)
            const isReady = typeof unit.isReady === 'function' ? unit.isReady() : true;
            const unitWounds = unit.wounds || 0;
            if (!isReady) {
                unitCard.style.opacity = '0.6';
                unitCard.style.filter = 'grayscale(0.5)';
                unitCard.style.borderColor = 'rgba(107, 114, 128, 0.3)';
            } else if (unitWounds > 0) {
                unitCard.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            } else {
                unitCard.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }

            // Build abilities text (with defensive check)
            const abilities = typeof unit.getAbilities === 'function' ? unit.getAbilities() : [];
            const abilityText = abilities.map(a => a.text).join(' • ');

            const unitIcon = typeof unit.getIcon === 'function' ? unit.getIcon() : '🎖️';
            const unitName = typeof unit.getName === 'function' ? unit.getName() : (unit.name || 'Unit');
            const unitLevel = unit.level || 1;
            const unitArmor = unit.armor || 0;
            const unitResistances = unit.resistances || [];

            unitCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">${unitIcon}</span>
                        <div>
                            <div style="font-weight: 600; color: #e2e8f0;">${unitName}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Level ${unitLevel}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: ${isReady ? '#10b981' : '#6b7280'};">
                            ${isReady ? '✓ Bereit' : '○ Erschöpft'}
                        </div>
                        ${unitWounds > 0 ? `<div style="font-size: 0.8rem; color: #ef4444;">💔 ${unitWounds} Wounds</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
                    ${abilityText}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.8rem;">
                    <span title="Armor">🛡️ ${unitArmor}</span>
                    ${unitResistances.length > 0 ? `<span title="Resistances">🔰 ${unitResistances.join(', ')}</span>` : ''}
                </div>
            `;

            // Hover effects
            unitCard.addEventListener('mouseenter', () => {
                unitCard.style.transform = 'translateY(-2px)';
                unitCard.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            });
            unitCard.addEventListener('mouseleave', () => {
                unitCard.style.transform = 'translateY(0)';
                unitCard.style.boxShadow = 'none';
            });

            grid.appendChild(unitCard);
        });

        this.elements.heroUnits.appendChild(grid);
    }

    renderEnemy(enemy, phase, onClick) { return this.combatUI.renderEnemy(enemy, phase, onClick); }

    renderUnitsInCombat(units, phase, onUnitActivate) { this.combatUI.renderUnitsInCombat(units, phase, onUnitActivate); }

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

    showNotification(message, type = 'info') { this.notifications.showNotification(message, type); }
    showToast(message, type = 'info') { this.notifications.showToast(message, type); }

    // Enable/disable buttons
    setButtonEnabled(button, enabled) {
        if (button) {
            button.disabled = !enabled;
        }
    }

    // Highlight hex on canvas (will be called from game)
    highlightHex(hexGrid, q, r) {
        hexGrid.selectHex(q, r);
    }

    showSiteModal(interactionData) { this.modals.showSiteModal(interactionData); }
    hideSiteModal() { this.modals.hideSiteModal(); }
    renderSiteOptions(options) { this.modals.renderSiteOptions(options); }

    // Reset UI for new game
    reset() {
        this.clearLog();
        this.elements.handCards.innerHTML = '';
        this.elements.playedCards.innerHTML = '';
        this.hidePlayArea();
        this.elements.heroUnits.innerHTML = '';
        this.elements.combatUnits.innerHTML = '';
        this.hideCombatPanel();
        this.elements.manaSource.innerHTML = '';

        const heroMana = document.getElementById('hero-mana');
        if (heroMana) heroMana.innerHTML = '';

        // Reset stats display (with null checks)
        if (this.elements.fameValue) this.elements.fameValue.textContent = '0';
        if (this.elements.reputationValue) this.elements.reputationValue.textContent = '0';
        if (this.elements.movementPoints) this.elements.movementPoints.textContent = '0';
        if (this.elements.heroArmor) this.elements.heroArmor.textContent = '2'; // Default
        if (this.elements.heroHandLimit) this.elements.heroHandLimit.textContent = '5'; // Default
        if (this.elements.heroWounds) this.elements.heroWounds.textContent = '0';
    }

    // --- Level Up Modal Logic ---
    showLevelUpModal(newLevel, choices, onConfirm) {
        this.modals.showLevelUpModal(newLevel, choices, onConfirm);
    }
}

export default UI;
