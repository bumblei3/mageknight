import { TurnManager } from './turnManager';
import { InteractionController } from './interactionController';

import { HexGrid } from './hexgrid';
import Hero from './hero';
import { ManaSource } from './mana';
import { EnemyAI } from './enemyAI';
import { UI } from './ui';
import Terrain from './terrain';
import TutorialManager from './tutorialManager';
import { TimeManager } from './timeManager';
import { MapManager } from './mapManager';
import { VolkareController } from './game/VolkareController';
import { WorldEventManager } from './worldEvents';
import ParticleSystem from './particles';
import { WeatherSystem } from './particles/WeatherSystem';

import { animator } from './animator';
import { SiteInteractionManager } from './siteInteraction';
import { DebugManager } from './debug';
import AchievementManager from './achievements';
import { StatisticsManager } from './statistics';
import SoundManager from './soundManager';
import TouchController from './touchController';
import { eventBus } from './eventBus';
import { GAME_EVENTS, TIME_OF_DAY } from './constants';
import { t } from './i18n/index';
import { logger } from './logger';

import { ScenarioManager } from './game/ScenarioManager';
import { LevelUpManager } from './game/LevelUpManager';
import { RewardManager } from './game/RewardManager';
import { PhaseManager } from './game/PhaseManager';
import { EntityManager } from './game/EntityManager';
import { ActionManager } from './game/ActionManager';
import { GameStateManager } from './game/GameStateManager';
import { CombatOrchestrator } from './game/CombatOrchestrator';
import { HeroController } from './game/HeroController';
import { InputController } from './game/InputController';
import { RenderController } from './game/RenderController';
import { ShortcutManager } from './game/ShortcutManager';
import { HeroManager } from './game/HeroManager';
import { store } from './game/Store';

/**
 * Main Game Controller Class
 * Orchestrates the game loop, state management, and interaction between subsystems.
 */
export class MageKnightGame {
    public debugTeleport: boolean = false;
    public abortController: AbortController;
    public activeTimeouts: Set<NodeJS.Timeout | number>;
    public gameState: string;
    public isTestEnvironment: boolean;

    // Subsystems & Managers
    public ui: any; // To be converted to UI
    public terrain: any;
    public saveManager: any;
    public timeManager: any;
    private _sound: any | null = null;
    private _achievementManager: any | null = null;
    private _statisticsManager: any | null = null;
    private _tutorial: any | null = null;
    public animator: any;
    public levelUpManager: LevelUpManager;
    public rewardManager: RewardManager;
    public scenarioManager: ScenarioManager;

    // Core Components
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D | null;
    public hexGrid: any;
    public hero: any;
    public enemies: any[];
    public manaSource: any;
    public enemyAI: any;
    public particleSystem: any;
    public weatherSystem: any;
    public mapManager: any;
    public worldEventManager: any;
    public siteManager: any;
    public debug: any;

    // Refactored Controllers
    public turnManager: TurnManager;
    public interactionController: InteractionController;
    public shortcutManager: ShortcutManager;
    public inputController: InputController;
    public renderController: RenderController;
    public touchController: any;

    // Core Game Managers
    public phaseManager: PhaseManager;
    public entityManager: EntityManager;
    public actionManager: ActionManager;
    public stateManager: GameStateManager;
    public combatOrchestrator: CombatOrchestrator;
    public heroController: HeroController;
    public volkare: VolkareController; // Boss

    // State
    public movementMode: boolean;
    public combat: any | null;
    public reachableHexes: any[] = [];
    public selectedCard: any | null = null;

