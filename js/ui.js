import TooltipManager from './tooltip.js';
import { animator, animateCounter } from './animator.js';
import * as CardAnimations from './cardAnimations.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS } from './constants.js';

/**
 * User Interface Controller
 * Manages all DOM interactions, event listeners (outside game loop), and visual updates.
 */
export class UI {
    constructor() {
        this.elements = this.getElements();
        this.tooltipManager = new TooltipManager();
        this.setupEventListeners();
        this.setupTooltips();
        this.setupToastContainer();
        this.setupGlobalListeners();
    }

    /**
     * Registers global event listeners for the EventBus.
     * Handles logs, toasts, notifications, and stat updates.
     * @private
     */
    setupGlobalListeners() {
        this._logAddedHandler = ({ message, type }) => this.addLog(message, type);
        this._toastShowHandler = ({ message, type }) => this.showToast(message, type);
        this._notificationHandler = ({ message, type }) => this.showNotification(message, type);
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

    setupToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
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
        this.elements.heroName.textContent = stats.name;

        // Animate numeric values
        const currentArmor = parseInt(this.elements.heroArmor.textContent) || 0;
        if (currentArmor !== stats.armor) {
            animateCounter(this.elements.heroArmor, currentArmor, stats.armor, 500, animator);
            const diff = stats.armor - currentArmor;
            if (diff !== 0) this.showFloatingText(this.elements.heroArmor, `${diff > 0 ? '+' : ''}${diff} 🛡️`, diff > 0 ? '#10b981' : '#ef4444');
        }

        const currentHand = parseInt(this.elements.heroHandLimit.textContent) || 0;
        if (currentHand !== stats.handLimit) {
            this.elements.heroHandLimit.textContent = stats.handLimit;
            const diff = stats.handLimit - currentHand;
            if (diff !== 0) this.showFloatingText(this.elements.heroHandLimit, `${diff > 0 ? '+' : ''}${diff} 🎴`, '#3b82f6');
        }

        const currentWounds = parseInt(this.elements.heroWounds.textContent) || 0;
        if (currentWounds !== stats.wounds) {
            this.elements.heroWounds.textContent = stats.wounds;
            const diff = stats.wounds - currentWounds;
            if (diff > 0) this.showFloatingText(this.elements.heroWounds, `+${diff} 💔`, '#ef4444');
        }

        const currentFame = parseInt(this.elements.fameValue.textContent) || 0;
        if (currentFame !== stats.fame) {
            animateCounter(this.elements.fameValue, currentFame, stats.fame, 1000, animator);
            const diff = stats.fame - currentFame;
            if (diff > 0) this.showFloatingText(this.elements.fameValue, `+${diff} ⭐`, '#fbbf24');
        }

        const currentRep = parseInt(this.elements.reputationValue.textContent) || 0;
        if (currentRep !== stats.reputation) {
            animateCounter(this.elements.reputationValue, currentRep, stats.reputation, 800, animator);
            const diff = stats.reputation - currentRep;
            if (diff !== 0) this.showFloatingText(this.elements.reputationValue, `${diff > 0 ? '+' : ''}${diff} 💬`, '#f3f4f6');
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
            this.tooltipManager.attachToElement(dieEl,
                this.tooltipManager.createStatTooltipHTML(manaInfo.title, manaInfo.desc));

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

    // Add log entry
    addLog(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;

        this.elements.gameLog.appendChild(entry);
        this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
    }

    // Clear log
    clearLog() {
        this.elements.gameLog.innerHTML = '';
    }

    // Show combat panel
    showCombatPanel(enemies, phase, onEnemyClick) {
        this.elements.combatPanel.style.display = 'block';
        this.updateCombatInfo(enemies, phase, onEnemyClick);
    }

    // Hide combat panel
    hideCombatPanel() {
        this.elements.combatPanel.style.display = 'none';
        this.elements.combatInfo.innerHTML = '';
    }

    // Update combat info
    updateCombatInfo(enemies, phase, onEnemyClick) {
        this.elements.combatInfo.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <strong>Phase:</strong> ${this.getCombatPhaseName(phase)}
            </div>
        `;

        enemies.forEach(enemy => {
            const enemyDiv = this.renderEnemy(enemy, phase, onEnemyClick); // Use the new renderEnemy method
            this.elements.combatInfo.appendChild(enemyDiv);
        });
    }

    // Update combat totals (accumulated attack/block)
    updateCombatTotals(attackTotal, blockTotal, phase) {
        const totalsDiv = document.getElementById('combat-totals');
        if (!totalsDiv) {
            // Create totals div if it doesn't exist
            const newTotalsDiv = document.createElement('div');
            newTotalsDiv.id = 'combat-totals';
            newTotalsDiv.style.cssText = 'margin: 1rem 0; padding: 0.75rem; background: rgba(255,255,255,0.1); border-radius: 8px;';
            this.elements.combatInfo.insertBefore(newTotalsDiv, this.elements.combatInfo.firstChild);
        }

        const totalsDisplay = document.getElementById('combat-totals');
        if (totalsDisplay) {
            const COMBAT_PHASE = { BLOCK: 'block', ATTACK: 'attack' };
            let html = '<div style="display: flex; gap: 1rem; justify-content: space-around;">';

            if (phase === COMBAT_PHASE.BLOCK) {
                html += `<div style="text-align: center;">
                    <div style="font-size: 0.9em; opacity: 0.8;">Total Block</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #4a9eff;">${blockTotal}</div>
                </div>`;
            } else if (phase === COMBAT_PHASE.ATTACK) {
                html += `<div style="text-align: center;">
                    <div style="font-size: 0.9em; opacity: 0.8;">Total Attack</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #ff4a4a;">${attackTotal}</div>
                </div>`;
            } else if (phase === 'ranged') {
                // We need pass Ranged total here, but signature is (attackTotal, blockTotal, phase).
                // Let's assume attackTotal contains ranged total for this phase call.
                // Or we can modify the UI signature?
                // game.js calls updateCombatTotals() with NO arguments usually, getting values from game context?
                // The current signature assumes args are passed.
                // But wait, line 436 definition: updateCombatTotals(attackTotal, blockTotal, phase).
                // game.js usage: this.ui.updateCombatTotals(this.combatAttackTotal, this.combatBlockTotal, this.combat.phase);
                // I need to change game.js to pass ranged total OR overload attackTotal.

                // Let's overload attackTotal for Ranged Phase since it's "Attack" anyway.
                html += `<div style="text-align: center;">
                    <div style="font-size: 0.9em; opacity: 0.8;">Fernkampf</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #fbbf24;">${attackTotal}</div>
                </div>`;
            }

            html += '</div>';
            totalsDisplay.innerHTML = html;
        }

        // Show/hide execute attack button based on phase
        // Show/hide execute attack button based on phase
        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) {
            const COMBAT_PHASE = { ATTACK: 'attack', RANGED: 'ranged' };
            // In Ranged phase, we don't have a single "Execute" button usually, we click enemies.
            // But if we want to Skip Ranged Phase, we need a button.
            // game.js needs to handle this button click.

            // Actually, let's reuse this button for "End Phase" / "Next Phase".
            if (phase === COMBAT_PHASE.RANGED) {
                executeAttackBtn.textContent = "Fernkampf beenden -> Blocken";
                executeAttackBtn.style.display = 'block';
                // We need to ensure the click handler calls endRangedPhase.
                // Currently it probably calls executeAttack?
                // In game.js wiring needed.
            } else if (phase === COMBAT_PHASE.ATTACK) {
                executeAttackBtn.textContent = "Angriff ausführen";
                executeAttackBtn.style.display = 'block';
            } else {
                executeAttackBtn.style.display = 'none';
            }
        }
    }

    // Get combat phase name
    getCombatPhaseName(phase) {
        const names = {
            not_in_combat: 'Kein Kampf',
            ranged: 'Fernkampf-Phase',
            block: 'Block-Phase',
            damage: 'Schadens-Phase',
            attack: 'Angriffs-Phase',
            complete: 'Abgeschlossen'
        };
        return names[phase] || phase;
    }

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

            // Status-based styling
            if (!unit.isReady()) {
                unitCard.style.opacity = '0.6';
                unitCard.style.filter = 'grayscale(0.5)';
                unitCard.style.borderColor = 'rgba(107, 114, 128, 0.3)';
            } else if (unit.wounds > 0) {
                unitCard.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            } else {
                unitCard.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }

            // Build abilities text
            const abilities = unit.getAbilities();
            const abilityText = abilities.map(a => a.text).join(' • ');

            unitCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">${unit.getIcon()}</span>
                        <div>
                            <div style="font-weight: 600; color: #e2e8f0;">${unit.getName()}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Level ${unit.level}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: ${unit.isReady() ? '#10b981' : '#6b7280'};">
                            ${unit.isReady() ? '✓ Bereit' : '○ Erschöpft'}
                        </div>
                        ${unit.wounds > 0 ? `<div style="font-size: 0.8rem; color: #ef4444;">💔 ${unit.wounds} Wounds</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
                    ${abilityText}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.8rem;">
                    <span title="Armor">🛡️ ${unit.armor}</span>
                    ${unit.resistances && unit.resistances.length > 0 ? `<span title="Resistances">🔰 ${unit.resistances.join(', ')}</span>` : ''}
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

    renderEnemy(enemy, phase, onClick) {
        const el = document.createElement('div');
        el.className = 'enemy-card';

        // Boss styling
        if (enemy.isBoss) {
            el.classList.add('boss-card');
            el.style.border = '2px solid #fbbf24';
            el.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0,0,0,0.3))';
        }

        // Add interactive styling if clickable
        // Ranged Phase: Click to Attack
        if (phase === 'ranged' && onClick) {
            el.style.cursor = 'crosshair';
            el.title = 'Klicken für Fernkampf-Angriff';
            el.addEventListener('click', () => onClick(enemy));
            el.addEventListener('mouseenter', () => el.style.boxShadow = '0 0 10px red');
            el.addEventListener('mouseleave', () => el.style.boxShadow = enemy.isBoss ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none');
        }

        // Build boss health bar HTML
        let bossHealthHTML = '';
        if (enemy.isBoss) {
            const healthPercent = enemy.getHealthPercent() * 100;
            const healthColor = healthPercent > 60 ? '#10b981' : healthPercent > 30 ? '#fbbf24' : '#ef4444';
            const phaseName = enemy.getPhaseName();

            bossHealthHTML = `
                <div class="boss-health-section" style="margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        <span style="color: #fbbf24;">👿 ${phaseName}</span>
                        <span style="color: ${healthColor}">${enemy.currentHealth}/${enemy.maxHealth} HP</span>
                    </div>
                    <div class="boss-health-bar" style="
                        width: 100%;
                        height: 8px;
                        background: rgba(0,0,0,0.5);
                        border-radius: 4px;
                        overflow: hidden;
                    ">
                        <div class="boss-health-fill" style="
                            width: ${healthPercent}%;
                            height: 100%;
                            background: linear-gradient(90deg, ${healthColor}, ${healthColor}aa);
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    ${enemy.enraged ? '<div style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;">🔥 WÜTEND! (Angriff erhöht)</div>' : ''}
                </div>
            `;
        }

        el.innerHTML = `
            <div class="enemy-icon" style="color: ${enemy.color}; ${enemy.isBoss ? 'font-size: 2rem;' : ''}">${enemy.icon}</div>
            <div class="enemy-name" style="${enemy.isBoss ? 'font-size: 1.1rem; color: #fbbf24;' : ''}">${enemy.name}</div>
            <div class="enemy-stats">
                <div class="stat" title="Rüstung">🛡️ ${enemy.armor}</div>
                <div class="stat" title="Angriff${enemy.enraged ? ' (Wütend!)' : ''}">⚔️ ${typeof enemy.getEffectiveAttack === 'function' ? enemy.getEffectiveAttack() : enemy.attack}</div>
            </div>
            ${bossHealthHTML}
            <div class="enemy-traits">
                ${enemy.fortified ? '<span title="Befestigt">🏰</span>' : ''}
                ${enemy.swift ? '<span title="Flink (Doppelter Block)">💨</span>' : ''}
                ${enemy.fireResist ? '<span title="Feuer-Resistenz">🔥</span>' : ''}
                ${enemy.iceResist ? '<span title="Eis-Resistenz">❄️</span>' : ''}
                ${enemy.physicalResist ? '<span title="Physische Resistenz">🗿</span>' : ''}
                ${enemy.brutal ? '<span title="Brutal (Doppelter Schaden)">💪</span>' : ''}
                ${enemy.isBoss ? '<span title="Boss">👑</span>' : ''}
            </div>
        `;
        return el;
    }

    renderUnitsInCombat(units, phase, onUnitActivate) {
        if (!this.elements.combatUnits) return;

        this.elements.combatUnits.innerHTML = '';

        if (!units || units.length === 0) {
            return;
        }

        const title = document.createElement('h3');
        title.textContent = '🎖️ Deine Einheiten';
        title.style.fontSize = '0.9rem';
        title.style.marginBottom = '0.5rem';
        this.elements.combatUnits.appendChild(title);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr';
        grid.style.gap = '0.5rem';

        units.forEach(unit => {
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-combat-card';
            unitCard.style.padding = '0.5rem';
            unitCard.style.background = 'rgba(139, 92, 246, 0.1)';
            unitCard.style.border = '1px solid rgba(139, 92, 246, 0.3)';
            unitCard.style.borderRadius = '4px';
            unitCard.style.cursor = unit.isReady() ? 'pointer' : 'not-allowed';
            unitCard.style.opacity = unit.isReady() ? '1' : '0.5';

            if (!unit.isReady()) {
                unitCard.style.filter = 'grayscale(0.5)';
            }

            // Get relevant abilities for current phase
            const abilities = unit.getAbilities().filter(a => {
                if (phase === 'block') return a.type === 'block';
                if (phase === 'attack') return a.type === 'attack';
                return false;
            });

            const hasRelevantAbility = abilities.length > 0;

            unitCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <span style="font-size: 1.2rem;">${unit.getIcon()}</span>
                        <strong>${unit.getName()}</strong>
                    </div>
                    <div style="font-size: 0.85rem; color: ${hasRelevantAbility ? '#10b981' : '#6b7280'};">
                        ${abilities.map(a => a.text).join(', ') || 'Keine passende Fähigkeit'}
                    </div>
                </div>
            `;

            if (unit.isReady() && hasRelevantAbility && onUnitActivate) {
                unitCard.addEventListener('click', () => onUnitActivate(unit));
                unitCard.addEventListener('mouseenter', () => {
                    unitCard.style.background = 'rgba(139, 92, 246, 0.2)';
                    unitCard.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                });
                unitCard.addEventListener('mouseleave', () => {
                    unitCard.style.background = 'rgba(139, 92, 246, 0.1)';
                    unitCard.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                });
            }

            grid.appendChild(unitCard);
        });

        this.elements.combatUnits.appendChild(grid);
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

    // Show notification
    showNotification(message, type = 'info') {
        this.addLog(message, type);
        this.showToast(message, type);
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';
        if (type === 'combat') icon = '⚔️';

        toast.innerHTML = `<span style="font-size: 1.2em;">${icon}</span> <span>${message}</span>`;

        this.toastContainer.appendChild(toast);

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

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

    // Site Interaction UI
    showSiteModal(interactionData) {
        this.elements.siteModalIcon.textContent = interactionData.icon;
        this.elements.siteModalTitle.textContent = interactionData.name;
        this.elements.siteModalTitle.style.color = interactionData.color;
        this.elements.siteModalDescription.textContent = interactionData.description;

        this.renderSiteOptions(interactionData.options);
        this.elements.siteModal.classList.add('active');
    }

    hideSiteModal() {
        this.elements.siteModal.classList.remove('active');
    }

    renderSiteOptions(options) {
        this.elements.siteOptions.innerHTML = '';

        options.forEach(opt => {
            const group = document.createElement('div');
            group.className = 'site-option-group';

            const title = document.createElement('span');
            title.className = 'site-option-title';
            title.textContent = opt.label;
            group.appendChild(title);

            if (opt.subItems) {
                // Render shop grid
                const grid = document.createElement('div');
                grid.className = 'shop-grid';

                opt.subItems.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'shop-item';

                    if (item.type === 'unit') {
                        itemEl.innerHTML = `
                            <div class="shop-item-icon">${item.data.icon}</div>
                            <div class="shop-item-name">${item.data.name}</div>
                            <div class="shop-item-cost">${item.cost} Einfluss</div>
                            <div class="shop-item-stats">🛡️ ${item.data.armor}</div>
                        `;
                    } else if (item.type === 'card') {
                        itemEl.innerHTML = `
                            <div class="shop-item-icon">${item.data.color === 'red' ? '⚔️' : item.data.color === 'green' ? '👣' : '✨'}</div>
                            <div class="shop-item-name">${item.data.name}</div>
                            <div class="shop-item-cost">${item.cost} Einfluss</div>
                        `;
                    }

                    itemEl.addEventListener('click', () => {
                        const result = item.action();
                        if (result.success) {
                            this.showNotification(result.message, 'success');
                            this.hideSiteModal(); // Close after action? Or refresh?
                            // For MVP close.
                        } else {
                            this.showNotification(result.message, 'error');
                        }
                    });

                    grid.appendChild(itemEl);
                });

                group.appendChild(grid);
            } else {
                // Simple button action
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.textContent = 'Ausführen';
                btn.disabled = !opt.enabled;

                btn.addEventListener('click', () => {
                    const result = opt.action();
                    if (result.success) {
                        this.showNotification(result.message, 'success');
                        this.hideSiteModal();
                    } else {
                        this.showNotification(result.message, 'error');
                    }
                });

                group.appendChild(btn);
            }

            this.elements.siteOptions.appendChild(group);
        });
    }

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

        // Reset stats display
        this.elements.fameValue.textContent = '0';
        this.elements.reputationValue.textContent = '0';
        this.elements.movementPoints.textContent = '0';
        this.elements.heroArmor.textContent = '2'; // Default
        this.elements.heroHandLimit.textContent = '5'; // Default
        this.elements.heroWounds.textContent = '0';
    }

    // --- Level Up Modal Logic ---
    showLevelUpModal(newLevel, choices, onConfirm) {
        this.elements.newLevelDisplay.textContent = String(newLevel);
        this.elements.levelUpModal.style.display = 'block';

        let selectedSkill = null;
        let selectedCard = null;

        const updateConfirmButton = () => {
            this.elements.confirmLevelUpBtn.disabled = !selectedSkill || !selectedCard;
        };

        // Render Skills
        this.elements.skillChoices.innerHTML = '';
        choices.skills.forEach(skill => {
            const el = document.createElement('div');
            el.className = 'skill-choice';
            el.innerHTML = `
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
            `;

            el.addEventListener('click', () => {
                // Deselect others
                Array.from(this.elements.skillChoices.children).forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                selectedSkill = skill;
                updateConfirmButton();
            });

            this.elements.skillChoices.appendChild(el);
        });

        // Render Cards
        this.elements.cardChoices.innerHTML = '';
        choices.cards.forEach((card, index) => {
            const el = this.createCardElement(card, index);
            el.classList.add('card-choice');

            // Remove hover tilt to simplify selection
            // Or keep it, but ensure click works well.

            el.addEventListener('click', () => {
                // Deselect others
                Array.from(this.elements.cardChoices.children).forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                selectedCard = card;
                updateConfirmButton();
            });

            this.elements.cardChoices.appendChild(el);
        });

        // Setup confirm button
        // Remove old listeners to prevent duplicates?
        // Better: Clonenode or simple onclick property
        const newBtn = this.elements.confirmLevelUpBtn.cloneNode(true);
        this.elements.confirmLevelUpBtn.replaceWith(newBtn);
        this.elements.confirmLevelUpBtn = newBtn; // Update reference

        this.elements.confirmLevelUpBtn.disabled = true; // Start disabled
        this.elements.confirmLevelUpBtn.addEventListener('click', () => {
            this.elements.levelUpModal.style.display = 'none';
            if (onConfirm) {
                onConfirm({ skill: selectedSkill, card: selectedCard });
            }
        });
    }
}

export default UI;
