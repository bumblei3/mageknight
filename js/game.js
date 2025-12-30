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
import SimpleTutorial from './simpleTutorial.js';
import SoundManager from './soundManager.js';
import TouchController from './touchController.js';
import AchievementManager from './achievements.js';
import StatisticsManager from './statistics.js';
import { createEnemy } from './enemy.js';
import { eventBus } from './eventBus.js';
import { GAME_EVENTS, TIME_OF_DAY } from './constants.js';

export class MageKnightGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.hexGrid = new HexGrid(this.canvas);
        this.terrain = new Terrain();
        this.hero = null;
        this.enemies = [];
        this.manaSource = null;
        this.combat = null;
        this.ui = new UI();
        this.saveManager = new SaveManager();
        this.timeManager = new TimeManager();
        this.mapManager = new MapManager(this.hexGrid);
        this.tutorialManager = null;  // Will be initialized after game setup
        this.turnNumber = 0;
        this.gameState = 'playing'; // 'playing', 'victory', 'defeat'

        this.selectedCard = null;
        this.movementMode = false;
        this.reachableHexes = [];

        // Particle System
        this.particleCanvas = null;
        this.particleSystem = null;

        this.siteManager = new SiteInteractionManager(this);
        this.debugManager = null;
        this.debugTeleport = false;

        // Sound System
        this.sound = new SoundManager();

        // Touch Controller for mobile
        this.touchController = null;

        // Achievements and Statistics
        this.achievementManager = new AchievementManager();
        this.statisticsManager = new StatisticsManager();

        // Enemy AI
        this.enemyAI = new EnemyAI(this);

        this.init();
    }

    init() {
        this.initializeSystem();
        this.startNewGame();
    }

    initializeSystem() {
        // Setup UI event listeners
        this.setupEventListeners();

        // Setup Time Manager Listener
        this.setupTimeListener();

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);
        this.simpleTutorial = new SimpleTutorial(this);

        // Initialize touch controls if on mobile device
        if (TouchController.isTouchDevice()) {
            this.touchController = new TouchController(this);
            this.addLog('Touch-Steuerung aktiviert', 'info');
        }

        this.setupParticleSystem();
        this.debugManager = new DebugManager(this);
    }

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
        this.renderHand();
        this.renderMana();
        this.ui.updateHeroStats(this.hero);
    }

    /**
     * Helper to add a log entry via event bus
     * @param {string} message 
     * @param {string} type 
     */
    addLog(message, type = 'info') {
        eventBus.emit(GAME_EVENTS.LOG_ADDED, { message, type });
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
                enemy.id = `enemy_${hex.q}_${hex.r}_${Date.now()} `;

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

    setupEventListeners() {
        // End turn button
        this.ui.elements.endTurnBtn.addEventListener('click', () => this.endTurn());

        // Rest button
        this.ui.elements.restBtn.addEventListener('click', () => this.rest());

        // Explore button
        this.ui.elements.exploreBtn.addEventListener('click', () => this.explore());

        // Visit Site button (will be added dynamically or reused?)
        // Let's add a generic action button for sites if needed, or just use context menu?
        // Plan: Add a "Visit Site" button to UI or reuse an existing slot?
        // Better: Add a new button to index.html first.
        // For now, let's assume we add it to UI class dynamically or use a new button.
        // Let's add it to index.html in the next step, but I can add the listener here now if I assume the ID.
        // Visit Site button
        const visitBtn = document.getElementById('visit-btn');
        if (visitBtn) visitBtn.addEventListener('click', () => this.visitSite());

        // Execute Attack button (combat action)
        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) executeAttackBtn.addEventListener('click', () => this.executeAttackAction());

        // Save/Load buttons
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.openSaveDialog());
        if (loadBtn) loadBtn.addEventListener('click', () => this.openLoadDialog());

        // New Game button
        if (this.ui.elements.newGameBtn) {
            this.ui.elements.newGameBtn.addEventListener('click', () => this.reset());
        }

        // Canvas click for movement
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Canvas hover for tooltips
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.ui.tooltipManager.hideTooltip();
        });

        // Help system
        this.setupHelpSystem();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Sound toggle
        this.setupSoundToggle();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input or help modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (document.getElementById('help-modal').classList.contains('active')) return;

            // Number keys 1-5 to play cards
            if (e.key >= '1' && e.key <= '5') {
                const index = parseInt(e.key) - 1;
                if (index < this.hero.hand.length) {
                    this.handleCardClick(index, this.hero.hand[index]);
                    this.addLog(`Karte ${e.key} gespielt(Tastatur)`, 'info');
                }
                e.preventDefault();
            }

            // Space to end turn
            if (e.key === ' ' || e.code === 'Space') {
                this.endTurn();
                e.preventDefault();
            }

            // H for help
            if (e.key === 'h' || e.key === 'H') {
                document.getElementById('help-btn').click();
                e.preventDefault();
            }

            // R for rest
            if (e.key === 'r' || e.key === 'R') {
                this.rest();
                e.preventDefault();
            }

            // Ctrl+S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.openSaveDialog();
            }

            // Ctrl+L for load
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.openLoadDialog();
            }

            // T for tutorial
            if (e.key === 't' || e.key === 'T') {
                this.showTutorial();
                e.preventDefault();
            }

            // Escape to exit movement mode or close modals
            if (e.key === 'Escape') {
                if (this.movementMode) {
                    this.exitMovementMode();
                    this.addLog('Bewegungsmodus abgebrochen', 'info');
                }
            }

            // Tab to cycle cards (visual only for now)
            if (e.key === 'Tab') {
                e.preventDefault();
                // Logic to cycle selection could go here
                // For now just log
                // this.addLog('Tab: Karte wählen (WIP)', 'info');
            }

            // M for Mana Panel highlight
            if (e.key === 'm' || e.key === 'M') {
                const manaPanel = document.querySelector('.mana-panel');
                if (manaPanel) {
                    manaPanel.scrollIntoView({ behavior: 'smooth' });
                    manaPanel.classList.add('highlight-pulse');
                    setTimeout(() => manaPanel.classList.remove('highlight-pulse'), 1000);
                }
            }
        });
    }

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
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const helpClose = document.getElementById('help-close');
        const helpTabs = document.querySelectorAll('.help-tab');

        // Open help modal
        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('active');
        });

        // Close help modal
        helpClose.addEventListener('click', () => {
            helpModal.classList.remove('active');
        });

        // Close on outside click
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal.classList.contains('active')) {
                helpModal.classList.remove('active');
            }
        });

        // Tab switching
        helpTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active from all tabs and contents
                helpTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));

                // Add active to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(`help - ${targetTab} `).classList.add('active');
            });
        });

        // Show tutorial on first visit
        const hasSeenTutorial = localStorage.getItem('mageKnightTutorialSeen');
        if (!hasSeenTutorial) {
            setTimeout(() => this.showTutorial(), 1000);
        }
    }

    showTutorial() {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        const tutorialTitle = document.getElementById('tutorial-title');
        const tutorialText = document.getElementById('tutorial-text');
        const tutorialNext = document.getElementById('tutorial-next');
        const tutorialSkip = document.getElementById('tutorial-skip');

        const tutorialSteps = [
            {
                title: '👋 Willkommen bei Mage Knight!',
                text: 'Dies ist ein Tutorial, das dir die Grundlagen des Spiels zeigt. Du kannst es jederzeit überspringen oder später über den ❓-Button aufrufen.'
            },
            {
                title: '🎴 Karten spielen',
                text: 'Unten siehst du deine Handkarten. Klicke mit Links auf eine Karte, um sie zu spielen. Mit Rechtsklick kannst du sie seitlich für +1 Bewegung/Angriff/Block/Einfluss spielen.'
            },
            {
                title: '👣 Bewegung',
                text: 'Spiele grüne Karten für Bewegungspunkte. Erreichbare Felder werden violett hervorgehoben. Klicke auf ein Feld, um dich dorthin zu bewegen.'
            },
            {
                title: '⚔️ Kampf',
                text: 'Wenn du ein Feld mit einem Feind betrittst, beginnt automatisch ein Kampf. Nutze blaue Karten zum Blocken und rote Karten zum Angreifen!'
            },
            {
                title: '🎯 Ziel',
                text: 'Besiege alle 3 Feinde auf der Karte, um zu gewinnen! Viel Erfolg!'
            }
        ];

        let currentStep = 0;

        const showStep = () => {
            if (currentStep >= tutorialSteps.length) {
                tutorialOverlay.style.display = 'none';
                localStorage.setItem('mageKnightTutorialSeen', 'true');
                return;
            }

            const step = tutorialSteps[currentStep];
            tutorialTitle.textContent = step.title;
            tutorialText.textContent = step.text;

            if (currentStep === tutorialSteps.length - 1) {
                tutorialNext.textContent = 'Los geht\'s!';
            }
        };

        tutorialNext.addEventListener('click', () => {
            currentStep++;
            showStep();
        });

        tutorialSkip.addEventListener('click', () => {
            tutorialOverlay.style.display = 'none';
            localStorage.setItem('mageKnightTutorialSeen', 'true');
        });

        tutorialOverlay.style.display = 'flex';
        showStep();
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.hexGrid.pixelToAxial(x, y);

        // Check if hex exists
        if (!this.hexGrid.hasHex(hex.q, hex.r)) {
            return;
        }

        // Debug Teleport
        if (this.debugTeleport) {
            this.hero.position = { q: hex.q, r: hex.r };
            this.hero.displayPosition = { q: hex.q, r: hex.r };
            this.render();
            this.addLog(`Debug: Teleported to ${hex.q},${hex.r} `, 'info');
            this.debugTeleport = false;
            return;
        }

        if (this.movementMode) {
            this.moveHero(hex.q, hex.r);
        } else {
            this.selectHex(hex.q, hex.r);
        }
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.hexGrid.pixelToAxial(x, y);

        // Check if hex exists
        if (!this.hexGrid.hasHex(hex.q, hex.r)) {
            this.ui.tooltipManager.hideTooltip();
            return;
        }

        // Check for enemy (BUG FIX: add null check for position)
        const enemy = this.enemies.find(e => e.position && e.position.q === hex.q && e.position.r === hex.r);
        if (enemy) {
            // Show enemy tooltip
            const dummyEl = {
                getBoundingClientRect: () => ({
                    left: e.clientX,
                    top: e.clientY,
                    width: 0,
                    height: 0,
                    right: e.clientX,
                    bottom: e.clientY
                })
            };
            this.ui.tooltipManager.showEnemyTooltip(dummyEl, enemy);
            return;
        }

        // Show terrain tooltip
        const hexData = this.hexGrid.getHex(hex.q, hex.r);
        if (hexData) {
            const dummyEl = {
                getBoundingClientRect: () => ({
                    left: e.clientX,
                    top: e.clientY,
                    width: 0,
                    height: 0,
                    right: e.clientX,
                    bottom: e.clientY
                })
            };
            this.ui.tooltipManager.showTerrainTooltip(dummyEl, hexData.terrain, {});
        }
    }

    selectHex(q, r) {
        this.hexGrid.selectHex(q, r);

        // Check if there's an enemy here (BUG FIX: add null check for position)
        const enemy = this.enemies.find(e => e.position && e.position.q === q && e.position.r === r);

        if (enemy) {
            this.addLog(`Feind gefunden: ${enemy.name} (Rüstung: ${enemy.armor}, Angriff: ${enemy.attack})`, 'combat');

            // Check if hero is adjacent
            const distance = this.hexGrid.distance(this.hero.position.q, this.hero.position.r, q, r);
            if (distance === 0) {
                // Hero is on the same hex - offer to attack
                this.initiateCombat(enemy);
            }
        }

        const hexData = this.hexGrid.getHex(q, r);
        if (hexData) {
            const terrainName = this.terrain.getName(hexData.terrain);
            this.addLog(`Hex ausgewählt: ${q},${r} - ${terrainName} `, 'info');
        }

        this.render();
    }

    handleCardClick(index, card) {
        if (this.combat) {
            // In combat, cards are handled differently
            this.playCardInCombat(index, card);
            return;
        }

        if (card.isWound()) {
            this.sound.error();
            this.addLog('Verletzungen können nicht gespielt werden.', 'info');
            return;
        }

        // Play card for basic effect
        const result = this.hero.playCard(index, false);
        if (result) {
            this.sound.cardPlay();
            this.addLog(`${result.card.name} gespielt: ${this.ui.formatEffect(result.effect)} `, 'info');
            this.ui.addPlayedCard(result.card, result.effect);
            this.ui.showPlayArea();

            // Particle Effect (BUG FIX: add null check)
            if (this.particleSystem) {
                const rect = this.ui.elements.playedCards.getBoundingClientRect();
                // Center of the last played card (approximate)
                const x = rect.right - 50;
                const y = rect.top + 75;
                this.particleSystem.playCardEffect(x, y, result.card.color);
            }

            // If movement was gained, enter movement mode
            if (result.effect.movement && result.effect.movement > 0) {
                this.enterMovementMode();
            }

            this.renderHand();
            this.updateStats();
        }
    }

    handleCardRightClick(index, card) {
        // Right click for sideways play
        if (card.isWound() || this.combat) {
            return;
        }

        // Show menu for sideways options
        const options = ['movement', 'attack', 'block', 'influence'];
        const chosen = prompt(`${card.name} seitlich spielen für: \n1: +1 Bewegung\n2: +1 Angriff\n3: +1 Block\n4: +1 Einfluss\n\nWähle Option(1 - 4): `);

        // BUG FIX: prompt() returns string, convert to number
        const chosenNum = parseInt(chosen, 10);
        if (chosenNum >= 1 && chosenNum <= 4) {
            const effectType = options[chosenNum - 1];
            const result = this.hero.playCardSideways(index, effectType);
            if (result) {
                this.sound.cardPlaySideways();

                // Particle Effect (BUG FIX: add null check)
                if (this.particleSystem) {
                    const rect = this.ui.elements.handCards.getBoundingClientRect();
                    const x = rect.left + (rect.width / 2);
                    const y = rect.top + 50;
                    this.particleSystem.playCardEffect(x, y, result.card.color);
                }

                this.addLog(`${result.card.name} seitlich gespielt: ${this.ui.formatEffect(result.effect)} `, 'info');
                this.renderHand();
                this.updateStats();
            }
        }
    }

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
                            this.ui.showNotification('Neues Gebiet kann erkundet werden! (Klicke auf leeres Feld)', 'info');
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

    visitSite() {
        const q = this.hero.position.q;
        const r = this.hero.position.r;
        const hexData = this.hexGrid.getHex(q, r);

        if (hexData && hexData.site) {
            const interactionData = this.siteManager.visitSite(hexData, hexData.site);
            this.ui.showSiteModal(interactionData);
        } else {
            this.addLog('Hier gibt es nichts zu besuchen.', 'info');
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
        const result = this.hero.playCard(index, false);

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
        if (this.combatBlockTotal > 0) {
            // Try to block enemies with accumulated block
            this.combat.enemies.forEach(enemy => {
                const blockResult = this.combat.blockEnemy(enemy, this.combatBlockTotal);
                if (blockResult.blocked) {
                    this.addLog(`${enemy.name} geblockt mit ${this.combatBlockTotal} Block`, 'combat');
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

            // Check if combat is over
            if (this.combat.enemies.length === 0) {
                this.endCombat();
                return;
            }
        }

        // Reset attack total after use
        this.combatRangedTotal = 0;
        this.combatSiegeTotal = 0;

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
            this.ui.showNotification(`Stufe ${result.newLevel} erreicht!`, 'success');
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

    endTurn() {
        if (this.combat) {
            // End combat phase or combat
            if (this.combat.phase === COMBAT_PHASES.RANGED) {
                this.endRangedPhase();
            } else if (this.combat.phase === COMBAT_PHASES.BLOCK) {
                this.endBlockPhase();
            } else if (this.combat.phase === COMBAT_PHASES.ATTACK) {
                this.endCombat();
            }
            return;
        }

        this.turnNumber++;
        this.statisticsManager.trackTurn();
        this.hero.endTurn();
        this.manaSource.returnDice();
        this.exitMovementMode();

        // Check for end of round (empty deck and empty hand)
        // Note: hero.endTurn() draws new cards, so we check if hand is empty AFTER draw attempt?
        // No, hero.endTurn() discards hand then draws. If deck was empty, hand might be smaller or empty.
        // Standard rule: Round ends when a player has no cards in deck and announces end of round.
        // Simplified: If deck is empty, trigger end of round.

        if (this.hero.deck.length === 0) {
            const roundInfo = this.timeManager.endRound();
            this.addLog(`🌙 Runde beendet! Es ist jetzt ${roundInfo.timeOfDay === TIME_OF_DAY.DAY ? 'Tag' : 'Nacht'}.`, 'info');

            // Re-roll mana source completely for new round
            this.manaSource.initialize();

            // Shuffle hero deck for new round
            this.hero.prepareNewRound();
        }

        this.addLog(`-- - Zug ${this.turnNumber} beendet-- - `, 'info');
        this.addLog('Neue Karten gezogen', 'info');
        this.ui.hidePlayArea();

        this.renderHand();
        this.renderMana();
        this.updateStats();

        // Auto-save after each turn
        this.saveManager.autoSave(this.getGameState());

        // Check victory condition
        if (this.enemies.length === 0) {
            this.gameState = 'victory';
            this.statisticsManager.endGame(true);
            this.statisticsManager.set('turns', this.turnNumber);
            this.checkAndShowAchievements();
            this.addLog('🎉 SIEG! Alle Feinde wurden besiegt!', 'info');
            this.ui.setButtonEnabled(this.ui.elements.endTurnBtn, false);
        }
    }

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
        this.hexGrid.render(this.hero, this.enemies);
        this.updateStats();
    }

    // Save/Load functionality
    saveGame() {
        if (this.combat) {
            this.addLog('Kann nicht im Kampf speichern!', 'warning');
            return;
        }
        this.saveManager.saveGame(0, this.getGameState()); // Slot 0 default
        this.addLog('Spiel gespeichert!', 'success');
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
            this.ui.showNotification(
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
        });

        this.setupUIListeners();
    }

    setupUIListeners() {
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
                const timestamp = this.achievementManager.unlockedAchievements.get(ach.id);
                if (timestamp) {
                    const date = new Date(timestamp);
                    dateStr = `<span class="achievement-date">Freigeschaltet: ${date.toLocaleDateString()}</span>`;
                }
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
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MageKnightGame();
});
