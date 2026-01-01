import { TurnManager } from './turnManager.js';
import { InteractionController } from './interactionController.js';

// Main game controller for Mage Knight

import { HexGrid } from './hexgrid.js';
import Hero from './hero.js';
import { ManaSource } from './mana.js';
import { EnemyAI } from './enemyAI.js';
import { UI } from './ui.js';
import Terrain from './terrain.js';
import SaveManager from './saveManager.js';
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
import SimpleTutorial from './simpleTutorial.js';
import SoundManager from './soundManager.js';
import TouchController from './touchController.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS, TIME_OF_DAY } from './constants.js';
import { logger } from './logger.js';

// Refactored Game Managers
import { PhaseManager } from './game/PhaseManager.js';
import { EntityManager } from './game/EntityManager.js';
import { ActionManager } from './game/ActionManager.js';
import { GameStateManager } from './game/GameStateManager.js';
import { CombatOrchestrator } from './game/CombatOrchestrator.js';
import { InputController } from './game/InputController.js';
import { RenderController } from './game/RenderController.js';
import { HeroController } from './game/HeroController.js';
import { LevelUpManager } from './game/LevelUpManager.js';

/**
 * Main Game Controller Class
 * Orchestrates the game loop, state management, and interaction between subsystems.
 */
export class MageKnightGame {
    /**
     * Initializes the game engine and subsystems.
     */
    constructor() {
        // Clear global event bus to prevent listener accumulation from previous instances
        eventBus.clear();

        this.abortController = new AbortController();
        this.gameState = 'playing';

        // Managers
        this.ui = new UI();
        this.terrain = new Terrain();
        this.saveManager = new SaveManager();
        this.timeManager = new TimeManager();
        this.achievementManager = new AchievementManager();
        this.statisticsManager = new StatisticsManager();
        this.sound = new SoundManager();
        this.animator = animator; // Initialize animator reference
        this.levelUpManager = new LevelUpManager(this);

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
        this.simpleTutorial = new SimpleTutorial(this);
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

    get turnNumber() { return this.turnManager ? this.turnManager.turnNumber : 1; }
    set turnNumber(value) { if (this.turnManager) this.turnManager.turnNumber = value; }

    // Combat Totals compatibility getters for UI and Tests
    get combatAttackTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatAttackTotal : 0; }
    set combatAttackTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatAttackTotal = v; }
    get combatBlockTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatBlockTotal : 0; }
    set combatBlockTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatBlockTotal = v; }
    get combatRangedTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatRangedTotal : 0; }
    set combatRangedTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatRangedTotal = v; }
    get combatSiegeTotal() { return this.combatOrchestrator ? this.combatOrchestrator.combatSiegeTotal : 0; }
    set combatSiegeTotal(v) { if (this.combatOrchestrator) this.combatOrchestrator.combatSiegeTotal = v; }

    /**
     * Sets up event listeners, managers, and system components.
     * @private
     */
    initializeSystem() {
        this.updateStats();
        this.renderHand();
        this.renderMana();

        this.setupTimeListener();
        this.setupVisualEffectsListeners(); // New listener cleanup
        this.inputController.setup();

        if (TouchController.isTouchDevice()) {
            this.touchController = new TouchController(this);
            this.addLog('Touch-Steuerung aktiviert', 'info');
        }

        this.setupParticleSystem();

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
        this.abortController.abort();
        if (this.ui) this.ui.destroy();
        if (this.touchController) this.touchController.destroy();
        if (this.debugManager && this.debugManager.destroy) this.debugManager.destroy();
        // TutoriaManagers don't have listeners yet in current view, but good practice
    }

    /**
     * Resets game state and starts a fresh session.
     */
    startNewGame() {
        logger.info('Starting new game...');
        // Reset Game State
        this.turnNumber = 0;
        this.gameState = 'playing';
        this.selectedCard = null;
        this.movementMode = false;
        this.reachableHexes = [];

        // Reset Time
        this.timeManager.loadState({ round: 1, timeOfDay: TIME_OF_DAY.DAY });
        this.updateTimeUI();

        // Clear particles
        if (this.particleSystem) {
            this.particleSystem.clear();
        }

        // Create initial game board
        this.mapManager = new MapManager(this.hexGrid); // Re-init map manager to clear map
        this.createGameBoard();
        // this.setupParticleSystem(); // Moved to initializeSystem

        // Init Debug
        // this.debugManager = new DebugManager(this); // Moved to initializeSystem

        // Create hero
        this.hero = new Hero('Goldyx', { q: 0, r: 0 });
        this.hero.drawCards();

        // Create mana source
        this.manaSource = new ManaSource(1);

        // Create enemies
        this.createEnemies();

        // Initial render
        this.render();
        logger.debug('Initial game state rendered.');

        // Show interactive tutorial on first visit
        if (this.simpleTutorial.shouldStart()) {
            setTimeout(() => this.simpleTutorial.start(), 1500);
        }

        this.addLog('Willkommen bei Mage Knight!', 'info');
        this.addLog('Spiel gestartet. Viel Erfolg!', 'info');
        this.updatePhaseIndicator();
    }

    /**
     * Shows the tutorial (wrapper for simpleTutorial.start)
     */
    showTutorial() {
        if (this.simpleTutorial) {
            this.simpleTutorial.start();
        }
    }

    /**
     * Helper to add a log entry via event bus
     * @param {string} message
     * @param {string} type
     */
    addLog(message, type = 'info') {
        if (!message) return;
        logger.info(`Game Log: ${message}`);
        eventBus.emit(GAME_EVENTS.LOG_ADDED, { message, type });
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

    reset() {
        // Use custom modal instead of confirm
        const modal = document.getElementById('reset-modal');
        const confirmBtn = document.getElementById('confirm-reset-btn');
        const cancelBtn = document.getElementById('cancel-reset-btn');
        const closeBtn = document.getElementById('close-reset-modal');

        const closeModal = () => {
            modal.classList.remove('active');
            // Clean up listeners to avoid duplicates
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            closeBtn.replaceWith(closeBtn.cloneNode(true));
        };

        const onConfirm = () => {
            closeModal();
            this.ui.reset();
            this.startNewGame();
        };

        // Wire up new listeners
        // We need to re-query because of cloneNode
        document.getElementById('confirm-reset-btn').addEventListener('click', onConfirm);
        document.getElementById('cancel-reset-btn').addEventListener('click', closeModal);
        document.getElementById('close-reset-modal').addEventListener('click', closeModal);

        // Show modal
        modal.classList.add('active');
    }

    createGameBoard() {
        this.mapManager.createStartingMap();
    }

    createEnemies() { this.entityManager.createEnemies(); }

    setupParticleSystem() {
        // Create overlay canvas for particles
        const container = document.querySelector('.canvas-layer');
        if (!container) {
            console.warn('Canvas layer not found for particle system');
            return;
        }
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.width = this.canvas.width;
        this.particleCanvas.height = this.canvas.height;
        this.particleCanvas.style.position = 'absolute';
        this.particleCanvas.style.top = '0';
        this.particleCanvas.style.left = '0';
        this.particleCanvas.style.pointerEvents = 'none'; // Click through to game board
        this.particleCanvas.style.zIndex = '10'; // Above game board

        container.appendChild(this.particleCanvas);

        this.particleSystem = new ParticleSystem(this.particleCanvas);

        // Override clear to clear rect
        this.particleSystem.clearCanvas = () => {
            const ctx = this.particleCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        };

        // Hook into update loop
        const originalUpdate = this.particleSystem.update.bind(this.particleSystem);
        this.particleSystem.update = () => {
            this.particleSystem.clearCanvas();
            originalUpdate();
        };
    }

    // Removed in refactor: Moved to InputHandler

    updatePhaseIndicator() { this.phaseManager.updatePhaseIndicator(); }

    setupHelpSystem() {
        const signal = this.abortController.signal;
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const helpClose = document.getElementById('help-close');
        const helpTabs = document.querySelectorAll('.help-tab');

        if (!helpBtn || !helpModal || !helpClose) return;

        // Open help modal
        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('active');
        }, { signal });

        // Close help modal
        helpClose.addEventListener('click', () => {
            helpModal.classList.remove('active');
        }, { signal });

        // Close on outside click
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        }, { signal });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal.classList.contains('active')) {
                helpModal.classList.remove('active');
            }
        }, { signal });

        // Tab switching
        helpTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active from all tabs and contents
                helpTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));

                // Add active to clicked tab and corresponding content
                tab.classList.add('active');
                const targetContent = document.getElementById(`help-${targetTab}`);
                if (targetContent) targetContent.classList.add('active');
            }, { signal });
        });


    }



    handleCanvasClick(e) { this.interactionController.handleCanvasClick(e); }
    handleCanvasMouseMove(e) { this.interactionController.handleCanvasMouseMove(e); }
    selectHex(q, r) { this.interactionController.selectHex(q, r); }
    handleCardClick(index, card) { this.interactionController.handleCardClick(index, card); }
    handleCardRightClick(index, card) { this.interactionController.handleCardRightClick(index, card); }

    enterMovementMode() { this.actionManager.enterMovementMode(); }
    exitMovementMode() { this.actionManager.exitMovementMode(); }

    calculateReachableHexes() { this.actionManager.calculateReachableHexes(); }

    moveHero(q, r) { return this.actionManager.moveHero(q, r); }



    initiateCombat(enemy) { this.combatOrchestrator.initiateCombat(enemy); }

    playCardInCombat(index, card, useStrong = false) { this.combatOrchestrator.playCardInCombat(index, card, useStrong); }

    // Render units available for combat
    renderUnitsInCombat() { this.combatOrchestrator.renderUnitsInCombat(); }

    activateUnitInCombat(unit) { this.combatOrchestrator.activateUnitInCombat(unit); }

    endBlockPhase() { this.combatOrchestrator.endBlockPhase(); }

    endCombat() { this.combatOrchestrator.onCombatEnd({ victory: false, enemy: this.combat ? this.combat.enemy : null }); }

    // Update combat totals display in UI
    updateCombatTotals() { this.combatOrchestrator.updateCombatTotals(); }

    executeAttackAction() { this.combatOrchestrator.executeAttackAction(); }

    handleEnemyClick(enemy) { this.combatOrchestrator.handleEnemyClick(enemy); }

    executeRangedAttack(enemy) { this.combatOrchestrator.executeRangedAttack(enemy); }

    endRangedPhase() { this.combatOrchestrator.endRangedPhase(); }

    gainFame(amount) { this.heroController.gainFame(amount); }
    triggerLevelUp(newLevel) { this.heroController.triggerLevelUp(newLevel); }
    handleLevelUpSelection(selection) { this.heroController.handleLevelUpSelection(selection); }
    getManaEmoji(color) { return this.heroController.getManaEmoji(color); }
    updateHeroMana() { this.heroController.updateHeroMana(); }
    applyHealing() { return this.heroController.applyHealing(); }

    endTurn() { this.phaseManager.endTurn(); }
    rest() { this.phaseManager.rest(); }

    explore() { this.actionManager.explore(); }

    renderHand() {
        this.renderController.renderHand();
    }

    renderMana() {
        this.renderController.renderMana();
    }

    updateStats() {
        this.ui.updateHeroStats(this.hero);
        this.ui.updateMovementPoints(this.hero.movementPoints);

        // Update units display
        this.ui.renderUnits(this.hero.units);

        // Update Explore button
        const canExplore = this.mapManager.canExplore(this.hero.position.q, this.hero.position.r);
        const hasPoints = this.hero.movementPoints >= 2;
        this.ui.setButtonEnabled(this.ui.elements.exploreBtn, canExplore && hasPoints && !this.combat);

        if (canExplore && hasPoints) {
            this.ui.elements.exploreBtn.title = 'Erkunden (2 Bewegungspunkte)';
        } else if (!canExplore) {
            this.ui.elements.exploreBtn.title = 'Kein unbekanntes Gebiet angrenzend';
        } else {
            this.ui.elements.exploreBtn.title = 'Nicht genug Bewegungspunkte (2 benötigt)';
        }

        // Update Visit Button
        const currentHex = this.hexGrid.getHex(this.hero.position.q, this.hero.position.r);
        const visitBtn = document.getElementById('visit-btn');
        if (visitBtn) {
            const hasSite = currentHex && currentHex.site;
            this.ui.setButtonEnabled(visitBtn, hasSite && !this.combat);
            if (hasSite) {
                visitBtn.textContent = `Besuche ${currentHex.site.getName()} `;
                visitBtn.style.display = 'inline-block';
            } else {
                visitBtn.style.display = 'none';
            }
        }
    }

    visitSite() { this.actionManager.visitSite(); }

    render() {
        if (this.hexGrid && typeof this.hexGrid.render === 'function') {
            this.hexGrid.render(this.hero, this.enemies);
        }
        this.updateStats();
    }

    // Save/Load functionality
    saveGame(slotId) { this.stateManager.saveGame(slotId); }

    getGameState() { return this.stateManager.getGameState(); }

    loadGameState(state) { this.stateManager.loadGameState(state); }

    openSaveDialog() { this.stateManager.openSaveDialog(); }

    openLoadDialog() { this.stateManager.openLoadDialog(); }

    setupTimeListener() {
        this.timeManager.addListener((state) => {
            const isNight = state.timeOfDay === TIME_OF_DAY.NIGHT;

            // Visual Transition
            const overlay = document.getElementById('day-night-overlay');
            const message = document.getElementById('day-night-message');

            if (overlay && message) {
                message.textContent = isNight ? 'Die Nacht bricht herein...' : 'Der Tag bricht an...';
                overlay.classList.add('active');

                // Play sound
                // this.sound.playTone(isNight ? 200 : 600, 1.0, 'sine'); // Placeholder if sound not ready

                setTimeout(() => {
                    // Update Game State visuals behind curtain
                    this.hexGrid.setTimeOfDay(isNight);
                    document.body.classList.toggle('night-mode', isNight);

                    // Update UI Icons
                    const timeIcon = document.getElementById('time-icon');
                    const roundNum = document.getElementById('round-number');
                    if (timeIcon) {
                        timeIcon.textContent = isNight ? '🌙' : '☀️';
                        timeIcon.className = `time-icon ${isNight ? 'night' : ''}`;
                    }
                    if (roundNum) roundNum.textContent = state.round;

                    this.render();

                    setTimeout(() => {
                        overlay.classList.remove('active');
                    }, 1500);
                }, 1000);
            } else {
                // Fallback if no overlay
                this.hexGrid.setTimeOfDay(isNight);
                this.render();
            }

            this.addLog(`Runde ${state.round}: ${isNight ? 'Nacht' : 'Tag'}`, 'info');

            // Enemy Turn / World Update
            const enemyLogs = this.enemyAI.updateEnemies(this.enemies, this.hero);
            if (enemyLogs && enemyLogs.length > 0) {
                enemyLogs.forEach(log => this.addLog(log, 'warning'));
                this.showToast('Feinde haben sich bewegt!', 'warning');
            }
        });
    }

    /**
     * Updates the Round and Time icons in the UI based on TimeManager state.
     */
    updateTimeUI() {
        const state = this.timeManager.getState();
        const isNight = state.timeOfDay === TIME_OF_DAY.NIGHT;

        const timeIcon = document.getElementById('time-icon');
        const roundNum = document.getElementById('round-number');

        if (timeIcon) {
            timeIcon.textContent = isNight ? '🌙' : '☀️';
            timeIcon.className = `time-icon ${isNight ? 'night' : ''}`;
        }
        if (roundNum) {
            roundNum.textContent = state.round;
        }

        document.body.classList.toggle('night-mode', isNight);
        document.body.classList.toggle('night-mode', isNight);
        this.hexGrid.setTimeOfDay(isNight);
    }

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
