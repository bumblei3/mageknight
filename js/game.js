import { TurnManager } from './turnManager.js';
import { InputHandler } from './inputHandler.js';
import { InteractionController } from './interactionController.js';

// Main game controller for Mage Knight

import { HexGrid } from './hexgrid.js';
import Hero from './hero.js';
import { ManaSource } from './mana.js';
import { EnemyAI } from './enemyAI.js';
import { Combat } from './combat.js';
import { UI } from './ui.js';
import Terrain from './terrain.js';
import SaveManager from './saveManager.js';
import TutorialManager from './tutorialManager.js';
import { TimeManager } from './timeManager.js';
import { MapManager } from './mapManager.js';
import ParticleSystem from './particles.js';
import { animator } from './animator.js';
import { SiteInteractionManager } from './siteInteraction.js';
import { createUnit } from './unit.js';
import { DebugManager } from './debug.js';
import { getRandomSkills } from './skills.js';
import { SAMPLE_ADVANCED_ACTIONS, createDeck, Card } from './card.js';
import AchievementManager from './achievements.js';
import { StatisticsManager } from './statistics.js';
import SimpleTutorial from './simpleTutorial.js';
import SoundManager from './soundManager.js';
import TouchController from './touchController.js';
import { createEnemy } from './enemy.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS, TIME_OF_DAY, COMBAT_PHASES } from './constants.js';

// Refactored Game Managers
import { PhaseManager } from './game/PhaseManager.js';
import { EntityManager } from './game/EntityManager.js';
import { ActionManager } from './game/ActionManager.js';
import { GameStateManager } from './game/GameStateManager.js';
import { CombatOrchestrator } from './game/CombatOrchestrator.js';

/**
 * Main Game Controller Class
 * Orchestrates the game loop, state management, and interaction between subsystems.
 */
