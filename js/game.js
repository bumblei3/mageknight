// Main game controller for Mage Knight

import { HexGrid } from './hexgrid.js';
import Hero from './hero.js';
import { ManaSource } from './mana.js';
import { createEnemies } from './enemy.js';
import { Combat, COMBAT_PHASE } from './combat.js';
import UI from './ui.js';
import Terrain, { TERRAIN_TYPES } from './terrain.js';
import SaveManager from './saveManager.js';
import TutorialManager from './tutorialManager.js';
import { TimeManager, TIME_OF_DAY } from './timeManager.js';
import { MapManager } from './mapManager.js';
import ParticleSystem from './particles.js';
import { animator } from './animator.js';
import { SiteInteractionManager } from './siteInteraction.js';
import { createUnit } from './unit.js';
import { DebugManager } from './debug.js';
import { getRandomSkills } from './skills.js';
import { SAMPLE_ADVANCED_ACTIONS, createDeck } from './card.js';
import SimpleTutorial from './simpleTutorial.js';

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

        this.init();
    }

    init() {
        // Create initial game board
        this.createGameBoard();
        this.setupParticleSystem();

        // Init Debug
        this.debugManager = new DebugManager(this);

        // Create hero
        this.hero = new Hero('Goldyx', { q: 0, r: 0 });
        this.hero.drawCards();

        // Create mana source
        this.manaSource = new ManaSource(1);

        // Create enemies
        this.createEnemies();

        // Setup UI event listeners
        this.setupEventListeners();

        // Initial render
        this.render();

        // Initialize tutorial manager
        this.tutorialManager = new TutorialManager(this);
        this.simpleTutorial = new SimpleTutorial(this);

        // Show interactive tutorial on first visit
        if (this.simpleTutorial.shouldStart()) {
            setTimeout(() => this.simpleTutorial.start(), 1500);
        }

        this.ui.addLog('Willkommen bei Mage Knight!', 'info');
        this.ui.addLog('Spiel gestartet. Viel Erfolg!', 'info');
    }

    createGameBoard() {
        // Create starting map (just one tile initially)
        this.mapManager.placeTile(0, 0, [
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.HILLS,
            TERRAIN_TYPES.PLAINS,
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.DESERT,
            TERRAIN_TYPES.WATER
        ]);

        // Reveal starting area
        this.mapManager.revealMap(0, 0, 2);
    }

    createEnemies() {
        // Place a few enemies on the map
        this.enemies = createEnemies([
            { type: 'weakling', position: { q: 2, r: 0 } },
            { type: 'orc', position: { q: -2, r: 1 } },
            { type: 'guard', position: { q: 0, r: 2 } }
        ]);
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

        // Save/Load buttons
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.openSaveDialog());
        if (loadBtn) loadBtn.addEventListener('click', () => this.openLoadDialog());

        // Canvas click for movement
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Canvas hover for tooltips
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.ui.tooltipManager.hideTooltip();
        });

        // Card selection
        this.renderHand();

        // Mana dice
        this.renderMana();

        // Help system
        this.setupHelpSystem();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Phase updates
        this.updatePhaseIndicator();
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
                    this.ui.addLog(`Karte ${e.key} gespielt (Tastatur)`, 'info');
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
                    this.ui.addLog('Bewegungsmodus abgebrochen', 'info');
                }
            }

            // Tab to cycle cards (visual only for now)
            if (e.key === 'Tab') {
                e.preventDefault();
                // Logic to cycle selection could go here
                // For now just log
                // this.ui.addLog('Tab: Karte wählen (WIP)', 'info');
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
                'block': 'Block-Phase',
                'damage': 'Schadens-Phase',
                'attack': 'Angriffs-Phase',
                'complete': 'Kampf Ende'
            };

            const hints = {
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
            phaseText.textContent = `Erkundung (${timeIcon})`;
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
                document.getElementById(`help-${targetTab}`).classList.add('active');
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
            this.ui.addLog(`Debug: Teleported to ${hex.q},${hex.r}`, 'info');
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

        // Check for enemy
        const enemy = this.enemies.find(e => e.position.q === hex.q && e.position.r === hex.r);
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

        // Check if there's an enemy here
        const enemy = this.enemies.find(e => e.position.q === q && e.position.r === r);

        if (enemy) {
            this.ui.addLog(`Feind gefunden: ${enemy.name} (Rüstung: ${enemy.armor}, Angriff: ${enemy.attack})`, 'combat');

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
            this.ui.addLog(`Hex ausgewählt: ${q},${r} - ${terrainName}`, 'info');
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
            this.ui.addLog('Verletzungen können nicht gespielt werden.', 'info');
            return;
        }

        // Play card for basic effect
        const result = this.hero.playCard(index, false);
        if (result) {
            this.ui.addLog(`${result.card.name} gespielt: ${this.ui.formatEffect(result.effect)}`, 'info');
            this.ui.addPlayedCard(result.card, result.effect);
            this.ui.showPlayArea();

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
        const chosen = prompt(`${card.name} seitlich spielen für:\n1: +1 Bewegung\n2: +1 Angriff\n3: +1 Block\n4: +1 Einfluss\n\nWähle Option (1-4):`);

        if (chosen >= 1 && chosen <= 4) {
            const effectType = options[chosen - 1];
            const result = this.hero.playCardSideways(index, effectType);
            if (result) {
                this.ui.addLog(`${result.card.name} seitlich gespielt: ${this.ui.formatEffect(result.effect)}`, 'info');
                this.renderHand();
                this.updateStats();
            }
        }
    }

    enterMovementMode() {
        this.movementMode = true;
        this.calculateReachableHexes();
        this.ui.addLog(`Bewegungsmodus: ${this.hero.movementPoints} Punkte verfügbar`, 'movement');
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
            const key = `${pos.q},${pos.r}`;

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
            this.ui.addLog('Hex nicht erreichbar!', 'info');
            return;
        }

        const hexData = this.hexGrid.getHex(q, r);
        const moveCost = this.terrain.getMovementCost(hexData.terrain, this.timeManager.isNight());

        const startQ = this.hero.displayPosition.q;
        const startR = this.hero.displayPosition.r;

        if (this.hero.moveTo(q, r, moveCost)) {
            const terrainName = this.terrain.getName(hexData.terrain);
            this.ui.addLog(`Bewegt nach ${q},${r} (${terrainName}) - ${moveCost} Kosten`, 'movement');

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
                                this.ui.addLog(exploreResult.message, 'success');
                                // Reveal the new tile immediately
                                this.mapManager.revealMap(exploreResult.center.q, exploreResult.center.r, 2);
                            }
                        }
                    }
                }
            );

            // Check if there's an enemy on this hex
            const enemy = this.enemies.find(e => e.position.q === q && e.position.r === r);
            if (enemy) {
                this.ui.addLog(`Feind entdeckt: ${enemy.name}!`, 'combat');
                this.exitMovementMode();
                this.initiateCombat(enemy);
                return;
            }

            // Check for site
            if (hexData.site) {
                this.ui.addLog(`Ort entdeckt: ${hexData.site.getName()}`, 'info');
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
            this.ui.addLog('Hier gibt es nichts zu besuchen.', 'info');
        }
    }

    initiateCombat(enemy) {
        this.combat = new Combat(this.hero, enemy);
        const result = this.combat.start();

        this.ui.addLog(result.message, 'combat');
        this.ui.showCombatPanel(this.combat.enemies, this.combat.phase);

        // Show units in combat
        this.renderUnitsInCombat();

        this.updatePhaseIndicator();
        this.renderHand();
    }

    playCardInCombat(index, card) {
        if (!this.combat || card.isWound()) return;

        const phase = this.combat.phase;

        if (phase === COMBAT_PHASE.BLOCK) {
            // Play for block
            const result = this.hero.playCard(index, false);
            if (result && result.effect.block) {
                this.ui.addLog(`Block gespielt: +${result.effect.block}`, 'combat');

                // Try to block enemy
                const enemy = this.combat.enemies[0];
                const blockResult = this.combat.blockEnemy(enemy, result.effect.block);
                this.ui.addLog(blockResult.message, 'combat');

                this.renderHand();
                this.updateStats();
            }
        } else if (phase === COMBAT_PHASE.ATTACK) {
            // Play for attack
            const result = this.hero.playCard(index, false);
            if (result && result.effect.attack) {
                this.ui.addLog(`Angriff gespielt: +${result.effect.attack}`, 'combat');

                // Particle Impact on enemies
                this.combat.enemies.forEach(enemy => {
                    const pixelPos = this.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
                    this.particleSystem.impactEffect(pixelPos.x, pixelPos.y);
                });

                // Try to defeat enemies
                const attackElement = result.effect.element || 'physical';
                const attackResult = this.combat.attackEnemies(result.effect.attack, attackElement);
                this.ui.addLog(attackResult.message, 'combat');

                if (attackResult.success) {
                    // Remove defeated enemies from map
                    this.enemies = this.enemies.filter(e =>
                        !attackResult.defeated.includes(e)
                    );

                    // Check if combat is over
                    if (this.combat.enemies.length === 0) {
                        this.endCombat();
                    }
                }

                this.renderHand();
                this.updateStats();
                this.render();
            }
        }
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
            this.ui.addLog(result.message, 'combat');

            // Visual feedback
            const heroPixel = this.hexGrid.axialToPixel(this.hero.position.q, this.hero.position.r);
            this.particleSystem.buffEffect(heroPixel.x, heroPixel.y);

            // Re-render units to show updated status
            this.renderUnitsInCombat();
            this.updateStats();
        } else {
            this.ui.addLog(result.message, 'info');
        }
    }

    endBlockPhase() {
        if (!this.combat) return;

        const result = this.combat.endBlockPhase();
        this.ui.addLog(result.message, 'combat');
        this.ui.updateCombatInfo(this.combat.enemies, this.combat.phase);

        // Update unit display for new phase
        this.renderUnitsInCombat();

        this.updatePhaseIndicator();
        this.updateStats();
    }

    endCombat() {
        if (!this.combat) return;

        const result = this.combat.endCombat();
        this.ui.addLog(result.message, result.victory ? 'info' : 'combat');

        this.render();
    }

    gainFame(amount) {
        const result = this.hero.gainFame(amount);
        if (result.leveledUp) {
            this.ui.addLog(`🎉 STUFENAUFSTIEG! Stufe ${result.newLevel} erreicht!`, 'success');
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
            this.ui.addLog(`Fertigkeit gelernt: ${selection.skill.name}`, 'success');
        }

        // Apply Card
        if (selection.card) {
            this.hero.learnAdvancedAction(selection.card, 0); // Cost 0 for reward
            this.ui.addLog(`Karte erhalten: ${selection.card.name}`, 'success');
        }

        // Apply Level Up stats
        this.hero.levelUp();

        this.updateStats();
        this.render();
    }

    handleManaClick(index, color) {
        const mana = this.manaSource.takeDie(index, this.timeManager.isNight());
        if (mana) {
            // Add to hero's mana inventory
            this.hero.takeManaFromSource(mana);

            this.ui.addLog(`Mana genommen: ${this.getManaEmoji(color)} ${color}`, 'info');

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
            if (this.combat.phase === COMBAT_PHASE.BLOCK) {
                this.endBlockPhase();
            } else if (this.combat.phase === COMBAT_PHASE.ATTACK) {
                this.endCombat();
            }
            return;
        }

        this.turnNumber++;
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
            this.ui.addLog(`🌙 Runde beendet! Es ist jetzt ${roundInfo.timeOfDay === TIME_OF_DAY.DAY ? 'Tag' : 'Nacht'}.`, 'info');

            // Re-roll mana source completely for new round
            this.manaSource.initialize();

            // Shuffle hero deck for new round
            this.hero.prepareNewRound();
        }

        this.ui.addLog(`--- Zug ${this.turnNumber} beendet ---`, 'info');
        this.ui.addLog('Neue Karten gezogen', 'info');
        this.ui.hidePlayArea();

        this.renderHand();
        this.renderMana();
        this.updateStats();

        // Auto-save after each turn
        this.saveManager.autoSave(this.getGameState());

        // Check victory condition
        if (this.enemies.length === 0) {
            this.gameState = 'victory';
            this.ui.addLog('🎉 SIEG! Alle Feinde wurden besiegt!', 'info');
            this.ui.setButtonEnabled(this.ui.elements.endTurnBtn, false);
        }
    }

    rest() {
        if (this.combat) {
            this.ui.addLog('Kann nicht im Kampf rasten!', 'info');
            return;
        }

        // Simple rest: discard one card
        if (this.hero.hand.length > 0) {
            const nonWoundIndex = this.hero.hand.findIndex(c => !c.isWound());
            if (nonWoundIndex >= 0) {
                this.hero.discardCard(nonWoundIndex);
                this.ui.addLog('Rast: 1 Karte abgelegt', 'info');
                this.renderHand();
            }
        }
    }

    explore() {
        if (this.combat) return;

        if (this.hero.movementPoints < 2) {
            this.ui.addLog('Nicht genug Bewegungspunkte (Kosten: 2)', 'info');
            return;
        }

        const result = this.mapManager.explore(this.hero.position.q, this.hero.position.r);
        if (result.success) {
            this.hero.movementPoints -= 2;
            this.ui.addLog(result.message, 'info');
            this.updateStats();
            this.render();
        } else {
            this.ui.addLog(result.message, 'info');
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
                visitBtn.textContent = `Besuche ${currentHex.site.getName()}`;
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
        this.ui.addLog(`Besuche ${site.getName()}...`, 'info');

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
        this.hero.deck = state.hero.deck;
        this.hero.hand = state.hero.hand;
        this.hero.discard = state.hero.discard;
        this.hero.wounds = state.hero.wounds;
        this.hero.fame = state.hero.fame;
        this.hero.reputation = state.hero.reputation;
        this.hero.crystals = state.hero.crystals;
        this.hero.movementPoints = state.hero.movementPoints || 0;
        this.hero.attackPoints = state.hero.attackPoints || 0;
        this.hero.blockPoints = state.hero.blockPoints || 0;
        this.hero.influencePoints = state.hero.influencePoints || 0;
        this.hero.healingPoints = state.hero.healingPoints || 0;

        // Restore enemies
        this.enemies = createEnemies(state.enemies.map(e => ({
            type: e.type,
            position: e.position
        })));

        // Update UI
        this.renderHand();
        this.renderMana();
        this.render();
        this.ui.addLog('Spielstand geladen', 'info');
    }

    openSaveDialog() {
        const saves = this.saveManager.listSaves();
        let message = '💾 SPIELSTAND SPEICHERN\n\n';

        saves.forEach(save => {
            if (save.empty) {
                message += `Slot ${save.slotId + 1}: [Leer]\n`;
            } else {
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date}\n`;
            }
        });

        message += '\nWähle Slot (1-5) oder Abbrechen:';
        const slot = prompt(message);

        if (slot && slot >= 1 && slot <= 5) {
            const success = this.saveManager.saveGame(parseInt(slot) - 1, this.getGameState());
            if (success) {
                this.ui.addLog(`Spiel in Slot ${slot} gespeichert`, 'info');
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
                message += `Slot ${save.slotId + 1}: ${save.heroName} - Zug ${save.turn} - ${save.date}\n`;
            }
        });

        message += '\nWähle Slot (1-5) oder Abbrechen:';
        const slot = prompt(message);

        if (slot && slot >= 1 && slot <= 5) {
            const state = this.saveManager.loadGame(parseInt(slot) - 1);
            if (state) {
                this.loadGameState(state);
            } else {
                this.ui.addLog('Fehler beim Laden', 'info');
            }
        }
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MageKnightGame();
});
