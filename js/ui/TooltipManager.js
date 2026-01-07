// Tooltip Manager for Mage Knight
// Provides rich, interactive tooltips for cards, terrain, enemies, and stats

import { t } from '../i18n/index.js';

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

        element.addEventListener('mouseenter', (_e) => {
            // Check for data attributes if content not provided or generic
            let html = typeof content === 'function' ? content() : content;

            // Auto-detect ability tooltip from data attributes if no specific content passed or if wrapper logic used
            if (!html && element.dataset.tooltipType === 'ability') {
                html = this.createAbilityTooltipHTML(element.dataset.tooltipKey);
            }

            if (html) this.showTooltip(element, html);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip(100);
        });

        // Event delegation for injected glossary terms within this element
        element.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('glossary-term')) {
                const term = e.target.dataset.term;
                if (term) {
                    this.currentTarget = e.target;
                    this.showGlossaryTooltip(e.target, term);
                    e.stopPropagation();
                }
            }
        });

        element.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('glossary-term')) {
                this.hideTooltip(100);
                e.stopPropagation();
            }
        });
    }

    /**
     * Register a simple text tooltip with title
     * @param {HTMLElement} element - Target element
     * @param {string} description - Tooltip description
     * @param {string} title - Optional title
     */
    register(element, description, title = '') {
        if (!element) return;
        const html = `
            <div class="tooltip-generic">
                ${title ? `<div class="tooltip-header"><span class="tooltip-name">${title}</span></div><div class="tooltip-divider"></div>` : ''}
                <div class="tooltip-description">${description}</div>
            </div>
        `;
        this.attachToElement(element, html);
    }

    /**
     * Create HTML for ability tooltip
     * @param {string} abilityKey - Key of the ability
     * @returns {string} HTML string
     */
    createAbilityTooltipHTML(abilityKey) {
        let desc = t(`enemies.abilities.descriptions.${abilityKey}`) || abilityKey;
        let title = abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1);

        // If description contains a colon, split it into title and description
        if (desc.includes(':')) {
            const parts = desc.split(':');
            title = parts[0].trim();
            desc = parts.slice(1).join(':').trim();
        }

        const icons = {
            'fire': '🔥',
            'ice': '❄️',
            'cold_fire': '🔥❄️',
            'physical': '⚔️',
            'fortified': '🏰',
            'swift': '💨',
            'poison': '🤢',
            'vampiric': '🧛',
            'brutal': '👹',
            'paralyze': '⚡',
            'cumbersome': '🏋️',
            'assassin': '🗡️',
            'boss': '👑',
            'summoner': '🦇',
            'elusive': '👤'
        };

        const icon = icons[abilityKey] || '';

        return `
            <div class="tooltip-ability-desc">
                <div class="tooltip-header">
                    ${icon ? `<span class="tooltip-icon">${icon}</span>` : ''}
                    <span class="tooltip-name">${title}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-description">${desc}</div>
            </div>
        `;
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
                        <strong>📜 ${t('cards.basicEffect')}:</strong>
        `;

        // List basic effects
        if (effects.movement) html += `<div>🌿 ${t('cards.actions.movement')}: <span class="value">+${effects.movement}</span></div>`;
        if (effects.attack) html += `<div>⚔️ ${t('cards.actions.attack')}: <span class="value">+${effects.attack}</span></div>`;
        if (effects.block) html += `<div>🛡️ ${t('cards.actions.block')}: <span class="value">+${effects.block}</span></div>`;
        if (effects.influence) html += `<div>💬 ${t('cards.actions.influence')}: <span class="value">+${effects.influence}</span></div>`;
        if (effects.healing) html += `<div>❤️ ${t('cards.actions.healing')}: <span class="value">+${effects.healing}</span></div>`;

        html += '</div>';

        // Sideways option
        if (sidewaysEffects) {
            html += `
                <div class="tooltip-section">
                    <strong>🔄 ${t('cards.sideways')}:</strong>
                    <div class="tooltip-hint">${t('cards.sidewaysHint')}</div>
                </div>
            `;
        }

        // Mana cost (if applicable)
        if (card.manaCost && card.manaCost.length > 0) {
            html += `
                <div class="tooltip-section">
                    <strong>💎 ${t('cards.manaCost')}:</strong>
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
    createTerrainTooltipHTML(terrainType, _terrainData) {
        /*
        const info = {
            icon: t(`terrain.${terrainType}.icon`) || (terrainType === 'water' ? '💧' : '❓'),
            name: t(`terrain.${terrainType}.name`),
            desc: t(`terrain.${terrainType}.desc`),
            cost: terrainType === 'water' ? '∞' : (t(`terrain.${terrainType}.cost`) || '?')
        };
        */

        // For simplicity, we'll keep hardcoded icons/costs in the manager or move them to constants
        // but the NAMES and DESCRIPTIONS must be localized.
        const icons = { 'plains': '🌾', 'forest': '🌲', 'hills': '⛰️', 'mountains': '🏔️', 'desert': '🏜️', 'wasteland': '☠️', 'water': '💧' };
        const costs = { 'plains': 2, 'forest': 3, 'hills': 3, 'mountains': 5, 'desert': 5, 'wasteland': 3, 'water': '∞' };

        const nameKey = `terrain.${terrainType}.name`;
        const descKey = `terrain.${terrainType}.desc`;
        const name = t(nameKey) !== nameKey ? t(nameKey) : (terrainType === 'unknown' ? 'Unbekannt' : terrainType);
        const desc = t(descKey) !== descKey ? t(descKey) : '';
        const icon = icons[terrainType] || '❓';
        const cost = costs[terrainType] || '?';

        return `
            <div class="tooltip-terrain">
                <div class="tooltip-header">
                    <span class="tooltip-icon">${icon}</span>
                    <span class="tooltip-name">${name}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-stat-row">
                    <span>👣 ${t('ui.labels.movement')}:</span>
                    <span class="value">${cost}</span>
                </div>
                <div class="tooltip-description">${desc}</div>
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
                        <span>🛡️ ${t('mana.armor')}:</span>
                        <span class="value">${enemy.armor}</span>
                    </div>
                    <div class="tooltip-stat-row">
                        <span>⚔️ ${t('mana.attack')}:</span>
                        <span class="value">${enemy.attack}</span>
                    </div>
                    <div class="tooltip-stat-row">
                        <span>⭐ ${t('mana.fame')}:</span>
                        <span class="value">${enemy.fame}</span>
                    </div>
                    ${enemy.fortified ? `<div class="tooltip-ability">🏰 ${t('mana.fortified')}</div>` : ''}
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
        // If description looks like HTML (contains <), render as is, otherwise wrap in p
        const isHtml = description.includes('<');
        return `
            <div class="tooltip-stat">
                <div class="tooltip-header">
                    <span class="tooltip-name">${statType}</span>
                </div>
                <div class="tooltip-divider"></div>
                ${isHtml ? description : `<div class="tooltip-description">${description}</div>`}
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
        const localizedName = (site.type && t(`sites.${site.type}`) !== `sites.${site.type}`) ? t(`sites.${site.type}`) : info.name;
        const status = site.conquered ? `<span class="status-conquered">👑 ${t('sites.conquered')}</span>` :
            site.visited ? `<span class="status-visited">✓ ${t('sites.visited')}</span>` : '';

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
                    <span class="tooltip-name">${localizedName}</span>
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
        return t(`sites.actions.${action}`) || action;
    }

    /**
     * Inject HTML spans for key game terms in text
     * @param {string} text - Raw text
     * @returns {string} Text with glossary terms wrapped
     */
    injectKeywords(text) {
        if (!text) return '';
        let processed = text;

        // This is a simplified regex approach.
        // Ideally we iterate over keys in i18n.glossary.
        // We need access to the raw glossary object, assume t returning object works or we load it.
        // Accessing i18n directly might be cleaner if we import default export fully, but we have 't'.
        // Let's assume we can get the keys.

        // Hardcoded list from implementation plan + de.js for now to ensure reliability
        const terms = [
            'Vampirismus', 'Befestigt', 'Lähmung', 'Flink', 'Brutal', 'Gift',
            'Schwerfällig', 'Attentäter', 'Beschwörer', 'Ausweichend',
            'Resistenz', 'Block', 'Wunde', 'Rüstung', 'Fernkampf', 'Belagerung',
            'Tag', 'Nacht'
        ];

        // Map display name back to key? Or just use display name for lookup?
        // Using display name for lookup is easier for the regex but we need the key for the tooltip content.
        // We can create a reverse map.

        // Reverse mapping strategy:
        const map = {
            'Vampirismus': 'vampirism',
            'Befestigt': 'fortified',
            'Lähmung': 'paralyze',
            'Flink': 'swift',
            'Brutal': 'brutal',
            'Gift': 'poison',
            'Schwerfällig': 'cumbersome',
            'Attentäter': 'assassin',
            'Beschwörer': 'summoner',
            'Ausweichend': 'elusive',
            'Resistenz': 'resistance',
            'Block': 'block',
            'Wunde': 'wound',
            'Rüstung': 'armor',
            'Fernkampf': 'ranged',
            'Belagerung': 'siege',
            'Tag': 'day',
            'Nacht': 'night'
            // Add 'Angriff' but handle collisions carefully?
        };

        terms.forEach(term => {
            // Case insensitive replace, preserving original case
            // Use word boundary \b to avoid partial matches
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            const key = map[term];
            if (key) {
                processed = processed.replace(regex, `<span class="glossary-term" data-term="${key}">$1</span>`);
            }
        });

        return processed;
    }

    /**
     * Show tooltip for glossary term
     */
    showGlossaryTooltip(element, termKey) {
        const name = t(`glossary.${termKey}.name`) || termKey;
        const desc = t(`glossary.${termKey}.desc`) || 'Keine Beschreibung verfügbar.';

        const content = `
            <div class="tooltip-glossary">
                <div class="tooltip-header">
                    <span class="tooltip-name">${name}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-description">${desc}</div>
            </div>
        `;

        this.showTooltip(element, content);
    }
}

export default TooltipManager;
