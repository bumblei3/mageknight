// Tooltip Manager for Mage Knight
// Provides rich, interactive tooltips for cards, terrain, enemies, and stats

export class TooltipManager {
    constructor() {
        this.tooltip = null;
        this.currentTarget = null;
        this.hideTimeout = null;
        this.createTooltipElement();
    }

    createTooltipElement() {
        // Create tooltip container
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'game-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
    }

    /**
     * Show tooltip for a card
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {object} card - Card object
     */
    showCardTooltip(element, card) {
        const content = this.createCardTooltipHTML(card);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for terrain
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} terrainType - Terrain type
     */
    showTerrainTooltip(element, terrainType, terrainData) {
        const content = this.createTerrainTooltipHTML(terrainType, terrainData);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for enemy
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {object} enemy - Enemy object
     */
    showEnemyTooltip(element, enemy) {
        const content = this.createEnemyTooltipHTML(enemy);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for stat pill
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} statType - Type of stat
     * @param {string} description - Detailed description
     */
    showStatTooltip(element, statType, description) {
        const content = `<div class="tooltip-stat"><strong>${statType}</strong><p>${description}</p></div>`;
        this.showTooltip(element, content);
    }

    /**
     * Generic show tooltip
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} htmlContent - HTML content for tooltip
     */
    showTooltip(element, htmlContent) {
        clearTimeout(this.hideTimeout);

        this.currentTarget = element;
        this.tooltip.innerHTML = htmlContent;
        this.tooltip.style.display = 'block';

        // Position tooltip
        this.positionTooltip(element);

        // Add fade-in animation
        this.tooltip.style.opacity = '0';
        setTimeout(() => {
            this.tooltip.style.opacity = '1';
        }, 10);
    }

    /**
     * Hide tooltip
     * @param {number} delay - Delay in ms before hiding
     */
    hideTooltip(delay = 0) {
        clearTimeout(this.hideTimeout);

        if (delay > 0) {
            this.hideTimeout = setTimeout(() => {
                this.tooltip.style.opacity = '0';
                setTimeout(() => {
                    this.tooltip.style.display = 'none';
                    this.currentTarget = null;
                }, 200);
            }, delay);
        } else {
            this.tooltip.style.opacity = '0';
            setTimeout(() => {
                this.tooltip.style.display = 'none';
                this.currentTarget = null;
            }, 200);
        }
    }

    /**
     * Attach tooltip to an element
     * @param {HTMLElement} element - Target element
     * @param {string|Function} content - HTML content or function returning HTML
     */
    attachToElement(element, content) {
        if (!element) return;

        element.addEventListener('mouseenter', () => {
            const html = typeof content === 'function' ? content() : content;
            this.showTooltip(element, html);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip(100);
        });
    }

    /**
     * Position tooltip near element
     * @param {HTMLElement} element - Target element
     */
    positionTooltip(element) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;

        // Prevent overflow on right
        if (left + tooltipRect.width > window.innerWidth - 20) {
            left = window.innerWidth - tooltipRect.width - 20;
        }

        // Prevent overflow on left
        if (left < 20) {
            left = 20;
        }

        // If tooltip would go above viewport, show below instead
        if (top < 20) {
            top = rect.bottom + 10;
            this.tooltip.classList.add('below');
        } else {
            this.tooltip.classList.remove('below');
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Create HTML for card tooltip
     * @param {object} card - Card object
     * @returns {string} HTML string
     */
    createCardTooltipHTML(card) {
        const effects = card.getEffect(false);
        const sidewaysEffects = card.canPlaySideways();

        let html = `
            <div class="tooltip-card">
                <div class="tooltip-header">
                    <span class="tooltip-card-name">${card.name}</span>
                    <span class="tooltip-card-color ${card.color}">${this.getColorIcon(card.color)}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-effects">
                    <div class="tooltip-section">
                        <strong>📜 Basis-Effekt:</strong>
        `;

        // List basic effects
        if (effects.movement) html += `<div>🌿 Bewegung: <span class="value">+${effects.movement}</span></div>`;
        if (effects.attack) html += `<div>⚔️ Angriff: <span class="value">+${effects.attack}</span></div>`;
        if (effects.block) html += `<div>🛡️ Block: <span class="value">+${effects.block}</span></div>`;
        if (effects.influence) html += `<div>💬 Einfluss: <span class="value">+${effects.influence}</span></div>`;
        if (effects.healing) html += `<div>❤️ Heilung: <span class="value">+${effects.healing}</span></div>`;

        html += '</div>';

        // Sideways option
        if (sidewaysEffects) {
            html += `
                <div class="tooltip-section">
                    <strong>🔄 Seitlich spielen:</strong>
                    <div class="tooltip-hint">+1 Bewegung/Angriff/Block/Einfluss</div>
                </div>
            `;
        }

        // Mana cost (if applicable)
        if (card.manaCost && card.manaCost.length > 0) {
            html += `
                <div class="tooltip-section">
                    <strong>💎 Mana-Kosten:</strong>
                    <div>${card.manaCost.map(m => this.getManaHTML(m)).join(' ')}</div>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Create HTML for terrain tooltip
     * @param {string} terrainType - Terrain type
     * @param {object} terrainData - Terrain data object with cost info
     * @returns {string} HTML string
     */
    createTerrainTooltipHTML(terrainType, terrainData) {
        const terrainInfo = {
            'plains': { icon: '🌾', name: 'Ebenen', cost: 2, desc: 'Offenes Grasland' },
            'forest': { icon: '🌲', name: 'Wald', cost: 3, desc: 'Dichter Wald' },
            'hills': { icon: '⛰️', name: 'Hügel', cost: 3, desc: 'Hügeliges Gelände' },
            'mountains': { icon: '🏔️', name: 'Berge', cost: 5, desc: 'Hohe Berge' },
            'desert': { icon: '🏜️', name: 'Wüste', cost: 3, desc: 'Trockene Wüste' },
            'wasteland': { icon: '☠️', name: 'Ödland', cost: 3, desc: 'Verfluchtes Land' },
            'water': { icon: '💧', name: 'Wasser', cost: '∞', desc: 'Unpassierbar' }
        };

        const info = terrainInfo[terrainType] || { icon: '❓', name: 'Unbekannt', cost: '?', desc: '' };

        return `
            <div class="tooltip-terrain">
                <div class="tooltip-header">
                    <span class="tooltip-icon">${info.icon}</span>
                    <span class="tooltip-name">${info.name}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-stat-row">
                    <span>👣 Bewegungskosten:</span>
                    <span class="value">${info.cost}</span>
                </div>
                <div class="tooltip-description">${info.desc}</div>
            </div>
        `;
    }

    /**
     * Create HTML for enemy tooltip
     * @param {object} enemy - Enemy object
     * @returns {string} HTML string
     */
    createEnemyTooltipHTML(enemy) {
        return `
            <div class="tooltip-enemy">
                <div class="tooltip-header">
                    <span class="tooltip-name">${enemy.name}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-stats">
                    <div class="tooltip-stat-row">
                        <span>🛡️ Rüstung:</span>
                        <span class="value">${enemy.armor}</span>
                    </div>
                    <div class="tooltip-stat-row">
                        <span>⚔️ Angriff:</span>
                        <span class="value">${enemy.attack}</span>
                    </div>
                    <div class="tooltip-stat-row">
                        <span>⭐ Ruhm:</span>
                        <span class="value">${enemy.fame}</span>
                    </div>
                    ${enemy.fortified ? '<div class="tooltip-ability">🏰 Befestigt</div>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get color icon for card type
     */
    getColorIcon(color) {
        const icons = {
            'green': '🌿',
            'red': '⚔️',
            'blue': '🛡️',
            'white': '💬',
            'gold': '⭐'
        };
        return icons[color] || '❓';
    }

    /**
     * Get mana HTML representation
     */
    getManaHTML(color) {
        const colors = {
            'red': '🔥',
            'blue': '💧',
            'white': '✨',
            'green': '🌿',
            'gold': '💰'
        };
        return `<span class="mana-icon ${color}">${colors[color] || '💎'}</span>`;
    }
    /**
     * Create HTML for stat tooltip
     * @param {string} statType - Type of stat
     * @param {string} description - Description
     * @returns {string} HTML string
     */
    createStatTooltipHTML(statType, description) {
        return `
            <div class="tooltip-stat">
                <strong>${statType}</strong>
                <p>${description}</p>
            </div>
        `;
    }
    /**
     * Create HTML for site tooltip
     * @param {object} site - Site object
     * @returns {string} HTML string
     */
    createSiteTooltipHTML(site) {
        const info = site.getInfo();
        const status = site.conquered ? '<span class="status-conquered">👑 Erobert</span>' :
            site.visited ? '<span class="status-visited">✓ Besucht</span>' : '';

        let actionsHtml = '';
        if (info.actions) {
            actionsHtml = '<div class="tooltip-actions">';
            info.actions.forEach(action => {
                actionsHtml += `<span class="action-tag">${this.getActionIcon(action)} ${this.getActionName(action)}</span>`;
            });
            actionsHtml += '</div>';
        }

        return `
            <div class="tooltip-site" style="border-left-color: ${info.color}">
                <div class="tooltip-header">
                    <span class="tooltip-icon">${info.icon}</span>
                    <span class="tooltip-name">${info.name}</span>
                </div>
                ${status ? `<div class="tooltip-status">${status}</div>` : ''}
                <div class="tooltip-divider"></div>
                <div class="tooltip-description">${info.description}</div>
                ${actionsHtml}
            </div>
        `;
    }

    getActionIcon(action) {
        const icons = {
            'heal': '❤️',
            'recruit': '👥',
            'attack': '⚔️',
            'train': '📚',
            'learn': '✨',
            'explore': '🔍'
        };
        return icons[action] || '•';
    }

    getActionName(action) {
        const names = {
            'heal': 'Heilen',
            'recruit': 'Rekrutieren',
            'attack': 'Angreifen',
            'train': 'Trainieren',
            'learn': 'Lernen',
            'explore': 'Erkunden'
        };
        return names[action] || action;
    }
}

export default TooltipManager;
