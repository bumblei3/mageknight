import { TooltipManager } from './ui/TooltipManager.js';
import i18n from './i18n/index.js';
const { t } = i18n;
import { NotificationManager } from './ui/NotificationManager.js';
import { ModalManager } from './ui/ModalManager.js';
import { CombatUIManager } from './ui/CombatUIManager.js';
import { HandRenderer } from './ui/HandRenderer.js';
import { ManaRenderer } from './ui/ManaRenderer.js';
import { UnitRenderer } from './ui/UnitRenderer.js';
import { StatsRenderer } from './ui/StatsRenderer.js';
import { SkillRenderer } from './ui/SkillRenderer.js';
import { store, ACTIONS } from './game/Store.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS } from './constants.js';
import { ParticleSystem } from './particles.js';
import { SaveLoadModal } from './ui/SaveLoadModal.js';

/**
 * User Interface Controller (Orchestrator)
 * Manages core HUD elements and delegates specific UI logic to specialized managers.
 */
export class UI {
    constructor() {
        this.elements = this.getElements();

        // Initialize specialized managers
        this.tooltipManager = new TooltipManager();
        this.notifications = new NotificationManager(this.elements, this.tooltipManager);
        this.modals = new ModalManager(this.elements, this);
        this.combatUI = new CombatUIManager(this.elements, this);

        // Initialize renderers
        this.statsRenderer = new StatsRenderer(this.elements, this);
        this.manaRenderer = new ManaRenderer(this.elements, this.tooltipManager, this);
        this.unitRenderer = new UnitRenderer(this.elements, this);
        this.handRenderer = new HandRenderer(this.elements, this.tooltipManager, this);
        this.skillRenderer = new SkillRenderer(this);
        this.saveLoadModal = new SaveLoadModal(this);

        this.setupEventListeners();
        this.setupTooltips();
        this.setupPanelToggles(); // Setup collapsible panels
        this.setupGlobalListeners();
        this.setupStoreSubscriptions();
    }

    /**
     * Set up subscriptions to the central store.
     */
    setupStoreSubscriptions() {
        if (!store) return;
        store.subscribe((state, action) => {
            if (action === ACTIONS.SET_LANGUAGE) {
                this.refreshTranslations();
            }
        });
    }