    /**
     * Initializes the game engine and subsystems.
     */
    constructor() {
        // Clear global event bus and store listeners to prevent listener accumulation from previous instances
        eventBus.clear();
        if (store) {
            (store as any).clearListeners();
            (store as any).reset();
        }

        this.abortController = new AbortController();
        this.activeTimeouts = new Set();
        this.gameState = 'playing';
        this.isTestEnvironment = !!(
            (typeof window !== 'undefined' && ((window as any).isTest || (window as any).__playwright__ || navigator.webdriver)) ||
            (globalThis as any).isTestEnvironment
        );

        // Managers
        this.ui = new UI();
        this.terrain = new Terrain();
        // Legacy compatibility for tests
        this.saveManager = {
            saveGame: (slotId: string) => this.stateManager.saveGame(slotId),
            loadGame: (slotId: string) => this.stateManager.loadGame(slotId),
            autoSave: () => this.stateManager.saveGame('auto')
        };
        this.timeManager = new TimeManager();
        this._sound = null;
        this._achievementManager = null;
        this._statisticsManager = null;
        this._tutorial = null;
        this.animator = animator; // Initialize animator reference
        this.levelUpManager = new LevelUpManager(this);
        this.rewardManager = new RewardManager(this);
        this.scenarioManager = new ScenarioManager(this);

        // Core Components
        const board = document.getElementById('game-board');
        if (board instanceof HTMLCanvasElement) {
            this.canvas = board;
        } else {
            console.warn('Game canvas not found, creating fallback.');
            this.canvas = document.createElement('canvas');
            this.canvas.width = 800;
            this.canvas.height = 600;
            this.canvas.id = 'game-board';
        }
        this.ctx = this.canvas.getContext('2d');
        this.hexGrid = new HexGrid(this.canvas);
        this.hexGrid.setTerrainSystem(this.terrain); // Link terrain to hexGrid
        this.hero = new Hero('GOLDYX');
        this.enemies = [];
        this.manaSource = new ManaSource();
        this.enemyAI = new EnemyAI(this);
        this.particleSystem = new ParticleSystem(this.canvas);
        this.weatherSystem = new WeatherSystem(this.particleSystem, this.canvas);
        this.particleSystem.registerSystem(this.weatherSystem);

        this.mapManager = new MapManager(this);
        this.worldEventManager = new WorldEventManager(this);
        this.mapManager.setWorldEventManager(this.worldEventManager);

        this.siteManager = new SiteInteractionManager(this);
        this.debug = new DebugManager(this);

        // New Refactored Controllers
        this.turnManager = new TurnManager(this);
        this.interactionController = new InteractionController(this);
        this.shortcutManager = new ShortcutManager();
        this.inputController = new InputController(this);
        this.renderController = new RenderController(this);

        // UI Helpers
        this.touchController = new TouchController(this);

        // Core Game Managers
        this.phaseManager = new PhaseManager(this);
        this.entityManager = new EntityManager(this);
        this.actionManager = new ActionManager(this);
        this.stateManager = new GameStateManager(this);
        this.combatOrchestrator = new CombatOrchestrator(this);
        this.heroController = new HeroController(this);
        this.volkare = new VolkareController(this);

        // State
        this.movementMode = false;
        this.combat = null;

        this.ui.setGame(this);
        this.init();
    }

    /**
     * Bootstraps the system and shows the scenario selection.
     */
    init(): void {
        this.initializeSystem();

        // Start default game so UI has valid state
        this.startNewGame(null, 'goldyx');

        // Show scenario selection modal after a brief delay
        this.setGameTimeout(async () => {
            if (this.stateManager &&
                this.ui &&
                this.scenarioManager &&
                !this.isTestEnvironment) {
                await this.stateManager.openScenarioSelection();
            }
        }, 500);
    }