export class MageKnightGame {
    /**
     * Initializes the game engine and subsystems.
     */
    constructor() {
        this.abortController = new AbortController();
        this.gameState = 'playing';

        // Managers
        this.ui = new UI();
        this.terrain = new Terrain();
        this.saveManager = new SaveManager();
        this.timeManager = new TimeManager();
        this.achievementManager = new AchievementManager();
        this.statisticsManager = new StatisticsManager();
        this.statisticsManager = new StatisticsManager();
        this.sound = new SoundManager();
        this.animator = animator; // Initialize animator reference

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
        this.siteManager = new SiteInteractionManager(this);
        this.debug = new DebugManager(this);

        // New Refactored Controllers
        this.turnManager = new TurnManager(this);
        this.interactionController = new InteractionController(this);
        this.inputHandler = new InputHandler(this);

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

        // State
        this.movementMode = false;
        this.combat = null;

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
        this.inputHandler.setup();

        if (TouchController.isTouchDevice()) {
            this.touchController = new TouchController(this);
            this.addLog('Touch-Steuerung aktiviert', 'info');
        }

        this.setupParticleSystem();
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
        // Reset Game State
        this.turnNumber = 0;
        this.gameState = 'playing';
        this.selectedCard = null;
        this.movementMode = false;
        this.reachableHexes = [];

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
        const container = document.querySelector('.board-wrapper');
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

    playCardInCombat(index, card) { this.combatOrchestrator.playCardInCombat(index, card); }

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

    gainFame(amount) {
        const result = this.hero.gainFame(amount);
        if (result.leveledUp) {
            this.statisticsManager.trackLevelUp(result.newLevel);
            this.addLog(`🎉 STUFENAUFSTIEG! Stufe ${result.newLevel} erreicht!`, 'success');
            this.showNotification(`Stufe ${result.newLevel} erreicht!`, 'success');
            this.triggerLevelUp(result.newLevel);
        }
    }

    triggerLevelUp(newLevel) {
        // Pause game / block input?

        // Generate choices
        const skills = getRandomSkills('GOLDYX', 2, this.hero.skills);

        // Get 3 random advanced actions (simplified: just take samples)
        const cards = createDeck(SAMPLE_ADVANCED_ACTIONS); // In real game, draw 3 from advanced deck

        this.ui.showLevelUpModal(newLevel, { skills, cards }, (selection) => {
            this.handleLevelUpSelection(selection);
        });
    }

    handleLevelUpSelection(selection) {
        // Apply Skill
        if (selection.skill) {
            this.hero.addSkill(selection.skill);
            this.addLog(`Fertigkeit gelernt: ${selection.skill.name} `, 'success');
        }

        // Apply Card
        // Apply Card
        if (selection.card) {
            this.hero.gainCardToHand(selection.card);
            this.addLog(`Karte erhalten(auf die Hand): ${selection.card.name} `, 'success');
        }

        // Apply Level Up stats
        this.hero.levelUp();

        // Particle Effect
        const heroPixel = this.hexGrid.axialToPixel(this.hero.displayPosition.q, this.hero.displayPosition.r);
        this.particleSystem.levelUpExplosion(heroPixel.x, heroPixel.y);

        this.updateStats();
        this.render();
    }

    handleManaClick(index, color) {
        const mana = this.manaSource.takeDie(index, this.timeManager.isNight());
        if (mana) {
            // Add to hero's mana inventory
            this.hero.takeManaFromSource(mana);

            this.addLog(`Mana genommen: ${this.getManaEmoji(color)} ${color} `, 'info');

            // Particle Effect
            const heroPixel = this.hexGrid.axialToPixel(this.hero.position.q, this.hero.position.r);
            this.particleSystem.manaEffect(heroPixel.x, heroPixel.y, color);

            // Update UI
            this.renderMana();
            this.updateHeroMana();
        }
    }

    getManaEmoji(color) {
        const emojis = {
            red: '🔥',
            blue: '💧',
            white: '✨',
            green: '🌿',
            gold: '💰',
            black: '🌑'
        };
        return emojis[color] || '⬛';
    }

    updateHeroMana() {
        this.ui.renderHeroMana(this.hero.getManaInventory());
    }

    applyHealing() {
        if (!this.hero) {
            return false;
        }

        if (this.hero.healingPoints <= 0) {
            this.addLog('Keine Heilungspunkte verfügbar.', 'info');
            return false;
        }

        if (this.hero.wounds.length === 0) {
            this.addLog('Keine Verletzungen zum Heilen.', 'info');
            return false;
        }

        const success = this.hero.healWound(true);
        if (success) {
            this.addLog('Verletzung geheilt!', 'success');
            this.sound.heal();
            this.updateStats();
            this.renderHand();
            return true;
        }
        return false;
    }

    endTurn() { this.phaseManager.endTurn(); }
    rest() { this.phaseManager.rest(); }

    explore() { this.actionManager.explore(); }

    renderHand() {
        this.ui.renderHandCards(
            this.hero.hand,
            (index, card) => this.handleCardClick(index, card),
            (index, card) => this.handleCardRightClick(index, card)
        );
    }

    renderMana() {
        this.ui.renderManaSource(
            this.manaSource,
            (index, color) => this.handleManaClick(index, color),
            this.timeManager.isNight()
        );
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
            this.ui.elements.exploreBtn.title = "Erkunden (2 Bewegungspunkte)";
        } else if (!canExplore) {
            this.ui.elements.exploreBtn.title = "Kein unbekanntes Gebiet angrenzend";
        } else {
            this.ui.elements.exploreBtn.title = "Nicht genug Bewegungspunkte (2 benötigt)";
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
                        timeIcon.className = `time - icon ${isNight ? 'night' : ''} `;
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

            this.addLog(`Runde ${state.round}: ${isNight ? 'Nacht' : 'Tag'} `, 'info');
        });
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
            this.addLog(`🏆 Achievement: ${achievement.name} - ${achievement.description} `, 'success');

