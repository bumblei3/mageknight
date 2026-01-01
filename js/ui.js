import { TooltipManager } from './ui/TooltipManager.js';
import { NotificationManager } from './ui/NotificationManager.js';
import { ModalManager } from './ui/ModalManager.js';
import { CombatUIManager } from './ui/CombatUIManager.js';
import { HandRenderer } from './ui/HandRenderer.js';
import { ManaRenderer } from './ui/ManaRenderer.js';
import { UnitRenderer } from './ui/UnitRenderer.js';
import { StatsRenderer } from './ui/StatsRenderer.js';
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

        // Initialize renderers
        this.statsRenderer = new StatsRenderer(this.elements);
        this.manaRenderer = new ManaRenderer(this.elements, this.tooltipManager);
        this.unitRenderer = new UnitRenderer(this.elements);
        this.handRenderer = new HandRenderer(this.elements, this.tooltipManager);

        this.setupEventListeners();
        this.setupTooltips();
        this.setupPanelToggles(); // Setup collapsible panels
        this.setupGlobalListeners();
    }

    /**
     * Links the game instance to UI and sub-managers.
     */
    setGame(game) {
        this.game = game;
        this.combatUI.game = game;
    }

    /**
     * Sets up event listeners for collapsible panels.
     * @private
     */
    setupPanelToggles() {
        const toggles = document.querySelectorAll('.panel-toggle');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                const panel = btn.closest('.panel');
                if (panel) {
                    panel.classList.toggle('collapsed');
                }
            });
        });
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
        this.statsRenderer.showFloatingText(element, text, color);
    }

    // Update hero stats display
    updateHeroStats(hero) {
        this.statsRenderer.updateHeroStats(hero);
    }

    // Update movement points display
    updateMovementPoints(points) {
        this.statsRenderer.updateMovementPoints(points);
    }

    // Render hand cards
    renderHandCards(hand, onCardClick, onCardRightClick) {
        this.handRenderer.renderHandCards(hand, onCardClick, onCardRightClick);
    }

    // Create card HTML element
    createCardElement(card, index) {
        return this.handRenderer.createCardElement(card, index);
    }

    // Render mana source
    renderManaSource(manaSource, onDieClick, isNight = false) {
        this.manaRenderer.renderManaSource(manaSource, onDieClick, isNight);
    }

    // Render hero's collected mana
    renderHeroMana(manaInventory) {
        this.manaRenderer.renderHeroMana(manaInventory);
    }

    // Log configuration
    addLog(message, type = 'info') {
        this.notifications.addLog(message, type);
    }

    clearLog() {
        this.notifications.clearLog();
    }

    showNotification(message, type = 'info') {
        this.notifications.showNotification(message, type);
    }

    showToast(message, type = 'info') {
        this.notifications.showToast(message, type);
    }

    // Combat UI
    showCombatPanel(enemies, phase, onEnemyClick) {
        this.combatUI.showCombatPanel(enemies, phase, onEnemyClick);
    }

    hideCombatPanel() {
        this.combatUI.hideCombatPanel();
    }

    updateCombatInfo(enemies, phase, onEnemyClick) {
        this.combatUI.updateCombatInfo(enemies, phase, onEnemyClick);
    }

    updateCombatTotals(attackTotal, blockTotal, phase) {
        this.combatUI.updateCombatTotals(attackTotal, blockTotal, phase);
    }

    renderEnemy(enemy, phase, onClick) {
        return this.combatUI.renderEnemy(enemy, phase, onClick);
    }

    renderUnitsInCombat(units, phase, onUnitActivate) {
        this.combatUI.renderUnitsInCombat(units, phase, onUnitActivate);
    }

    // Render units in hero panel
    renderUnits(units) {
        this.unitRenderer.renderUnits(units);
    }

    // Played Area
    showPlayArea() {
        this.handRenderer.showPlayArea();
    }

    hidePlayArea() {
        this.handRenderer.hidePlayArea();
    }

    addPlayedCard(card, effect) {
        this.handRenderer.addPlayedCard(card, effect);
    }

    // Button controls
    setButtonEnabled(button, enabled) {
        if (button) {
            button.disabled = !enabled;
        }
    }

    // Map helpers
    highlightHex(hexGrid, q, r) {
        if (hexGrid && typeof hexGrid.selectHex === 'function') {
            hexGrid.selectHex(q, r);
        }
    }

    // Site Modal
    showSiteModal(interactionData) {
        this.modals.showSiteModal(interactionData);
    }

    hideSiteModal() {
        this.modals.hideSiteModal();
    }

    renderSiteOptions(options) {
        this.modals.renderSiteOptions(options);
    }

    // Helper Methods for external use
    getColorName(color) { return this.handRenderer.getColorName(color); }
    getColorHex(color) { return this.handRenderer.getColorHex(color); }
    getManaIcon(color) { return this.manaRenderer.getManaIcon(color); }
    getManaTooltipInfo(color) { return this.manaRenderer.getManaTooltipInfo(color); }
    getCombatPhaseName(phase) { return this.combatUI.getCombatPhaseName(phase); }
    getPhaseHint(phase) { return this.combatUI.getPhaseHint(phase); }
    getCardIcon(card) { return this.handRenderer.getCardIcon(card); }
    formatEffect(effect) { return this.handRenderer.formatEffect(effect); }

    // Reset UI for new game
    reset() {
        this.notifications.clearLog();
        this.handRenderer.hidePlayArea();
        this.elements.handCards.innerHTML = '';
        this.unitRenderer.reset();
        this.combatUI.reset();
        this.manaRenderer.reset();
        this.statsRenderer.reset();
    }

    // --- Level Up Modal Logic ---
    showLevelUpModal(newLevel, choices, onConfirm) {
        this.modals.showLevelUpModal(newLevel, choices, onConfirm);
    }
}

export default UI;
