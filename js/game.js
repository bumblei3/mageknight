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
        this.sound = new SoundManager();

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

        // State
        this.movementMode = false;
        this.combat = null;

        // Combat Accumulation
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

        // Debug Flags
        this.debugTeleport = false;

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

    createEnemies() {
        this.enemies = [];
        // Generate enemies for all hexes that should have them
        this.hexGrid.hexes.forEach((hex, key) => {
            // Skip starting area (0,0) and adjacent
            if (Math.abs(hex.q) <= 1 && Math.abs(hex.r) <= 1) return;

            // Chance to spawn enemy based on terrain
            let shouldSpawn = false;
            const terrainName = this.terrain.getName(hex.terrain);

            if (['ruins', 'keep', 'mage_tower', 'city'].includes(terrainName)) {
                shouldSpawn = true;
            } else if (Math.random() < 0.3 && terrainName !== 'water') {
                shouldSpawn = true;
            }

            if (shouldSpawn) {
                // Calculate level based on distance from center
                const distance = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r));
                const level = Math.max(1, Math.floor(distance / 2));

                const enemy = this.enemyAI.generateEnemy(terrainName, level);
                enemy.position = { q: hex.q, r: hex.r };
                // Ensure unique ID
                enemy.id = `enemy_${hex.q}_${hex.r}_${Date.now()}`;

                this.enemies.push(enemy);
            }
        });

        console.log(`Spawned ${this.enemies.length} enemies.`);
    }

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

    updatePhaseIndicator() {
        const phaseText = document.querySelector('.phase-text');
        const phaseHint = document.getElementById('phase-hint');

        if (!phaseText || !phaseHint) return;

        if (this.combat) {
            const phaseNames = {
                'ranged': 'Fernkampf-Phase',
                'block': 'Block-Phase',
                'damage': 'Schadens-Phase',
                'attack': 'Angriffs-Phase',
                'complete': 'Kampf Ende'
            };

            const hints = {
                'ranged': '🏹 Nutze Fernkampf- oder Belagerungsangriffe (Töten sofort!)',
                'block': '🛡️ Spiele blaue Karten zum Blocken',
                'damage': '💔 Schaden wird verrechnet...',
                'attack': '⚔️ Spiele rote Karten zum Angreifen',
                'complete': '✅ Kampf abgeschlossen!'
            };

            phaseText.textContent = phaseNames[this.combat.phase] || 'Kampf';
            phaseHint.textContent = hints[this.combat.phase] || 'Kämpfe!';
        } else if (this.movementMode) {
            phaseText.textContent = 'Bewegung';
            phaseHint.textContent = `👣 ${this.hero.movementPoints} Punkte - Klicke auf ein Feld`;
        } else {
            const timeIcon = this.timeManager.isDay() ? '☀️' : '🌙';
            phaseText.textContent = `Erkundung(${timeIcon})`;
            phaseHint.textContent = '🎴 Spiele Karten oder bewege dich (1-5)';
        }
    }

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

    enterMovementMode() {
        this.movementMode = true;
        this.calculateReachableHexes();
        this.addLog(`Bewegungsmodus: ${this.hero.movementPoints} Punkte verfügbar`, 'movement');
        this.updatePhaseIndicator();
        this.render();
    }

    exitMovementMode() {
        this.movementMode = false;
        this.hexGrid.clearHighlights();
        this.reachableHexes = [];
        this.updatePhaseIndicator();
        this.render();
    }

    calculateReachableHexes() {
        // Simple flood fill to find reachable hexes
        this.reachableHexes = [];
        const visited = new Set();
        const queue = [{ pos: this.hero.position, cost: 0 }];

        while (queue.length > 0) {
            const { pos, cost } = queue.shift();
            const key = `${pos.q},${pos.r} `;

            if (visited.has(key)) continue;
            visited.add(key);

            if (cost <= this.hero.movementPoints) {
                this.reachableHexes.push(pos);
            }

            const neighbors = this.hexGrid.getNeighbors(pos.q, pos.r);
            neighbors.forEach(neighbor => {
                if (!this.hexGrid.hasHex(neighbor.q, neighbor.r)) return;

                const hexData = this.hexGrid.getHex(neighbor.q, neighbor.r);
                const moveCost = this.terrain.getMovementCost(hexData.terrain, this.timeManager.isNight());
                const newCost = cost + moveCost;

                if (newCost <= this.hero.movementPoints) {
                    queue.push({ pos: neighbor, cost: newCost });
                }
            });
        }

        this.hexGrid.highlightHexes(this.reachableHexes);
    }

    moveHero(q, r) {
        // Check if hex is reachable
        const isReachable = this.reachableHexes.some(hex => hex.q === q && hex.r === r);

        if (!isReachable) {
            this.addLog('Hex nicht erreichbar!', 'info');
            return;
        }

        const hexData = this.hexGrid.getHex(q, r);
        const moveCost = this.terrain.getMovementCost(hexData.terrain, this.timeManager.isNight());

        const startQ = this.hero.displayPosition.q;
        const startR = this.hero.displayPosition.r;

        if (this.hero.moveTo(q, r, moveCost)) {
            this.sound.move();
            const terrainName = this.terrain.getName(hexData.terrain);
            this.addLog(`Bewegt nach ${q},${r} (${terrainName}) - ${moveCost} Kosten`, 'movement');

            // Animate movement
            animator.animateProperties(
                this.hero.displayPosition,
                { q: q, r: r },
                500,
                {
                    easing: 'easeInOutQuad',
                    onUpdate: () => {
                        this.render();
                        // Optional: Add trail particles during movement
                        if (Math.random() > 0.7) {
                            const pixel = this.hexGrid.axialToPixel(this.hero.displayPosition.q, this.hero.displayPosition.r);
                            this.particleSystem.trailEffect(pixel.x, pixel.y);
                        }
                    },
                    onComplete: () => {
                        this.render();
                        // Reveal map at new position
                        this.mapManager.revealMap(q, r, 2);

                        // Check for exploration opportunity (if at edge)
                        if (this.mapManager.canExplore(q, r)) {
                            this.showNotification('Neues Gebiet kann erkundet werden! (Klicke auf leeres Feld)', 'info');
                            // For now, auto-explore if very close to edge? 
                            // Or better: let user click. But we don't have a specific "Explore" button yet.
                            // Let's auto-explore for smooth gameplay in this version.
                            const exploreResult = this.mapManager.explore(q, r);
                            if (exploreResult.success) {
                                this.addLog(exploreResult.message, 'success');
                                // Reveal the new tile immediately
                                this.mapManager.revealMap(exploreResult.center.q, exploreResult.center.r, 2);
                            }
                        }
                    }
                }
            );

            // Check if there's an enemy on this hex (BUG FIX: add null check for position)
            const enemy = this.enemies.find(e => e.position && e.position.q === q && e.position.r === r);
            if (enemy) {
                this.addLog(`Feind entdeckt: ${enemy.name} !`, 'combat');
                this.exitMovementMode();
                this.initiateCombat(enemy);
                return;
            }

            // Check for site
            if (hexData.site) {
                this.addLog(`Ort entdeckt: ${hexData.site.getName()} `, 'info');
                // Show visit button
                const visitBtn = document.getElementById('visit-btn');
                if (visitBtn) {
                    visitBtn.style.display = 'inline-block';
                    visitBtn.disabled = false;
                    // Highlight button to draw attention
                    visitBtn.classList.add('pulse');
                }
            } else {
                // Hide visit button if no site
                const visitBtn = document.getElementById('visit-btn');
                if (visitBtn) visitBtn.style.display = 'none';
            }

            if (this.hero.movementPoints === 0) {
                this.exitMovementMode();
            } else {
                this.calculateReachableHexes();
            }

            this.updateStats();
            // Render is handled by animation
        }
    }



    initiateCombat(enemy) {
        this.combat = new Combat(this.hero, enemy);
        const result = this.combat.start();

        // Initialize combat accumulation
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

        this.addLog(result.message, 'combat');
        this.ui.showCombatPanel(this.combat.enemies, this.combat.phase, (enemy) => this.handleEnemyClick(enemy));

        // Show units in combat

        // Show units in combat
        this.renderUnitsInCombat();

        this.updatePhaseIndicator();
        this.renderHand();
        this.updateCombatTotals();
    }

    playCardInCombat(index, card) {
        if (!this.combat || card.isWound()) return;

        const phase = this.combat.phase;
        const result = this.hero.playCard(index, false, this.timeManager.isNight());

        if (!result) return;

        // Particle Effect
        const rect = this.ui.elements.playedCards.getBoundingClientRect();
        const x = rect.right - 50;
        const y = rect.top + 75;
        this.particleSystem.playCardEffect(x, y, result.card.color);

        // Build effect description
        const effectParts = [];

        // Accumulate attack and block values
        if (phase === 'block' && result.effect.block) {
            this.combatBlockTotal += result.effect.block;
            effectParts.push(`+ ${result.effect.block} Block`);
        } else if (phase === 'ranged') {
            if (result.effect.ranged || result.effect.attack) { // Allow normal attack as Ranged? No. Ranged Only.
                // Actually, some cards give "Ranged Attack". Normal Attack cards usually don't work in Ranged phase.
                // But for simplicity/fun, maybe we allow "Attack" as "Ranged" with penalty? No, stick to rules.
                // We need to check if card allows Ranged. 
                // If default attack card is played, it does nothing?
                // Let's assume we have specific Ranged cards or we treat Attack as Ranged / 2?
                // MK Rule: Only Ranged attacks work.

                // However, we don't have many Ranged cards defined yet.
                // Let's check result.card for 'ranged' property or effect.
                const isRanged = result.card.type === 'spell' || result.effect.ranged;
                // Spells like Fireball are Ranged.

                if (result.effect.attack && (result.effect.ranged || result.card.type === 'spell')) {
                    this.combatRangedTotal += result.effect.attack;
                    effectParts.push(`+ ${result.effect.attack} Fernkampf`);
                }
                if (result.effect.siege) {
                    this.combatSiegeTotal += result.effect.attack; // Siege is also attack value
                    effectParts.push(`+ ${result.effect.attack} Belagerung`);
                }
            }
        }

        if (phase === COMBAT_PHASES.ATTACK && result.effect.attack) {
            this.combatAttackTotal += result.effect.attack;
            effectParts.push(`+ ${result.effect.attack} Angriff`);
        }

        // Other effects (movement, influence, etc.) are also applied
        if (result.effect.movement) {
            effectParts.push(`+ ${result.effect.movement} Bewegung`);
        }
        if (result.effect.influence) {
            effectParts.push(`+ ${result.effect.influence} Einfluss`);
        }
        if (result.effect.healing) {
            effectParts.push(`+ ${result.effect.healing} Heilung`);
        }

        const effectDesc = effectParts.length > 0 ? effectParts.join(', ') : 'Effekt';
        this.addLog(`${result.card.name}: ${effectDesc} `, 'combat');
        this.ui.addPlayedCard(result.card, result.effect);
        this.ui.showPlayArea();

        this.renderHand();
        this.updateStats();
        this.updateCombatTotals();
    }

    // Render units available for combat
    renderUnitsInCombat() {
        if (!this.combat) return;

        // Get ready units that can act in this phase
        const readyUnits = this.hero.units.filter(unit => unit.isReady() || true); // Show all for now

        this.ui.renderUnitsInCombat(
            readyUnits,
            this.combat.phase,
            (unit) => this.activateUnitInCombat(unit)
        );
    }

    // Activate a unit in combat
    activateUnitInCombat(unit) {
        if (!this.combat) return;

        const result = this.combat.activateUnit(unit);

        if (result.success) {
            this.addLog(result.message, 'combat');

            // Visual feedback
            const heroPixel = this.hexGrid.axialToPixel(this.hero.position.q, this.hero.position.r);
            this.particleSystem.buffEffect(heroPixel.x, heroPixel.y);

            // Re-render units to show updated status
            this.renderUnitsInCombat();
            this.updateStats();
        } else {
            this.addLog(result.message, 'info');
        }
    }

    endBlockPhase() {
        if (!this.combat) return;

        // Use accumulated block values to block enemies
        if (this.combatBlockTotal > 0 || (this.combat && this.combat.unitBlockPoints > 0)) {
            // Try to block enemies with accumulated block
            this.combat.enemies.forEach(enemy => {
                if (this.combatBlockTotal <= 0 && this.combat.unitBlockPoints <= 0) return;

                const blockResult = this.combat.blockEnemy(enemy, this.combatBlockTotal);
                if (blockResult.success && blockResult.blocked) {
                    this.addLog(`${enemy.name} geblockt mit ${blockResult.consumedPoints} Block`, 'combat');
                    // Consume the value used from this.combatBlockTotal
                    this.combatBlockTotal -= (blockResult.consumedPoints || 0);
                    if (this.combatBlockTotal < 0) this.combatBlockTotal = 0;
                }
            });
        }

        const result = this.combat.endBlockPhase();

        // Particle Effect for Damage
        if (result.woundsReceived > 0) {
            const heroPixel = this.hexGrid.axialToPixel(this.hero.displayPosition.q, this.hero.displayPosition.r);
            this.particleSystem.damageSplatter(heroPixel.x, heroPixel.y, result.woundsReceived);
        }
        this.addLog(result.message, 'combat');
        this.ui.updateCombatInfo(this.combat.enemies, this.combat.phase, (enemy) => this.handleEnemyClick(enemy));

        // Reset block total, prepare for attack phase
        this.combatBlockTotal = 0;

        // Update unit display for new phase
        this.renderUnitsInCombat();

        this.updatePhaseIndicator();
        this.updateStats();
        this.updateCombatTotals();
    }

    endCombat() {
        if (!this.combat) return;

        const result = this.combat.endCombat();
        this.addLog(result.message, result.victory ? 'info' : 'combat');

        // Reset combat accumulation
        this.combatAttackTotal = 0;
        this.combatBlockTotal = 0;
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;
        this.combat = null;

        this.render();
    }

    // Update combat totals display in UI
    updateCombatTotals() {
        if (!this.combat) return;
        this.ui.updateCombatTotals(this.combatAttackTotal, this.combatBlockTotal, this.combat.phase);
    }

    // Execute attack action (Button Click)
    executeAttackAction() {
        if (!this.combat) return;

        // In Ranged Phase, the button is "End Phase / Skip"
        if (this.combat.phase === 'ranged') {
            this.endRangedPhase();
            return;
        }

        if (this.combat.phase !== 'attack') return;

        if (this.combatAttackTotal === 0) {
            this.addLog('Keine Angriffspunkte verfügbar!', 'info');
            return;
        }

        // Particle Impact on enemies
        this.combat.enemies.forEach(enemy => {
            const pixelPos = this.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
            this.particleSystem.impactEffect(pixelPos.x, pixelPos.y);
        });

        // Normal Attack Phase
        const attackResult = this.combat.attackEnemies(this.combatAttackTotal, 'physical');

        if (attackResult.success) {
            this.addLog(attackResult.message, 'success');

            // Track stats
            attackResult.defeated.forEach(enemy => {
                this.statisticsManager.trackEnemyDefeated(enemy);
            });

            // Remove defeated enemies from map (game state)
            this.enemies = this.enemies.filter(e =>
                !attackResult.defeated.includes(e)
            );

            // Check victory
            if (this.combat.enemies.length === 0) {
                this.endCombat();
            } else {
                this.ui.updateCombatInfo(this.combat.enemies, this.combat.phase, (e) => this.handleEnemyClick(e));
                this.updateCombatTotals();
            }
        } else {
            this.addLog(attackResult.message, 'warning');
        }
    }

    // Handle Enemy Click (Targeting for Ranged/Block - though Block is currently auto)
    handleEnemyClick(enemy) {
        if (!this.combat) return;

        if (this.combat.phase === 'ranged') {
            this.executeRangedAttack(enemy);
        } else if (this.combat.phase === 'block') {
            // Future: Targeted Block
            // For now Block is auto-distributed in endBlockPhase
        }
    }

    executeRangedAttack(enemy) {
        // Calculate attack values from cards
        const attackValue = this.combatRangedTotal + this.combatSiegeTotal;
        const isSiege = this.combatSiegeTotal > 0;

        const attackResult = this.combat.rangedAttackEnemy(enemy, attackValue, isSiege);

        this.addLog(attackResult.message, 'combat');

        if (attackResult.success) {
            // Track defeated enemies
            attackResult.defeated.forEach(enemy => {
                this.statisticsManager.trackEnemyDefeated(enemy);
            });

            // Remove defeated enemies from map
            this.enemies = this.enemies.filter(e =>
                !attackResult.defeated.includes(e)
            );

            if (this.combat.enemies.length === 0) {
                this.endCombat();
                return;
            }
        }

        if (attackResult.success && attackResult.consumedPoints > 0) {
            if (isSiege) {
                this.combatSiegeTotal -= attackResult.consumedPoints;
                if (this.combatSiegeTotal < 0) this.combatSiegeTotal = 0;
            } else {
                this.combatRangedTotal -= attackResult.consumedPoints;
                if (this.combatRangedTotal < 0) this.combatRangedTotal = 0;
            }
        }

        this.render();
        this.updateStats();
        this.updateCombatTotals();
    }

    endRangedPhase() {
        if (!this.combat) return;

        const result = this.combat.endRangedPhase();
        this.addLog(result.message, 'combat');

        if (result.phase === 'block') {
            this.ui.updateCombatInfo(this.combat.enemies, this.combat.phase, (enemy) => this.handleEnemyClick(enemy));
            this.renderUnitsInCombat();
            this.updatePhaseIndicator();
            this.updateStats();
            this.updateCombatTotals();
        } else if (result.victory) {
            this.endCombat();
        }
    }

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

    endTurn() { this.turnManager.endTurn(); }

    rest() {
        if (this.combat) {
            this.addLog('Kann nicht im Kampf rasten!', 'info');
            return;
        }
        // Particle Effect
        const heroPixel = this.hexGrid.axialToPixel(this.hero.displayPosition.q, this.hero.displayPosition.r);
        this.particleSystem.healAura(heroPixel.x, heroPixel.y);

        // Simple rest: discard one card
        if (this.hero.hand.length > 0) {
            const nonWoundIndex = this.hero.hand.findIndex(c => !c.isWound());
            if (nonWoundIndex >= 0) {
                this.hero.discardCard(nonWoundIndex);
                this.addLog('Rast: 1 Karte abgelegt', 'info');
                this.renderHand();
            }
        }
    }

    explore() {
        if (this.combat) return;

        if (this.hero.movementPoints < 2) {
            this.addLog('Nicht genug Bewegungspunkte (Kosten: 2)', 'info');
            this.showToast('Nicht genug Bewegungspunkte!', 'warning');
            return;
        }

        const result = this.mapManager.explore(this.hero.position.q, this.hero.position.r);
        if (result.success) {
            this.hero.movementPoints -= 2;
            this.addLog(result.message, 'info');
            this.updateStats();
            this.render();
        } else {
            this.addLog(result.message, 'info');
        }
    }

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

    visitSite() {
        if (this.combat) return;

        const currentHex = this.hexGrid.getHex(this.hero.position.q, this.hero.position.r);
        if (!currentHex || !currentHex.site) return;

        const site = currentHex.site;
        this.addLog(`Besuche ${site.getName()}...`, 'info');

        // Get interaction data from manager
        const interactionData = this.siteManager.visitSite(currentHex, site);

        // Show UI
        this.ui.showSiteModal(interactionData);
    }

    render() {
        if (this.hexGrid && typeof this.hexGrid.render === 'function') {
            this.hexGrid.render(this.hero, this.enemies);
        }
        this.updateStats();
    }

    // Save/Load functionality
    saveGame() {
        if (this.combat) {
            this.addLog('Kann nicht im Kampf speichern!', 'warning');
            this.showToast('Kann nicht im Kampf speichern!', 'warning');
            return;
        }
        this.saveManager.saveGame(0, this.getGameState()); // Slot 0 default
        this.addLog('Spiel gespeichert!', 'success');
        this.showToast('Spiel gespeichert (Slot 0)', 'success');
    }

    getGameState() {
        return {
            turn: this.turnNumber,
            hero: this.hero,
            enemies: this.enemies,
            manaSource: this.manaSource,
            terrain: this.terrain,
            selectedHex: this.hexGrid.selectedHex || null,
            movementMode: this.movementMode
        };
    }

    loadGameState(state) {
        if (!state) return;
        this.turnNumber = state.turn || 0;

        // Restore hero
        this.hero.position = state.hero.position;
        this.hero.deck = state.hero.deck.map(c => new Card(c));
        this.hero.hand = state.hero.hand.map(c => new Card(c));
        this.hero.discard = state.hero.discard.map(c => new Card(c));
        this.hero.wounds = state.hero.wounds.map(c => new Card(c));
        this.hero.fame = state.hero.fame;
        this.hero.reputation = state.hero.reputation;
        this.hero.crystals = state.hero.crystals;
        this.hero.movementPoints = state.hero.movementPoints || 0;
        this.hero.attackPoints = state.hero.attackPoints || 0;
        this.hero.blockPoints = state.hero.blockPoints || 0;
        this.hero.influencePoints = state.hero.influencePoints || 0;
        this.hero.healingPoints = state.hero.healingPoints || 0;

        // Restore enemies
        this.enemies = state.enemies.map(e => {
            // We need to import createEnemy or use a helper
            // Since we can't easily add import to top of file without reading it all,
            // we'll assume we can add the import or use a workaround.
            // Wait, I can add the import to the top of the file in a separate edit.
            // For now, let's use a placeholder if I can't add import.
            // Actually, I should add the import.
            // But let's look at how I can fix this block first.
            // If I can't import, I might be stuck.
            // But I can use this.enemyAI.generateEnemy if I knew the terrain.
            // But I have the type.
            // Let's assume I will add the import.
            const enemy = createEnemy(e.type);
            if (enemy) {
                enemy.position = e.position;
                enemy.id = e.id || `enemy_${e.position.q}_${e.position.r}_${Date.now()} `;
                if (e.currentHealth) enemy.currentHealth = e.currentHealth;
            }
            return enemy;
        }).filter(e => e !== null);

        // Update UI
        this.renderHand();
        this.renderMana();
        this.render();
        this.addLog('Spielstand geladen', 'info');
        this.showToast('Spielstand geladen', 'success');
    }

    openSaveDialog() {
        const saves = this.saveManager.listSaves();
        let message = '💾 SPIELSTAND SPEICHERN\n\n';

        saves.forEach(save => {
            if (save.empty) {
                message += `Slot ${save.slotId + 1}: [Leer]\n`;
            } else {
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date} \n`;
            }
        });

        message += '\nWähle Slot (1-5) oder Abbrechen:';
        const slot = prompt(message);

        if (slot && slot >= 1 && slot <= 5) {
            const success = this.saveManager.saveGame(parseInt(slot) - 1, this.getGameState());
            if (success) {
                this.addLog(`Spiel in Slot ${slot} gespeichert`, 'info');
                this.showToast(`Spiel in Slot ${slot} gespeichert`, 'success');
            } else {
                this.addLog('Fehler beim Speichern', 'error');
                this.showToast('Fehler beim Speichern', 'error');
            }
        }
    }

    openLoadDialog() {
        const saves = this.saveManager.listSaves();
        let message = '📂 SPIELSTAND LADEN\n\n';

        saves.forEach(save => {
            if (save.empty) {
                message += `Slot ${save.slotId + 1}: [Leer]\n`;
            } else {
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date} \n`;
            }
        });

        message += '\nWähle Slot (1-5) oder Abbrechen:';
        const slot = prompt(message);

        if (slot && slot >= 1 && slot <= 5) {
            const state = this.saveManager.loadGame(parseInt(slot) - 1);
            if (state) {
                this.loadGameState(state);
            } else {
                this.addLog('Fehler beim Laden', 'info');
                this.showToast('Fehler beim Laden', 'error');
            }
        }
    }

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
