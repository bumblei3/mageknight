import { TurnManager } from './turnManager.js';
import { InteractionController } from './interactionController.js';

// Main game controller for Mage Knight

import { HexGrid } from './hexgrid.js';
import Hero from './hero.js';
import { ManaSource } from './mana.js';
import { EnemyAI } from './enemyAI.js';
import { UI } from './ui.js';
import Terrain from './terrain.js';
// import { SaveManager } from './persistence/SaveManager.js'; // Removed unused import
import TutorialManager from './tutorialManager.js';
import { TimeManager } from './timeManager.js';
import { MapManager } from './mapManager.js';
import { WorldEventManager } from './worldEvents.js';
import ParticleSystem from './particles.js';
import { animator } from './animator.js';
import { SiteInteractionManager } from './siteInteraction.js';
import { DebugManager } from './debug.js';
import AchievementManager from './achievements.js';
import { StatisticsManager } from './statistics.js';
import SoundManager from './soundManager.js';
import TouchController from './touchController.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS, TIME_OF_DAY } from './constants.js';
import { t } from './i18n/index.js';
import { logger } from './logger.js';

import { ScenarioManager } from './game/ScenarioManager.js';
import { LevelUpManager } from './game/LevelUpManager.js';
import { RewardManager } from './game/RewardManager.js';
import { PhaseManager } from './game/PhaseManager.js';
import { EntityManager } from './game/EntityManager.js';
import { ActionManager } from './game/ActionManager.js';
import { GameStateManager } from './game/GameStateManager.js';
import { CombatOrchestrator } from './game/CombatOrchestrator.js';
import { HeroController } from './game/HeroController.js';
import { InputController } from './game/InputController.js';
import { RenderController } from './game/RenderController.js';
import { HeroManager } from './game/HeroManager.js';
import { store } from './game/Store.js';

/**
 * Main Game Controller Class
 * Orchestrates the game loop, state management, and interaction between subsystems.
 */
