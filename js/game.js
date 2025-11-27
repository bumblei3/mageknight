// Main game controller for Mage Knight

import { HexGrid } from './hexgrid.js';
import Hero from './hero.js';
import { ManaSource } from './mana.js';
import { createEnemies } from './enemy.js';
import { Combat, COMBAT_PHASE } from './combat.js';
import UI from './ui.js';
import Terrain, { TERRAIN_TYPES } from './terrain.js';

class MageKnightGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.hexGrid = new HexGrid(this.canvas);
        this.terrain = new Terrain();
        this.hero = null;
        this.enemies = [];
        this.manaSource = null;
        this.combat = null;
        this.ui = new UI();
        this.turnNumber = 0;
        this.gameState = 'playing'; // 'playing', 'victory', 'defeat'

        this.selectedCard = null;
        this.movementMode = false;
        this.reachableHexes = [];

        this.init();
    }

    init() {
        // Create initial game board
        this.createGameBoard();

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

        this.ui.addLog('Willkommen bei Mage Knight!', 'info');
        this.ui.addLog('Spiel gestartet. Viel Erfolg!', 'info');
    }

    createGameBoard() {
        // Create a small hex map (simplified)
        const hexes = [
            // Center and immediate neighbors
            { q: 0, r: 0, terrain: TERRAIN_TYPES.PLAINS },
            { q: 1, r: 0, terrain: TERRAIN_TYPES.PLAINS },
            { q: 0, r: 1, terrain: TERRAIN_TYPES.FOREST },
            { q: -1, r: 1, terrain: TERRAIN_TYPES.PLAINS },
            { q: -1, r: 0, terrain: TERRAIN_TYPES.FOREST },
            { q: 0, r: -1, terrain: TERRAIN_TYPES.HILLS },
            { q: 1, r: -1, terrain: TERRAIN_TYPES.PLAINS },

            // Outer ring
            { q: 2, r: 0, terrain: TERRAIN_TYPES.HILLS },
            { q: 2, r: -1, terrain: TERRAIN_TYPES.FOREST },
            { q: 1, r: 1, terrain: TERRAIN_TYPES.PLAINS },
            { q: 0, r: 2, terrain: TERRAIN_TYPES.DESERT },
            { q: -1, r: 2, terrain: TERRAIN_TYPES.FOREST },
            { q: -2, r: 2, terrain: TERRAIN_TYPES.WASTELAND },
            { q: -2, r: 1, terrain: TERRAIN_TYPES.MOUNTAINS },
            { q: -2, r: 0, terrain: TERRAIN_TYPES.HILLS },
            { q: -1, r: -1, terrain: TERRAIN_TYPES.PLAINS },
            { q: 0, r: -2, terrain: TERRAIN_TYPES.MOUNTAINS },
            { q: 1, r: -2, terrain: TERRAIN_TYPES.FOREST },
            { q: 2, r: -2, terrain: TERRAIN_TYPES.DESERT }
        ];

        hexes.forEach(hex => {
            this.hexGrid.setHex(hex.q, hex.r, { terrain: hex.terrain });
        });
    }

    createEnemies() {
        // Place a few enemies on the map
        this.enemies = createEnemies([
            { type: 'weakling', position: { q: 2, r: 0 } },
            { type: 'orc', position: { q: -2, r: 1 } },
            { type: 'guard', position: { q: 0, r: 2 } }
        ]);
    }

    setupEventListeners() {
        // End turn button
        this.ui.elements.endTurnBtn.addEventListener('click', () => this.endTurn());

        // Rest button
        this.ui.elements.restBtn.addEventListener('click', () => this.rest());

        // Canvas click for movement
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

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

            // Escape to exit movement mode or close modals
            if (e.key === 'Escape') {
                if (this.movementMode) {
                    this.exitMovementMode();
                    this.ui.addLog('Bewegungsmodus abgebrochen', 'info');
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
            phaseText.textContent = 'Erkundung';
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

        if (this.movementMode) {
            this.moveHero(hex.q, hex.r);
        } else {
            this.selectHex(hex.q, hex.r);
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
                const moveCost = this.terrain.getMovementCost(hexData.terrain);
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
        const moveCost = this.terrain.getMovementCost(hexData.terrain);

        if (this.hero.moveTo(q, r, moveCost)) {
            const terrainName = this.terrain.getName(hexData.terrain);
            this.ui.addLog(`Bewegt nach ${q},${r} (${terrainName}) - ${moveCost} Kosten`, 'movement');

            // Check if there's an enemy on this hex
            const enemy = this.enemies.find(e => e.position.q === q && e.position.r === r);
            if (enemy) {
                this.ui.addLog(`Feind entdeckt: ${enemy.name}!`, 'combat');
                this.exitMovementMode();
                this.initiateCombat(enemy);
                return;
            }

            if (this.hero.movementPoints === 0) {
                this.exitMovementMode();
            } else {
                this.calculateReachableHexes();
            }

            this.updateStats();
            this.render();
        }
    }

    initiateCombat(enemy) {
        this.combat = new Combat(this.hero, enemy);
        const result = this.combat.start();

        this.ui.addLog(result.message, 'combat');
        this.ui.showCombatPanel(this.combat.enemies, this.combat.phase);
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

                // Try to defeat enemies
                const attackResult = this.combat.attackEnemies(result.effect.attack);
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

    endBlockPhase() {
        if (!this.combat) return;

        const result = this.combat.endBlockPhase();
        this.ui.addLog(result.message, 'combat');
        this.ui.updateCombatInfo(this.combat.enemies, this.combat.phase);
        this.updatePhaseIndicator();
        this.updateStats();
    }

    endCombat() {
        if (!this.combat) return;

        const result = this.combat.endCombat();
        this.ui.addLog(result.message, result.victory ? 'info' : 'combat');

        if (result.victory) {
            this.ui.addLog(`Ruhm erhalten: +${result.fameGained}`, 'info');
        }

        this.combat = null;
        this.ui.hideCombatPanel();
        this.updatePhaseIndicator();
        this.updateStats();
        this.render();
    }

    handleManaClick(index, color) {
        const mana = this.manaSource.takeDie(index);
        if (mana) {
            this.ui.addLog(`Mana genommen: ${color}`, 'info');
            // Store for later use
            this.renderMana();
        }
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

        this.ui.addLog(`--- Zug ${this.turnNumber} beendet ---`, 'info');
        this.ui.addLog('Neue Karten gezogen', 'info');
        this.ui.hidePlayArea();

        this.renderHand();
        this.renderMana();
        this.updateStats();

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
            (index, color) => this.handleManaClick(index, color)
        );
    }

    updateStats() {
        this.ui.updateHeroStats(this.hero);
        this.ui.updateMovementPoints(this.hero.movementPoints);
    }

    render() {
        this.hexGrid.render(this.hero, this.enemies);
        this.updateStats();
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MageKnightGame();
});
