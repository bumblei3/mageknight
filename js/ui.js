// UI management for Mage Knight

export class UI {
    constructor() {
        this.elements = this.getElements();
        this.setupEventListeners();
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

            // Areas
            handCards: document.getElementById('hand-cards'),
            playedCards: document.getElementById('played-cards'),
            playArea: document.getElementById('play-area'),
            manaSource: document.getElementById('mana-source'),
            gameLog: document.getElementById('game-log'),
            combatPanel: document.getElementById('combat-panel'),
            combatInfo: document.getElementById('combat-info'),

            // Canvas
            gameBoard: document.getElementById('game-board')
        };
    }

    setupEventListeners() {
        // Event listeners will be set from game.js
    }

    // Update hero stats display
    updateHeroStats(hero) {
        const stats = hero.getStats();
        this.elements.heroName.textContent = stats.name;
        this.elements.heroArmor.textContent = stats.armor;
        this.elements.heroHandLimit.textContent = stats.handLimit;
        this.elements.heroWounds.textContent = stats.wounds;
        this.elements.fameValue.textContent = stats.fame;
        this.elements.reputationValue.textContent = stats.reputation;
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

            cardEl.addEventListener('click', () => onCardClick(index, card));
            cardEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (onCardRightClick) onCardRightClick(index, card);
            });

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
    renderManaSource(manaSource, onDieClick) {
        this.elements.manaSource.innerHTML = '';

        const dice = manaSource.getAvailableDice();
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

        // Could add toast notification here
        console.log(`[${type}] ${message}`);
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
}

export default UI;