            // Apply rewards
            if (achievement.reward && achievement.reward.fame) {
                this.hero.gainFame(achievement.reward.fame);
                this.addLog(`Belohnung: +${achievement.reward.fame} Ruhm`, 'info');
            }
        });

        return newAchievements;
    }

    setupSoundToggle() {
        // Create sound toggle button if it doesn't exist
        let soundBtn = document.getElementById('sound-toggle-btn');

        if (!soundBtn) {
            // Add to header
            const headerRight = document.querySelector('.header-right');
            if (!headerRight) return; // Guard if header doesn't exist

            soundBtn = document.createElement('button');
            soundBtn.id = 'sound-toggle-btn';
            soundBtn.className = 'btn-icon';
            soundBtn.title = 'Sound ein/aus';
            soundBtn.innerHTML = this.sound.enabled ? '🔊' : '🔇';
            headerRight.insertBefore(soundBtn, headerRight.firstChild);
        }

        // Toggle sound on click
        soundBtn.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            soundBtn.innerHTML = enabled ? '🔊' : '🔇';
            this.addLog(enabled ? 'Sound aktiviert' : 'Sound deaktiviert', 'info');
        }, { signal: this.abortController.signal });

        this.setupUIListeners();
    }

    setupUIListeners() {
        const signal = this.abortController.signal;

        // Achievements Modal
        const achievementsBtn = document.getElementById('achievements-btn');
        const achievementsModal = document.getElementById('achievements-modal');
        const achievementsClose = document.getElementById('achievements-close');

        if (achievementsBtn && achievementsModal) {
            achievementsBtn.addEventListener('click', () => {
                this.renderAchievements('all');
                achievementsModal.style.display = 'block';
            });

            achievementsClose.addEventListener('click', () => {
                achievementsModal.style.display = 'none';
            });

            // Tabs
            const tabs = achievementsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.renderAchievements(e.target.dataset.category);
                });
            });
        }

        // Statistics Modal
        const statsBtn = document.getElementById('statistics-btn');
        const statsModal = document.getElementById('statistics-modal');
        const statsClose = document.getElementById('statistics-close');

        if (statsBtn && statsModal) {
            statsBtn.addEventListener('click', () => {
                this.renderStatistics('global');
                statsModal.style.display = 'block';
            });

            statsClose.addEventListener('click', () => {
                statsModal.style.display = 'none';
            });

            // Tabs
            const tabs = statsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.renderStatistics(e.target.dataset.category);
                });
            });
        }

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === achievementsModal) achievementsModal.style.display = 'none';
            if (e.target === statsModal) statsModal.style.display = 'none';
        });
    }

    renderAchievements(category) {
        const list = document.getElementById('achievements-list');
        const progressBar = document.getElementById('achievements-progress-bar');
        const progressText = document.getElementById('achievements-progress-text');

        if (!list) return;

        list.innerHTML = '';

        // Update Progress
        const progress = this.achievementManager.getProgress();
        progressBar.style.width = `${progress.percentage}% `;
        progressText.textContent = `${progress.unlocked}/${progress.total} Freigeschaltet (${progress.percentage}%)`;

        // Filter and Render
        const allAchievements = Object.values(this.achievementManager.achievements);
        const filtered = category === 'all'
            ? allAchievements
            : allAchievements.filter(a => a.category === category);

        filtered.forEach(ach => {
            const isUnlocked = this.achievementManager.isUnlocked(ach.id);
            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;

            let dateStr = '';
            if (isUnlocked) {
                // Timestamps currently not tracked per achievement
                /*
               const timestamp = this.achievementManager.unlockedAchievements.get(ach.id);
               if (timestamp) {
                   const date = new Date(timestamp);
                   dateStr = `<span class="achievement-date">Freigeschaltet: ${date.toLocaleDateString()}</span>`;
               }
               */
            }

            card.innerHTML = `
                <div class="achievement-icon">${ach.icon || '🏆'}</div>
                <div class="achievement-info">
                    <h3>${ach.name}</h3>
                    <p>${ach.description}</p>
                    ${dateStr}
                </div>
            `;
            list.appendChild(card);
        });
    }

    renderStatistics(category) {
        const grid = document.getElementById('statistics-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const stats = this.statisticsManager.getAll();

        const createStatCard = (label, value) => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <span class="value">${value}</span>
                <span class="label">${label}</span>
            `;
            grid.appendChild(card);
        };

        if (category === 'global') {
            createStatCard('Spiele gespielt', stats.gamesPlayed || 0);
            createStatCard('Siege', stats.gamesWon || 0);
            createStatCard('Niederlagen', stats.gamesLost || 0);
            createStatCard('Feinde besiegt (Total)', stats.enemiesDefeated || 0);
            createStatCard('Höchstes Level', stats.highestLevel || 1);
            createStatCard('Perfekte Kämpfe', stats.perfectCombats || 0);
        } else {
            // Current Game Stats (some might need to be tracked separately per game if not reset)
            // For now showing session stats
            createStatCard('Runde', this.turnNumber || 1);
            createStatCard('Ruhm', this.hero.fame || 0);
            createStatCard('Verletzungen', this.hero.wounds || 0);
            createStatCard('Deck Größe', this.hero.deck.length + this.hero.hand.length + this.hero.discard.length);
            createStatCard('Einheiten', this.hero.units.length);
        }
    }

    // Moved to InteractionController
}


// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MageKnightGame();
});
