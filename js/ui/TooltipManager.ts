// Tooltip Manager for Mage Knight
// Provides rich, interactive tooltips for cards, terrain, enemies, and stats

import i18n from '../i18n/index';
const { t } = i18n as any;
import { Enemy } from '../enemy';

export class TooltipManager {
    private tooltip: HTMLElement | null = null;
    private currentTarget: HTMLElement | null = null;
    private hideTimeout: NodeJS.Timeout | number | null = null;

    constructor() {
        this.createTooltipElement();
    }

    private createTooltipElement(): void {
        // Create tooltip container
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'game-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
    }

    /**
     * Show tooltip for a card
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {any} card - Card object
     */
    public showCardTooltip(element: HTMLElement, card: any): void {
        const content = this.createCardTooltipHTML(card);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for terrain
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} terrainType - Terrain type
     * @param {any} terrainData - Terrain data
     */
    public showTerrainTooltip(element: HTMLElement, terrainType: string, terrainData?: any): void {
        const content = this.createTerrainTooltipHTML(terrainType, terrainData);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for enemy
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {Enemy} enemy - Enemy object
     */
    public showEnemyTooltip(element: HTMLElement, enemy: Enemy): void {
        const content = this.createEnemyTooltipHTML(enemy);
        this.showTooltip(element, content);
    }

    /**
     * Show tooltip for stat pill
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} statType - Type of stat
     * @param {string} description - Detailed description
     */
    public showStatTooltip(element: HTMLElement, statType: string, description: string): void {
        const content = `<div class="tooltip-stat"><strong>${statType}</strong><p>${description}</p></div>`;
        this.showTooltip(element, content);
    }

    /**
     * Generic show tooltip
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} htmlContent - HTML content for tooltip
     */
    public showTooltip(element: HTMLElement, htmlContent: string): void {
        if (!this.tooltip) return;
        if (this.hideTimeout) clearTimeout(this.hideTimeout as any);

        this.currentTarget = element;
        this.tooltip.innerHTML = htmlContent;

        // Use visibility hidden to prevent FOUC while waiting for layout
        this.tooltip.style.visibility = 'hidden';
        this.tooltip.style.display = 'block';

        // Defer positioning to next frame to avoid forced reflow (layout thrashing)
        requestAnimationFrame(() => {
            if (!this.currentTarget || !this.tooltip) return; // Mouse left before frame

            this.positionTooltip(element);
            this.tooltip.style.visibility = 'visible';

            // Add fade-in animation
            this.tooltip.style.opacity = '0';
            requestAnimationFrame(() => {
                if (this.tooltip) this.tooltip.style.opacity = '1';
            });
        });
    }

    /**
     * Hide tooltip
     * @param {number} delay - Delay in ms before hiding
     */
    public hideTooltip(delay: number = 0): void {
        if (!this.tooltip) return;
        if (this.hideTimeout) clearTimeout(this.hideTimeout as any);

        const hide = () => {
            if (!this.tooltip) return;
            this.tooltip.style.opacity = '0';
            setTimeout(() => {
                if (this.tooltip) this.tooltip.style.display = 'none';
                this.currentTarget = null;
            }, 200);
        };

        if (delay > 0) {
            this.hideTimeout = setTimeout(hide, delay);
        } else {
            hide();
        }
    }

    /**
     * Attach tooltip to an element
     * @param {HTMLElement} element - Target element
     * @param {string|Function} content - HTML content or function returning HTML
     */
    public attachToElement(element: HTMLElement | null, content: string | (() => string)): void {
        if (!element) return;

        element.addEventListener('mouseenter', (_e) => {
            // Check for data attributes if content not provided or generic
            let html = typeof content === 'function' ? content() : content;

            // Auto-detect ability tooltip from data attributes if no specific content passed or if wrapper logic used
            if (!html && element.dataset.tooltipType === 'ability') {
                html = this.createAbilityTooltipHTML(element.dataset.tooltipKey || '');
            }

            if (html) this.showTooltip(element, html);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip(100);
        });

        // Event delegation for injected glossary terms within this element
        element.addEventListener('mouseover', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.classList.contains('glossary-term')) {
                const term = target.dataset.term;
                if (term) {
                    this.currentTarget = target;
                    this.showGlossaryTooltip(target, term);
                    e.stopPropagation();
                }
            }
        });