export class MageKnightGame {
    /**
     * Initializes the game engine and subsystems.
     */
    constructor() {
        // Clear global event bus and store listeners to prevent listener accumulation from previous instances
        eventBus.clear();
        if (store) {
            store.clearListeners();
            store.reset();
        }

        this.abortController = new AbortController();
        this.activeTimeouts = new Set();
        this.gameState = 'playing';
        this.isTestEnvironment = !!(typeof window !== 'undefined' && (window.isTest || window.__playwright__));

        // Managers
        this.ui = new UI();
        this.terrain = new Terrain();
        // Legacy compatibility for tests
        this.saveManager = {
            saveGame: (slotId, _state) => this.stateManager.saveGame(slotId),
            loadGame: (slotId) => this.stateManager.loadGame(slotId),
            autoSave: () => this.stateManager.saveGame('auto')
        };
        this.timeManager = new TimeManager();
        this.achievementManager = new AchievementManager();
        this.statisticsManager = new StatisticsManager();
        this.sound = new SoundManager();
        this.animator = animator; // Initialize animator reference
        this.levelUpManager = new LevelUpManager(this);
        this.rewardManager = new RewardManager(this);
        this.scenarioManager = new ScenarioManager(this); // New Scenario Manager

        // Core Components
        this.canvas = document.getElementById('game-board');
        if (!this.canvas) {
            console.warn('Game canvas not found, creating fallback.');
            this.canvas = document.createElement('canvas');
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
        this.ctx = this.canvas.getContext('2d');
        this.hexGrid = new HexGrid(this.canvas);
        this.hexGrid.setTerrainSystem(this.terrain); // Link terrain to hexGrid
        this.hero = new Hero('GOLDYX');
        this.enemies = [];
        this.manaSource = new ManaSource();
        this.enemyAI = new EnemyAI(this.hexGrid);
        this.particleSystem = new ParticleSystem(this.canvas);
        this.mapManager = new MapManager(this.hexGrid);
        this.worldEventManager = new WorldEventManager(this);
        this.mapManager.setWorldEventManager(this.worldEventManager);

        this.siteManager = new SiteInteractionManager(this);
        this.debug = new DebugManager(this);

        // New Refactored Controllers
        this.turnManager = new TurnManager(this);
        this.interactionController = new InteractionController(this);
        this.inputController = new InputController(this);
        this.renderController = new RenderController(this);

        // UI Helpers
        this.tutorial = new TutorialManager(this);
        this.touchController = new TouchController(this);

        // Core Game Managers (Phase 2 Refactor)
        this.phaseManager = new PhaseManager(this);
        this.entityManager = new EntityManager(this);
        this.actionManager = new ActionManager(this);
        this.stateManager = new GameStateManager(this);
        this.combatOrchestrator = new CombatOrchestrator(this);
        this.heroController = new HeroController(this);

        // State
        this.movementMode = false;
        this.combat = null;

        this.ui.setGame(this);
        this.init();
    }

    /**
     * Bootstraps the system and starts a new game.
     */
    init() {
        this.initializeSystem();
        this.startNewGame();
    }

    /**
     * Safe wrapper for setTimeout that tracks active timeouts for cleanup.
     * @param {Function} callback
     * @param {number} delay
     */
    setGameTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.activeTimeouts.delete(id);
            callback();
        }, delay);
        this.activeTimeouts.add(id);
        return id;
    }

    /**
     * @returns {number} The current turn number.
     */
    get turnNumber() { return this.turnManager ? this.turnManager.turnNumber : 1; }
    /**
     * @param {number} value The turn number to set.
     */
    set turnNumber(value) { if (this.turnManager) this.turnManager.turnNumber = value; }

    // Combat Totals compatibility getters for UI and Tests
    /**
     * @returns {number} Total attack points in current combat.
     */
    get combatAttackTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatAttackTotal : 0; }
    /**
     * @param {number} v Value to set for combat attack total.
     */
    set combatAttackTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatAttackTotal = v; }
    /**
     * @returns {number} Total block points in current combat.
     */
    get combatBlockTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatBlockTotal : 0; }
    /**
     * @param {number} v Value to set for combat block total.
     */
    set combatBlockTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatBlockTotal = v; }
    /**
     * @returns {number} Total ranged attack points.
     */
    get combatRangedTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatRangedTotal : 0; }
    /**
     * @param {number} v Value to set for ranged attack total.
     */
    set combatRangedTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatRangedTotal = v; }
    /**
     * @returns {number} Total siege attack points.
     */
    get combatSiegeTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatSiegeTotal : 0; }
    /**
     * @param {number} v Value to set for siege attack total.
     */
    set combatSiegeTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatSiegeTotal = v; }

    /**
     * Sets up event listeners, managers, and system components.
     * @private
     */
    initializeSystem() {
        this.updateStats();
        this.renderHand();
        this.renderMana();

        // Initial translation refresh
        if (this.ui.refreshTranslations) {
            this.ui.refreshTranslations();
        }

        this.phaseManager.setupTimeListener();
        this.setupVisualEffectsListeners(); // New listener cleanup
        this.inputController.setup();

        if (TouchController.isTouchDevice()) {
            this.touchController = new TouchController(this);
            this.addLog('Touch-Steuerung aktiviert', 'info');
        }

        // Delegate UI setup to UI manager
        this.ui.setupHelpSystem(this.abortController);
        const overlayParticles = this.ui.setupParticleSystem(this.canvas);
        if (overlayParticles) this.particleSystem = overlayParticles;

        // Handle Window Resize
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize(); // Initial resize
    }

    /**
     * Handles window resize for full-screen canvas
     */
    handleResize() {
        const canvas = document.getElementById('game-board');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Re-render
            this.render();
        }
    }

    /**
     * Cleans up resources and listeners when the game instance is destroyed.
     */
    destroy() {
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts.clear();
        this.abortController.abort();
        if (this.ui) this.ui.destroy();
        if (this.touchController) this.touchController.destroy();
        if (this.debugManager && this.debugManager.destroy) this.debugManager.destroy();
        // TutoriaManagers don't have listeners yet in current view, but good practice
    }

    /**
     * Called when a scenario is selected. Triggers hero selection.
     * @param {string} scenarioId 
     */
    selectScenario(scenarioId) {
        this.stateManager.openHeroSelection(scenarioId);
    }

    /**
     * Finalizes game setup after hero and scenario are chosen.
     * @param {string} scenarioId 
     * @param {string} heroId 
     */
    finishGameSetup(scenarioId, heroId) {
        this.startNewGame(scenarioId, heroId);
    }

    /**
     * Resets game state and starts a fresh session.
     * @param {string} [scenarioId=null] Optional scenario ID to load
     * @param {string} [heroId='goldyx'] Optional hero ID to load
     */
    startNewGame(scenarioId = null, heroId = 'goldyx') {
        logger.info(`Starting new game... Scenario: ${scenarioId || 'default'}`);
        // Reset Game State
        this.turnNumber = 0;
        this.gameState = 'playing';
        this.selectedCard = null;
        this.movementMode = false;
        this.reachableHexes = [];

        // Reset Time
        this.timeManager.loadState({ round: 1, timeOfDay: TIME_OF_DAY.DAY });
        this.phaseManager.updateTimeUI();

        // Clear particles
        if (this.particleSystem) {
            this.particleSystem.clear();
        }

        // Create initial game board
        this.mapManager = new MapManager(this.hexGrid); // Re-init map manager to clear map
        this.mapManager.setWorldEventManager(this.worldEventManager);

        // Load specific scenario if requested
        if (scenarioId) {
            this.scenarioManager.loadScenario(scenarioId);
        }

        const currentScenario = this.scenarioManager.getCurrentScenario();
        this.mapManager.createStartingMap(currentScenario);

        if (currentScenario) {
            this.addLog(`Szenario gestartet: ${currentScenario.name}`, 'info');
            this.showNotification(currentScenario.name, 'info');
        }

        // this.setupParticleSystem(); // Moved to initializeSystem

        // Init Debug
        // this.debugManager = new DebugManager(this); // Moved to initializeSystem

        // Create hero using HeroManager
        const heroConfig = HeroManager.getHero(heroId);
        this.hero = new Hero(heroConfig, { q: 0, r: 0 });
        this.hero.drawCards();
        logger.info(`Hero created: ${heroConfig.name} (${heroId})`);

        // Create mana source
        this.manaSource = new ManaSource(1);

        // Create enemies
        this.createEnemies();

        // Initial render
        this.render();
        logger.debug('Initial game state rendered.');

        // Show interactive tutorial on first visit
        if (!TutorialManager.hasCompleted()) {
            setTimeout(() => this.tutorial.start(), 1500);
        }

        this.addLog(t('game.welcome'), 'info');
        this.addLog(currentScenario ? this.scenarioManager.getObjectivesText() : t('game.started'), 'info');
        this.updatePhaseIndicator();
    }

    /**
     * Triggers the interactive tutorial.
     */
    showTutorial() {
        if (this.tutorial) {
            this.tutorial.start();
        }
    }

    /**
     * Helper to add a log entry via event bus
     * @param {string} message
     * @param {string} type
     * @param {Object} [details=null] Optional structured details
     */
    addLog(message, type = 'info', details = null) {
        if (!message) return;
        logger.info(`Game Log: ${message}`);
        eventBus.emit(GAME_EVENTS.LOG_ADDED, { message, type, details, timestamp: Date.now() });
    }

    /**
     * Helper to show a toast notification via event bus
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        eventBus.emit(GAME_EVENTS.TOAST_SHOW, { message, type });
    }

    /**
     * Helper to show a notification via event bus
     * @param {string} message
     * @param {string} type
     */
    showNotification(message, type = 'info') {
        eventBus.emit(GAME_EVENTS.NOTIFICATION_SHOW, { message, type });
    }

    /**
     * Opens the scenario selection modal to start a fresh session.
     */
    reset() {
        this.stateManager.openScenarioSelection();
    }

    /**
     * Initializes the game board by calling the map manager.
     */
    createGameBoard() {
        this.mapManager.createStartingMap();
    }

    /**
     * Creates enemies in appropriate locations via the entity manager.
     */
    createEnemies() { this.entityManager.createEnemies(); }

    /**
     * Compatibility wrapper for UI help system setup.
     */
    setupHelpSystem() { this.ui.setupHelpSystem(this.abortController); }

    /**
     * Compatibility wrapper for UI particle system setup.
     */
    setupParticleSystem() { this.particleSystem = this.ui.setupParticleSystem(this.canvas); }

    /**
     * Updates the phase indicator in the UI.
     */
    updatePhaseIndicator() { this.renderController.updatePhaseIndicator(); }




    /**
     * Enables movement mode for the hero.
     */
    enterMovementMode() { this.actionManager.enterMovementMode(); }
    /**
     * Disables movement mode.
     */
    exitMovementMode() { this.actionManager.exitMovementMode(); }

    /**
     * Calculates and highlights reachable hexes for the hero.
     */
    calculateReachableHexes() { this.actionManager.calculateReachableHexes(); }

    /**
     * Moves the hero to the target hex.
     * @param {number} q
     * @param {number} r
     * @returns {boolean} True if move successful.
     */
    moveHero(q, r) { return this.actionManager.moveHero(q, r); }



    /**
     * Initiates combat with the given enemy.
     * @param {Object} enemy
     */
    initiateCombat(enemy) { this.combatOrchestrator.initiateCombat(enemy); }

    /**
     * Plays a card in combat.
     * @param {number} index
     * @param {Object} card
     * @param {boolean} [useStrong=false]
     */
    playCardInCombat(index, card, useStrong = false) { this.combatOrchestrator.playCardInCombat(index, card, useStrong); }

    /**
     * Renders units available for combat.
     */
    renderUnitsInCombat() { this.combatOrchestrator.renderUnitsInCombat(); }

    /**
     * Activates a unit's ability in combat.
     * @param {Object} unit
     */
    activateUnitInCombat(unit) { this.combatOrchestrator.activateUnitInCombat(unit); }

    /**
     * Ends the block phase of combat.
     */
    endBlockPhase() { this.combatOrchestrator.endBlockPhase(); }

    /**
     * Ends combat (usually on retreat or defeat).
     */
    endCombat() { this.combatOrchestrator.onCombatEnd({ victory: false, enemy: this.combat ? this.combat.enemy : null }); }

    /**
     * Updates combat totals display in UI.
     */
    updateCombatTotals() { this.combatOrchestrator.updateCombatTotals(); }

    /**
     * Executes the main attack action in combat.
     */

    /**
     * Handles clicking an enemy in the combat panel.
     * @param {Object} enemy
     */
    handleEnemyClick(enemy) { this.combatOrchestrator.handleEnemyClick(enemy); }

    /**
     * Executes a ranged attack against the target enemy.
     * @param {Object} enemy
     */
    executeRangedAttack(enemy) { this.combatOrchestrator.executeRangedAttack(enemy); }

    /**
     * Ends the ranged attack phase.
     */
    endRangedPhase() { this.combatOrchestrator.endRangedPhase(); }

    /**
     * Grants fame to the hero.
     * @param {number} amount
     */
    gainFame(amount) { this.heroController.gainFame(amount); }
    /**
     * Triggers the level-up process.
     * @param {number} newLevel
     */
    triggerLevelUp(newLevel) { this.heroController.triggerLevelUp(newLevel); }
    /**
     * Handles selection of level-up rewards.
     * @param {Object} selection
     */
    handleLevelUpSelection(selection) { this.heroController.handleLevelUpSelection(selection); }
    /**
     * Gets the emoji representation of a mana color.
     * @param {string} color
     * @returns {string}
     */
    getManaEmoji(color) { return this.heroController.getManaEmoji(color); }
    /**
     * Updates hero's mana inventory display.
     */
    updateHeroMana() { this.heroController.updateHeroMana(); }
    /**
     * Applies healing effect to the hero.
     * @returns {boolean}
     */
    applyHealing() { return this.heroController.applyHealing(); }

    /**
     * Ends the current turn.
     */
    endTurn() { this.phaseManager.endTurn(); }
    /**
     * Executes a rest action.
     */

    /**
     * Explorates an adjacent unknown territory.
     */

    /**
     * Renders the hero's hand in the UI.
     */
    renderHand() {
        this.renderController.renderHand();
    }

    /**
     * Renders the mana source and current mana inventory in the UI.
     */
    renderMana() {
        this.renderController.renderMana();
    }

    /**
     * Updates all HUD stats, movement points, and unit displays.
     */
    updateStats() { this.renderController.updateStats(); }

    /**
     * Visits a site at the hero's current location.
     */

    /**
     * Renders the entire game state (map, heroes, enemies).
     */
    render() {
        if (this.hexGrid && typeof this.hexGrid.render === 'function') {
            this.hexGrid.render(this.hero, this.enemies);
        }
        this.updateStats();
    }

    // Save/Load functionality
    /**
     * Saves the current game state to the specified slot.
     * @param {string} slotId
     */
    saveGame(slotId) { this.stateManager.saveGame(slotId); }
    /**
     * Loads the game state from the specified slot.
     * @param {string} slotId
     * @returns {boolean} True if load successful.
     */
    loadGame(slotId) { return this.stateManager.loadGame(slotId); }

    /**
     * Gets the serializable game state.
     * @returns {Object}
     */
    getGameState() { return this.stateManager.getGameState(); }

    /**
     * Loads a provided game state object.
     * @param {Object} state
     */
    loadGameState(state) { this.stateManager.loadGameState(state); }

    /**
     * Opens the save game dialog.
     */
    openSaveDialog() { this.stateManager.openSaveDialog(); }

    /**
     * Opens the load game dialog.
     */
    openLoadDialog() { this.stateManager.openLoadDialog(); }


    /**
     * Set up listeners for visual effects (Game Juice)
     */
    setupVisualEffectsListeners() {
        // Trigger screen shake on damage notification
        // We listen to LOG_ADDED for specific keywords or add new dedicated events
        // Better: Use new dedicated events if available, or piggyback on log messages for now
        // if no dedicated 'HERO_TOOK_DAMAGE' event exists.
        // Checking constants.js for events.

        // Actually, let's subscribe to generic game events that imply impact
        // But for now, let's look at where damage happens.
        // CombatOrchestrator emits logs.

        // Let's add specific logic for dedicated effects
        eventBus.on(GAME_EVENTS.LOG_ADDED, (data) => {
            if (data.type === 'error' && (data.message.includes('Verletzung') || data.message.includes('Damage'))) {
                this.particleSystem.triggerShake(5, 0.4);
                // Add visual redness?
            }
        });

        // If we want floating numbers for damage, we need to intercept the moments damage is dealt.
        // We can expose a method 'triggerDamageVisuals(target, amount)' or listen to an event.
    }

    /**
     * Triggers visual feedback for damage
     */
    triggerDamageFeedback(x, y, amount) {
        // Calculate screen coordinates from hex/world if needed
        // For simplicity, center screen or specific UI element?
        // Ideally we want world coordinates mapped to screen.
        // HexGrid has hexToPixel(q, r).

        // If x,y are World Coords (pixels on canvas)
        if (this.particleSystem) {
            this.particleSystem.createDamageNumber(x, y, amount, amount > 3);
            this.particleSystem.triggerShake(amount * 2, 0.3);
        }
    }

    /**
     * Check for new achievements and display notifications
     */
    checkAndShowAchievements() {
        const stats = this.statisticsManager.getAll();
        const newAchievements = this.achievementManager.checkAchievements(stats);

        // Show notifications for new achievements
        newAchievements.forEach(achievement => {
            if (this.sound.success) this.sound.success();
            this.showNotification(
                `🏆 ${achievement.name} freigeschaltet!`,
                'success'
            );
            this.addLog(`🏆 Achievement: ${achievement.name} - ${achievement.description}`, 'success');

            // Apply rewards
            if (achievement.reward && achievement.reward.fame) {
                const levelResult = this.hero.gainFame(achievement.reward.fame);
                this.addLog(`Belohnung: +${achievement.reward.fame} Ruhm`, 'info');

                if (levelResult && levelResult.leveledUp) {
                    this.levelUpManager.handleLevelUp(levelResult);
                }
            }
        });

        return newAchievements;
    }
}

// Game class is imported and instantiated in main.js