    /**
     * Links the game instance to UI and sub-managers.
     */
    setGame(game) {
        this.game = game;
        this.combatUI.game = game;
        if (this.elements.skillList) {
            this.skillRenderer.setContainer(this.elements.skillList);
        }
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
                    if (this.game && this.game.sound) {
                        this.game.sound.click();
                    }
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
        this._logAddedHandler = ({ message, type, details }) => this.notifications.addLog(message, type, details);
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
        // Hero Stats - with null checks for test environments
        if (this.elements.heroArmor) {
            this.tooltipManager.attachToElement(this.elements.heroArmor,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.armor.title'), t('ui.tooltips.armor.desc')));
        }

        if (this.elements.heroHandLimit) {
            this.tooltipManager.attachToElement(this.elements.heroHandLimit,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.handLimit.title'), t('ui.tooltips.handLimit.desc')));
        }

        if (this.elements.heroWounds) {
            this.tooltipManager.attachToElement(this.elements.heroWounds,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.wounds.title'), t('ui.tooltips.wounds.desc')));
        }

        if (this.elements.fameValue?.parentElement) {
            this.tooltipManager.attachToElement(this.elements.fameValue.parentElement,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.fame.title'), t('ui.tooltips.fame.desc')));
        }

        if (this.elements.reputationValue?.parentElement) {
            this.tooltipManager.attachToElement(this.elements.reputationValue.parentElement,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.reputation.title'), t('ui.tooltips.reputation.desc')));
        }

        // Phase Indicator
        const phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) {
            this.tooltipManager.attachToElement(phaseEl,
                this.tooltipManager.createStatTooltipHTML(t('ui.tooltips.phase.title'), t('ui.tooltips.phase.desc')));
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
            skillList: document.getElementById('skill-list'),

            // Buttons
            endTurnBtn: document.getElementById('end-turn-btn'),
            restBtn: document.getElementById('rest-btn'),
            exploreBtn: document.getElementById('explore-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            languageBtn: document.getElementById('language-btn'),

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
            confirmLevelUpBtn: document.getElementById('confirm-level-up'),

            // Event Modal
            eventModal: document.getElementById('event-modal'),
            eventClose: document.getElementById('event-close'),
            eventTitle: document.getElementById('event-title'),
            eventDescription: document.getElementById('event-description'),
            eventOptions: document.getElementById('event-options')
        };
    }

    setupEventListeners() {
        // Event listeners will be set from game.js
        if (this.elements.siteClose) {
            this.elements.siteClose.addEventListener('click', () => {
                this.hideSiteModal();
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
        if (this.elements.eventClose) {
            this.elements.eventClose.addEventListener('click', () => {
                this.elements.eventModal.classList.remove('active');
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
        if (this.elements.languageBtn) {
            this.elements.languageBtn.addEventListener('click', () => {
                this.toggleLanguage();
                if (this.game && this.game.sound) this.game.sound.click();
            });
        }
    }

    /**
     * Toggles between available languages
     */
    toggleLanguage() {
        const current = i18n.getLanguage();
        const next = current === 'de' ? 'en' : 'de';
        i18n.setLanguage(next);
        this.refreshTranslations();
    }

    /**
     * Refreshes all translated elements in the UI
     */
    refreshTranslations() {
        if (i18n && typeof i18n.translateDocument === 'function') {
            i18n.translateDocument();
        }

        // Specialized renderers (Stats, Mana, Unit, Hand, Skill)
        // handle their own refresh via store subscriptions.
    }

    // Show floating text animation
    showFloatingText(element, text, color = '#fff') {
        this.statsRenderer.showFloatingText(element, text, color);
    }

    /**
     * Updates the hero stats display.
     * @param {Hero} hero
     */
    updateHeroStats(hero) {
        this.statsRenderer.updateHeroStats(hero);
        if (this.skillRenderer) {
            this.skillRenderer.render(hero);
        }
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
    addLog(message, type = 'info', details = null) {
        this.notifications.addLog(message, type, details);
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

    // World Event Modal
    showEventModal(eventData) {
        this.modals.showEventModal(eventData);
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

    /**
     * Sets up the particle system overlay.
     * @param {HTMLCanvasElement} gameCanvas
     * @returns {ParticleSystem}
     */
    setupParticleSystem(gameCanvas) {
        const container = document.querySelector('.canvas-layer');
        if (!container) {
            console.warn('Canvas layer not found for particle system');
            return null;
        }
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.width = gameCanvas.width;
        this.particleCanvas.height = gameCanvas.height;
        this.particleCanvas.style.position = 'absolute';
        this.particleCanvas.style.top = '0';
        this.particleCanvas.style.left = '0';
        this.particleCanvas.style.pointerEvents = 'none';
        this.particleCanvas.style.zIndex = '10';

        container.appendChild(this.particleCanvas);

        this.particleSystem = new ParticleSystem(this.particleCanvas);

        // Override clear
        this.particleSystem.clearCanvas = () => {
            const ctx = this.particleCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        };

        // Hook update
        const originalUpdate = this.particleSystem.update.bind(this.particleSystem);
        this.particleSystem.update = () => {
            this.particleSystem.clearCanvas();
            originalUpdate();
        };

        return this.particleSystem;
    }

    /**
     * Sets up the help system modal and tab listeners.
     * @param {AbortController} abortController
     */
    setupHelpSystem(abortController) {
        const signal = abortController.signal;
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const helpClose = document.getElementById('help-close');
        const helpTabs = document.querySelectorAll('.help-tab');

        if (!helpBtn || !helpModal || !helpClose) return;

        helpBtn.addEventListener('click', () => helpModal.classList.add('active'), { signal });
        helpClose.addEventListener('click', () => helpModal.classList.remove('active'), { signal });
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('active');
        }, { signal });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal.classList.contains('active')) {
                helpModal.classList.remove('active');
            }
        }, { signal });

        helpTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                helpTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetContent = document.getElementById(`help-${targetTab}`);
                if (targetContent) targetContent.classList.add('active');
            }, { signal });
        });
    }
}

export default UI;
