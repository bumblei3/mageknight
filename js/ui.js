// UI management for Mage Knight

import TooltipManager from './tooltip.js';
import { animator, animateCounter } from './animator.js';

export class UI {
    constructor() {
        this.elements = this.getElements();
        this.tooltipManager = new TooltipManager();
        this.setupEventListeners();
        this.setupToastContainer();
    }

    setupToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

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
            siteOptions: document.getElementById('site-options')
        };
    }

    setupEventListeners() {
        // Event listeners will be set from game.js
        if (this.elements.siteClose) {
            this.elements.siteClose.addEventListener('click', () => this.hideSiteModal());
        }
    }

    // Update hero stats display
    updateHeroStats(hero) {
        const stats = hero.getStats();
        this.elements.heroName.textContent = stats.name;

        // Animate numeric values
        const currentArmor = parseInt(this.elements.heroArmor.textContent) || 0;
        if (currentArmor !== stats.armor) {
            animateCounter(this.elements.heroArmor, currentArmor, stats.armor, 500, animator);
        }

        this.elements.heroHandLimit.textContent = stats.handLimit;
        this.elements.heroWounds.textContent = stats.wounds;

        const currentFame = parseInt(this.elements.fameValue.textContent) || 0;
        if (currentFame !== stats.fame) {
            animateCounter(this.elements.fameValue, currentFame, stats.fame, 1000, animator);
        }

        const currentRep = parseInt(this.elements.reputationValue.textContent) || 0;
        if (currentRep !== stats.reputation) {
            animateCounter(this.elements.reputationValue, currentRep, stats.reputation, 800, animator);
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

            // Add drawing animation with stagger delay
            cardEl.classList.add('drawing');
            cardEl.style.animationDelay = `${index * 0.1}s`;

            cardEl.addEventListener('click', () => onCardClick(index, card));
            cardEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (onCardRightClick) onCardRightClick(index, card);
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

        if (card.isWound()) {
            cardDiv.innerHTML = `
                <div class="card-header">
                    <span class="card-name">${card.name}</span>
                </div>
                <div class="card-effects">
                    <div class="card-effect">💔 Verletzung</div>
                </div>
            `;
            cardDiv.style.borderColor = '#ef4444';
            return cardDiv;
        }

        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'card-color-indicator';
        colorIndicator.style.backgroundColor = this.getColorHex(card.color);

        const basicEffect = this.formatEffect(card.basicEffect);
        const strongEffect = this.formatEffect(card.strongEffect);

        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="card-name">${card.name}</span>
            </div>
            <div class="card-effects">
                <div class="card-effect"><strong>Basic:</strong> ${basicEffect}</div>
                <div class="card-effect"><strong>Strong:</strong> ${strongEffect}</div>
            </div>
        `;

        cardDiv.querySelector('.card-header').appendChild(colorIndicator);

        if (card.manaCost > 0) {
            const manaCost = document.createElement('div');
            manaCost.className = 'card-mana-cost';
            manaCost.textContent = card.manaCost;
            cardDiv.appendChild(manaCost);
        }

        return cardDiv;
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

            this.elements.manaSource.appendChild(dieEl);
        });
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
    showCombatPanel(enemies, phase) {
        this.elements.combatPanel.style.display = 'block';
        this.updateCombatInfo(enemies, phase);
    }

    // Hide combat panel
    hideCombatPanel() {
        this.elements.combatPanel.style.display = 'none';
        this.elements.combatInfo.innerHTML = '';
    }

    // Update combat info
    updateCombatInfo(enemies, phase) {
        this.elements.combatInfo.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <strong>Phase:</strong> ${this.getCombatPhaseName(phase)}
            </div>
        `;

        enemies.forEach(enemy => {
            const enemyDiv = document.createElement('div');
            enemyDiv.className = 'enemy-info';
            enemyDiv.innerHTML = `
                <div class="enemy-name">${enemy.icon} ${enemy.name}</div>
                <div class="stat-row">
                    <span>🛡️ Rüstung: ${enemy.armor}</span>
                </div>
                <div class="stat-row">
                    <span>⚔️ Angriff: ${enemy.attack}</span>
                </div>
                <div class="stat-row">
                    <span>⭐ Ruhm: ${enemy.fame}</span>
                </div>
            `;
            this.elements.combatInfo.appendChild(enemyDiv);
        });
    }

    // Get combat phase name
    getCombatPhaseName(phase) {
        const names = {
            not_in_combat: 'Kein Kampf',
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
        this.elements.playArea.style.display = 'block';
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
        cardEl.classList.add('playing'); // Trigger play animation

        const effectDiv = document.createElement('div');
        effectDiv.style.fontSize = '0.75rem';
        effectDiv.style.marginTop = '0.5rem';
        effectDiv.style.color = '#fbbf24';
        effectDiv.textContent = this.formatEffect(effect);
        cardEl.appendChild(effectDiv);

        this.elements.playedCards.appendChild(cardEl);
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
}

export default UI;