    /**
     * Safe wrapper for setTimeout that tracks active timeouts for cleanup.
     */
    setGameTimeout(callback: () => void, delay: number): number | NodeJS.Timeout {
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
    get turnNumber(): number { return this.turnManager ? this.turnManager.turnNumber : 1; }
    /**
     * @param {number} value The turn number to set.
     */
    set turnNumber(value: number) {
        if (this.turnManager) this.turnManager.turnNumber = value;
    }

    // Lazy Getters for heavy systems
    get sound(): any {
        if (!this._sound) {
            this._sound = new SoundManager();
            console.log('[Lazy] SoundManager initialized');
        }
        return this._sound;
    }

    set sound(value: any) {
        this._sound = value;
    }

    get achievementManager(): any {
        if (!this._achievementManager) {
            this._achievementManager = new AchievementManager();
            if (this._achievementManager && typeof this._achievementManager.setGame === 'function') {
                this._achievementManager.setGame(this);
            }
            console.log('[Lazy] AchievementManager initialized');
        }
        return this._achievementManager;
    }

    set achievementManager(value: any) {
        this._achievementManager = value;
    }

    get statisticsManager(): any {
        if (!this._statisticsManager) {
            this._statisticsManager = new StatisticsManager();
            console.log('[Lazy] StatisticsManager initialized');
        }
        return this._statisticsManager;
    }

    set statisticsManager(value: any) {
        this._statisticsManager = value;
    }

    get tutorial(): any {
        if (!this._tutorial) {
            this._tutorial = new TutorialManager(this);
            console.log('[Lazy] TutorialManager initialized');
        }
        return this._tutorial;
    }

    set tutorial(value: any) {
        this._tutorial = value;
    }

    // Combat Totals compatibility getters for UI and Tests
    get combatAttackTotal(): number { return this.combatOrchestrator ? this.combatOrchestrator.combatAttackTotal : 0; }
    set combatAttackTotal(v: number) { if (this.combatOrchestrator) this.combatOrchestrator.combatAttackTotal = v; }
    get combatBlockTotal(): number { return this.combatOrchestrator ? this.combatOrchestrator.combatBlockTotal : 0; }
    set combatBlockTotal(v: number) { if (this.combatOrchestrator) this.combatOrchestrator.combatBlockTotal = v; }
    get combatRangedTotal(): number { return this.combatOrchestrator ? this.combatOrchestrator.combatRangedTotal : 0; }
    set combatRangedTotal(v: number) { if (this.combatOrchestrator) this.combatOrchestrator.combatRangedTotal = v; }
    get combatSiegeTotal(): number { return this.combatOrchestrator ? this.combatOrchestrator.combatSiegeTotal : 0; }
    set combatSiegeTotal(v: number) { if (this.combatOrchestrator) this.combatOrchestrator.combatSiegeTotal = v; }

    /**
     * Sets up event listeners, managers, and system components.
     * @private
     */
    private initializeSystem(): void {
        this.updateStats();
        this.renderHand();
        this.renderMana();

        // Initial translation refresh
        if (this.ui && this.ui.refreshTranslations) {
            this.ui.refreshTranslations();
        }

        this.phaseManager.setupTimeListener();

        // Volkare Logic
        eventBus.on(GAME_EVENTS.TIME_CHANGED, () => {
            if (this.volkare && this.volkare.isActive) {
                this.volkare.move();
            }
        });

        this.setupVisualEffectsListeners();
        this.inputController.setup();

        if (TouchController.isTouchDevice()) {
            this.touchController = new TouchController(this);
            this.addLog('Touch-Steuerung aktiviert', 'info');
        }

        // Delegate UI setup to UI manager
        this.ui.setupHelpSystem(this.abortController);
        const overlayParticles = this.ui.setupParticleSystem(this.canvas);
        if (overlayParticles) this.particleSystem = overlayParticles;

        // Handle Window Resize - Debounced to prevent layout thrashing
        let resizeTimeout: number | NodeJS.Timeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout as any);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });
        this.handleResize(); // Initial resize
    }

    /**
     * Handles window resize for full-screen canvas
     */
    handleResize(): void {
        const canvas = document.getElementById('game-board') as HTMLCanvasElement;
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
    destroy(): void {
        this.activeTimeouts.forEach(id => clearTimeout(id as any));
        this.activeTimeouts.clear();
        this.abortController.abort();
        if (this.ui) this.ui.destroy();
        if (this.touchController) this.touchController.destroy();
        if (this.interactionController) this.interactionController.destroy();
        if (this.debug && this.debug.destroy) this.debug.destroy();
    }

    /**
     * Called when a scenario is selected. Triggers hero selection.
     */
    selectScenario(scenarioId: string): void {
        this.stateManager.openHeroSelection(scenarioId);
    }

    /**
     * Finalizes game setup after hero and scenario are chosen.
     */
    finishGameSetup(scenarioId: string, heroId: string): void {
        this.startNewGame(scenarioId, heroId);
    }

    /**
     * Resets game state and starts a fresh session.
     */
    startNewGame(scenarioId: string | null = null, heroId: string = 'goldyx'): void {
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
        this.mapManager = new MapManager(this);
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

        // Create hero using HeroManager
        const heroConfig = HeroManager.getHero(heroId);
        this.hero = new Hero(heroConfig, { q: 0, r: 0 });
        this.hero.drawCards();
        logger.info(`Hero created: ${heroConfig.name} (${heroId})`);

        // Create mana source
        this.manaSource = new ManaSource(1);

        // Create enemies
        this.createEnemies();

        // Spawn Volkare (Demo Scenario)
        // Hardcoded positions: Start far away, Target is Hero's start (Portal?)
        // Assuming map has some size.
        if (this.volkare) {
            const startPos = { q: -3, r: 0 }; // Arbitrary start
            const targetPos = { q: 2, r: 0 }; // Hero/Portal area
            this.volkare.spawn(startPos, targetPos);
        }

        // Initial render
        this.render();
        logger.debug('Initial game state rendered.');

        // Show interactive tutorial on first visit
        if (!this.isTestEnvironment && !TutorialManager.hasCompleted()) {
            setTimeout(() => this.tutorial.start(), 1500);
        }

        this.addLog(t('game.welcome'), 'info');
        this.addLog(currentScenario ? this.scenarioManager.getObjectivesText() : t('game.started'), 'info');
        this.updatePhaseIndicator();
    }

    /**
     * Triggers the interactive tutorial.
     */
    showTutorial(): void {
        if (this.tutorial) {
            this.tutorial.start();
        }
    }

    /**
     * Helper to add a log entry via event bus
     */
    addLog(message: string, type: string = 'info', details: any = null): void {
        if (!message) return;
        logger.info(`Game Log: ${message}`);
        eventBus.emit(GAME_EVENTS.LOG_ADDED, { message, type, details, timestamp: Date.now() });
    }

    /**
     * Helper to show a toast notification via event bus
     */
    showToast(message: string, type: string = 'info'): void {
        eventBus.emit(GAME_EVENTS.TOAST_SHOW, { message, type });
    }

    /**
     * Helper to show a notification via event bus
     */
    showNotification(message: string, type: string = 'info'): void {
        eventBus.emit(GAME_EVENTS.NOTIFICATION_SHOW, { message, type });
    }

    /**
     * Opens the scenario selection modal to start a fresh session.
     */
    reset(): void {
        this.stateManager.openScenarioSelection();
    }

    /**
     * Initializes the game board by calling the map manager.
     */
    createGameBoard(): void {
        this.mapManager.createStartingMap();
    }

    /**
     * Creates enemies in appropriate locations via the entity manager.
     */
    createEnemies(): void { this.entityManager.createEnemies(); }

    /**
     * Compatibility wrapper for UI help system setup.
     */
    setupHelpSystem(): void { this.ui.setupHelpSystem(this.abortController); }

    /**
     * Compatibility wrapper for UI particle system setup.
     */
    setupParticleSystem(): void { this.particleSystem = this.ui.setupParticleSystem(this.canvas); }

    /**
     * Updates the phase indicator in the UI.
     */
    updatePhaseIndicator(): void { this.renderController.updatePhaseIndicator(); }

    /**
     * Enables movement mode for the hero.
     */
    enterMovementMode(): void { this.actionManager.enterMovementMode(); }
    /**
     * Disables movement mode.
     */
    exitMovementMode(): void { this.actionManager.exitMovementMode(); }

    /**
     * Calculates and highlights reachable hexes for the hero.
     */
    calculateReachableHexes(): void { this.actionManager.calculateReachableHexes(); }

    /**
     * Moves the hero to the target hex.
     */
    moveHero(q: number, r: number): Promise<void> { return this.actionManager.moveHero(q, r); }

    /**
     * Initiates combat with the given enemy.
     */
    initiateCombat(enemy: any): void { this.combatOrchestrator.initiateCombat(enemy); }

    /**
     * Plays a card in combat.
     */
    playCardInCombat(index: number, card: any, useStrong: boolean = false): void {
        this.combatOrchestrator.playCardInCombat(index, card, useStrong);
    }

    /**
     * Renders units available for combat.
     */
    renderUnitsInCombat(): void { this.combatOrchestrator.renderUnitsInCombat(); }

    /**
     * Activates a unit's ability in combat.
     */
    activateUnitInCombat(unit: any): void { this.combatOrchestrator.activateUnitInCombat(unit); }

    /**
     * Ends the block phase of combat.
     */
    endBlockPhase(): void { this.combatOrchestrator.endBlockPhase(); }

    /**
     * Ends combat (usually on retreat or defeat).
     */
    endCombat(): void {
        this.combatOrchestrator.onCombatEnd({ victory: false, enemy: this.combat ? this.combat.enemy : null });
    }

    /**
     * Updates combat totals display in UI.
     */
    updateCombatTotals(): void { this.combatOrchestrator.updateCombatTotals(); }

    /**
     * Handles clicking an enemy in the combat panel.
     */
    handleEnemyClick(enemy: any): void { this.combatOrchestrator.handleEnemyClick(enemy); }

    /**
     * Executes a ranged attack against the target enemy.
     */
    executeRangedAttack(enemy: any): void { this.combatOrchestrator.executeRangedAttack(enemy); }

    /**
     * Ends the ranged attack phase.
     */
    endRangedPhase(): void { this.combatOrchestrator.endRangedPhase(); }

    /**
     * Grants fame to the hero.
     */
    gainFame(amount: number): void { this.heroController.gainFame(amount); }
    /**
     * Triggers the level-up process.
     */
    triggerLevelUp(newLevel: number): void { this.heroController.triggerLevelUp(newLevel); }
    /**
     * Handles selection of level-up rewards.
     */
    handleLevelUpSelection(selection: any): void { this.heroController.handleLevelUpSelection(selection); }
    /**
     * Gets the emoji representation of a mana color.
     */
    getManaEmoji(color: string): string { return this.heroController.getManaEmoji(color); }
    /**
     * Updates hero's mana inventory display.
     */
    updateHeroMana(): void { this.heroController.updateHeroMana(); }
    /**
     * Applies healing effect to the hero.
     */
    applyHealing(): boolean { return this.heroController.applyHealing(); }

    /**
     * Executes the rest action.
     */
    rest(): void { this.phaseManager.rest(); }

    /**
     * Ends the current turn.
     */
    endTurn(): void { this.phaseManager.endTurn(); }

    /**
     * Renders the hero's hand in the UI.
     */
    renderHand(): void {
        this.renderController.renderHand();
    }

    /**
     * Renders the mana source and current mana inventory in the UI.
     */
    renderMana(): void {
        this.renderController.renderMana();
    }

    /**
     * Updates all HUD stats, movement points, and unit displays.
     */
    updateStats(): void { this.renderController.updateStats(); }

    /**
     * Renders the entire game state (map, heroes, enemies).
     */
    render(): void {
        if (this.hexGrid && typeof this.hexGrid.render === 'function') {
            this.hexGrid.render(this.hero, this.enemies);
        }
        this.updateStats();
    }

    // Save/Load functionality
    /**
     * Saves the current game state to the specified slot.
     */
    saveGame(slotId: string): void { this.stateManager.saveGame(slotId); }
    /**
     * Loads the game state from the specified slot.
     */
    loadGame(slotId: string): boolean { return this.stateManager.loadGame(slotId); }

    /**
     * Gets the serializable game state.
     */
    getGameState(): any { return this.stateManager.getGameState(); }

    /**
     * Loads a provided game state object.
     */
    loadGameState(state: any): void { this.stateManager.loadGameState(state); }

    /**
     * Opens the save game dialog.
     */
    openSaveDialog(): void { this.stateManager.openSaveDialog(); }

    /**
     * Opens the load game dialog.
     */
    openLoadDialog(): void { this.stateManager.openLoadDialog(); }


    /**
     * Set up listeners for visual effects (Game Juice)
     */
    private setupVisualEffectsListeners(): void {
        eventBus.on(GAME_EVENTS.LOG_ADDED, (data: any) => {
            if (data.type === 'error' && (data.message.includes('Verletzung') || data.message.includes('Damage'))) {
                this.particleSystem.triggerShake(5, 0.4);
            }
        });

        eventBus.on(GAME_EVENTS.HERO_MOVE_STEP, (data: any) => {
            const pixel = this.hexGrid.axialToPixel(data.from.q, data.from.r);
            this.particleSystem.dustCloudEffect(pixel.x, pixel.y);
            const newPixel = this.hexGrid.axialToPixel(data.to.q, data.to.r);
            this.particleSystem.trailEffect(newPixel.x, newPixel.y, '#8b5cf6');
        });

        eventBus.on(GAME_EVENTS.COMBAT_BLOCK, (data: any) => {
            const pixel = this.hexGrid.axialToPixel(data.enemyPos.q, data.enemyPos.r);
            this.particleSystem.shieldBlockEffect(pixel.x, pixel.y);
            this.particleSystem.createFloatingText(pixel.x, pixel.y - 30, 'BLOCK!', '#60a5fa');
        });

        eventBus.on(GAME_EVENTS.COMBAT_DAMAGE, (data: any) => {
            const pixel = this.hexGrid.axialToPixel(data.targetPos.q, data.targetPos.r);
            this.particleSystem.damageSplatter(pixel.x, pixel.y, data.amount);
            this.particleSystem.createDamageNumber(pixel.x, pixel.y, data.amount, data.amount >= 5);
            if (data.amount >= 3) this.particleSystem.triggerShake(data.amount, 0.3);
        });
    }

    /**
     * Triggers visual feedback for damage
     */
    triggerDamageFeedback(x: number, y: number, amount: number): void {
        if (this.particleSystem) {
            this.particleSystem.createDamageNumber(x, y, amount, amount > 3);
            this.particleSystem.triggerShake(amount * 2, 0.3);
        }
    }

    /**
     * Check for new achievements and display notifications
     */
    checkAndShowAchievements(): any[] {
        const stats = this.statisticsManager.getAll();
        const newAchievements = this.achievementManager.checkAchievements(stats);

        newAchievements.forEach((achievement: any) => {
            if (this.sound.success) this.sound.success();
            this.showNotification(
                `🏆 ${achievement.name} freigeschaltet!`,
                'success'
            );
            this.addLog(`🏆 Achievement: ${achievement.name} - ${achievement.description}`, 'success');

            // Apply rewards
            if (achievement.reward && achievement.reward.fame && this.hero) {
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