        element.addEventListener('mouseout', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.classList.contains('glossary-term')) {
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
    public register(element: HTMLElement | null, description: string, title: string = ''): void {
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
    public createAbilityTooltipHTML(abilityKey: string): string {
        let desc = t(`enemies.abilities.descriptions.${abilityKey}`) || abilityKey;
        let title = abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1);

        // If description contains a colon, split it into title and description
        if (desc.includes(':')) {
            const parts = desc.split(':');
            title = parts[0].trim();
            desc = parts.slice(1).join(':').trim();
        }

        const icons: Record<string, string> = {
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
    private positionTooltip(element: HTMLElement): void {
        if (!this.tooltip) return;
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;

        // Prevent overflow on right
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        if (left + tooltipRect.width > windowWidth - 20) {
            left = windowWidth - tooltipRect.width - 20;
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
     * @param {any} card - Card object
     * @returns {string} HTML string
     */
    public createCardTooltipHTML(card: any): string {
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
                    <div>${(card.manaCost as any[]).map(m => this.getManaHTML(m)).join(' ')}</div>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Create HTML for terrain tooltip
     * @param {string} terrainType - Terrain type
     * @param {any} _terrainData - Terrain data object with cost info
     * @returns {string} HTML string
     */
    public createTerrainTooltipHTML(terrainType: string, _terrainData?: any): string {
        // Icons mapping
        const icons: Record<string, string> = { 'plains': '🌾', 'forest': '🌲', 'hills': '⛰️', 'mountains': '🏔️', 'desert': '🏜️', 'wasteland': '☠️', 'water': '💧' };

        // Fetch data from i18n
        const nameKey = `terrain.${terrainType}.name`;
        const descKey = `terrain.${terrainType}.desc`;
        const costKey = `terrain.${terrainType}.cost`;

        const name = t(nameKey);
        const desc = t(descKey);
        const cost = t(costKey) || '?';
        const icon = icons[terrainType] || '❓';

        // Check if translations were found, otherwise fallback nicely
        const displayName = (name !== nameKey) ? name : (terrainType.charAt(0).toUpperCase() + terrainType.slice(1));
        const displayDesc = (desc !== descKey) ? desc : '';

        return `
            <div class="tooltip-terrain">
                <div class="tooltip-header">
                    <span class="tooltip-icon">${icon}</span>
                    <span class="tooltip-name">${displayName}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-stat-row">
                    <span>👣 ${t('ui.labels.movement')}:</span>
                    <span class="value">${cost}</span>
                </div>
                <div class="tooltip-description">${displayDesc}</div>
            </div>
        `;
    }

    /**
     * Create HTML for enemy tooltip
     * @param {Enemy} enemy - Enemy object
     * @returns {string} HTML string
     */
    public createEnemyTooltipHTML(enemy: Enemy): string {
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
     * Create HTML for unit tooltip
     * @param {any} unit - Unit object
     * @returns {string} HTML string
     */
    public createUnitTooltipHTML(unit: any): string {
        const unitName = typeof unit.getName === 'function' ? unit.getName() : (unit.name || 'Unit');
        const unitLevel = unit.level || 1;
        const abilities = typeof unit.getAbilities === 'function' ? unit.getAbilities() : [];
        const abilityText = (abilities as any[]).map(a => `<div class="tooltip-ability">✨ ${a.text || a}</div>`).join('');

        return `
            <div class="tooltip-unit">
                <div class="tooltip-header">
                    <span class="tooltip-name">${unitName}</span>
                    <span class="tooltip-level">Level ${unitLevel}</span>
                </div>
                <div class="tooltip-divider"></div>
                <div class="tooltip-stats">
                    <div class="tooltip-stat-row">
                        <span>🛡️ ${t('ui.labels.armor')}:</span>
                        <span class="value">${unit.armor || 0}</span>
                    </div>
                </div>
                ${abilityText ? `
                <div class="tooltip-section">
                    <strong>${t('ui.labels.skills')}:</strong>
                    <div style="margin-top: 0.25rem;">${abilityText}</div>
                </div>` : ''}
            </div>
        `;
    }

    /**
     * Get color icon for card type
     */
    public getColorIcon(color: string): string {
        const icons: Record<string, string> = {
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
    public getManaHTML(color: string): string {
        const colors: Record<string, string> = {
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
    public createStatTooltipHTML(statType: string, description: string): string {
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
     * @param {any} site - Site object
     * @returns {string} HTML string
     */
    public createSiteTooltipHTML(site: any): string {
        const info = site.getInfo();
        const localizedName = (site.type && t(`sites.${site.type}`) !== `sites.${site.type}`) ? t(`sites.${site.type}`) : info.name;
        const status = site.conquered ? `<span class="status-conquered">👑 ${t('sites.conquered')}</span>` :
            site.visited ? `<span class="status-visited">✓ ${t('sites.visited')}</span>` : '';

        let actionsHtml = '';
        if (info.actions) {
            actionsHtml = '<div class="tooltip-actions">';
            (info.actions as string[]).forEach(action => {
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

    public getActionIcon(action: string): string {
        const icons: Record<string, string> = {
            'heal': '❤️',
            'recruit': '👥',
            'attack': '⚔️',
            'train': '📚',
            'learn': '✨',
            'explore': '🔍'
        };
        return icons[action] || '•';
    }

    public getActionName(action: string): string {
        return t(`sites.actions.${action}`) || action;
    }

    /**
     * Inject HTML spans for key game terms in text
     * @param {string} text - Raw text
     * @returns {string} Text with glossary terms wrapped
     */
    public injectKeywords(text: string): string {
        if (!text) return '';
        let processed = text;

        const terms = [
            'Vampirismus', 'Befestigt', 'Lähmung', 'Flink', 'Brutal', 'Gift',
            'Schwerfällig', 'Attentäter', 'Beschwörer', 'Ausweichend',
            'Resistenz', 'Block', 'Wunde', 'Rüstung', 'Fernkampf', 'Belagerung',
            'Tag', 'Nacht'
        ];

        const map: Record<string, string> = {
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
        };

        terms.forEach(term => {
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
    public showGlossaryTooltip(element: HTMLElement, termKey: string): void {
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
