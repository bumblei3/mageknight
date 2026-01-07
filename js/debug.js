// Debug Manager for Mage Knight
// Handles cheats, state manipulation, and visual debugging

import { logger } from './logger.js';
import { performanceMonitor } from './performanceMonitor.js';

export class DebugManager {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.showCoordinates = false;

        this.setupConsoleAccess();
        this.createDebugUI();
    }

    setupConsoleAccess() {
        window.game = this.game;
        window.debug = this;
        logger.info('🔧 Debug Tools initialized. Access via window.game or window.debug');
    }

    createDebugUI() {
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '🔧';
        toggleBtn.className = 'debug-toggle';
        toggleBtn.style.zIndex = '100000'; // Higher than loading screen (99999)
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.left = '10px';
        toggleBtn.onclick = () => this.togglePanel();
        // Always append to body to avoid stacking context issues with HUD
        const target = document.body;
        target.appendChild(toggleBtn);

        // Create panel
        this.panel = document.createElement('div');
        this.panel.className = 'debug-panel hidden';
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>Debug Tools</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h4>Resources</h4>
                    <button onclick="debug.addCrystals()">+ Crystals</button>
                    <button onclick="debug.addFame()">+ Fame</button>
                    <button onclick="debug.addReputation()">+ Rep</button>
                    <button onclick="debug.addInfluence()">+ Influence</button>
                </div>
                <div class="debug-section">
                    <h4>Hero</h4>
                    <button onclick="debug.healAll()">Heal All</button>
                    <button onclick="debug.drawCard()">Draw Card</button>
                    <button onclick="debug.resetHand()">Reset Hand</button>
                    <button onclick="debug.addUnit()">Add Unit</button>
                </div>
                <div class="debug-section">
                    <h4>Map</h4>
                    <button onclick="debug.toggleCoordinates()">Toggle Coords</button>
                    <button onclick="debug.revealMap()">Reveal Map</button>
                    <button onclick="debug.teleportMode()">Teleport</button>
                </div>
                <div class="debug-section">
                    <h4>Combat</h4>
                    <button onclick="debug.spawnEnemy()">Spawn Enemy</button>
                    <button onclick="debug.killEnemies()">Kill All</button>
                </div>
                <div class="debug-section">
                    <h4>Performance</h4>
                    <button onclick="debug.toggleFPS()">Toggle FPS</button>
                </div>
                <div class="debug-section debug-log-section">
                    <div class="debug-log-header">
                        <h4>Debug Log</h4>
                        <div class="debug-log-actions">
                            <button onclick="logger.clear()">Clear</button>
                        </div>
                    </div>
                    <div id="debug-log-container" class="debug-log-container"></div>
                </div>
            </div>
        `;

        this.panel.querySelector('.close-btn').onclick = () => this.togglePanel();
        target.appendChild(this.panel);

        this.setupLoggerUI();
    }

    setupLoggerUI() {
        const container = document.getElementById('debug-log-container');
        if (!container) return;

        logger.addListener((entry, _allLogs) => {
            if (!entry) {
                container.innerHTML = '';
                return;
            }

            const item = document.createElement('div');
            item.className = `log-item log-${entry.levelName.toLowerCase()}`;
            item.innerHTML = `
                <span class="log-time">${entry.timestamp.toLocaleTimeString()}</span>
                <span class="log-level">[${entry.levelName}]</span>
                <span class="log-message">${entry.message}</span>
            `;

            container.appendChild(item);
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });

            if (container.children && container.children.length > 50) {
                const first = container.firstElementChild || container.firstChild;
                if (first) container.removeChild(first);
            }
        });
    }

    togglePanel() {
        this.panel.classList.toggle('hidden');
    }

    // --- Cheats ---

    addCrystals() {
        this.game.hero.crystals.red += 5;
        this.game.hero.crystals.blue += 5;
        this.game.hero.crystals.green += 5;
        this.game.hero.crystals.white += 5;
        this.game.addLog('Debug: Added 5 of each crystal', 'info');
        this.game.updateStats();
    }

    addFame() {
        this.game.hero.gainFame(10);
        this.game.addLog('Debug: Added 10 Fame', 'info');
        this.game.updateStats();
    }

    addReputation() {
        this.game.hero.changeReputation(1);
        this.game.addLog('Debug: +1 Reputation', 'info');
        this.game.updateStats();
    }

    addInfluence() {
        this.game.hero.influencePoints += 10;
        this.game.addLog('Debug: +10 Influence', 'info');
        this.game.updateStats();
    }

    healAll() {
        this.game.hero.wounds = [];
        this.game.hero.units.forEach(u => u.heal());
        this.game.addLog('Debug: Healed hero and units', 'info');
        this.game.updateStats();
        this.game.renderHand();
    }

    drawCard() {
        const card = this.game.hero.drawCard();
        if (card) {
            this.game.addLog(`Debug: Drew ${card.name}`, 'info');
            this.game.renderHand();
            this.game.updateStats();
        } else {
            this.game.addLog('Debug: Deck empty', 'warning');
        }
    }

    resetHand() {
        this.game.hero.discard.push(...this.game.hero.hand);
        this.game.hero.hand = [];
        this.game.hero.drawCards();
        this.game.addLog('Debug: Reset hand', 'info');
        this.game.renderHand();
        this.game.updateStats();
    }

    addUnit() {
        // Add a random unit
        const types = ['peasants', 'thugs', 'guards'];
        const type = types[Math.floor(Math.random() * types.length)];
        // Need to import createUnit or mock it.
        // Since we are in debug.js, we can try to use the game's methods or just mock for now if imports are tricky without changing module type.
        // But we are a module.
        import('./unit.js').then(module => {
            const unit = module.createUnit(type);
            if (this.game.hero.addUnit(unit)) {
                this.game.addLog(`Debug: Added ${unit.getName()}`, 'info');
                this.game.updateStats();
            } else {
                this.game.addLog('Debug: Command limit reached', 'warning');
            }
        });
    }

    toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
        this.game.hexGrid.debugMode = this.showCoordinates;
        this.game.render();
        this.game.addLog(`Debug: Coordinates ${this.showCoordinates ? 'ON' : 'OFF'}`, 'info');
    }

    revealMap() {
        // Reveal all tiles
        // This requires mapManager support or direct grid manipulation
        // For now, just log
        this.game.addLog('Debug: Reveal Map not implemented yet', 'warning');
    }

    teleportMode() {
        this.game.addLog('Debug: Click any hex to teleport', 'info');
        // Override click handler temporarily?
        // Or add a flag to game
        this.game.debugTeleport = true;
    }

    spawnEnemy() {
        // Spawn enemy at current location
        const enemy = {
            name: 'Debug Orc',
            armor: 3,
            attack: 3,
            fame: 2,
            icon: '👹',
            position: { ...this.game.hero.position }
        };
        this.game.enemies.push(enemy);
        this.game.render();
        this.game.addLog('Debug: Spawned enemy at hero location', 'info');
    }

    killEnemies() {
        this.game.enemies = [];
        this.game.render();
        this.game.addLog('Debug: Killed all enemies', 'info');
    }

    toggleFPS() {
        performanceMonitor.toggleOverlay();
        const state = performanceMonitor.showOverlay ? 'ON' : 'OFF';
        this.game.addLog(`Debug: FPS Overlay ${state}`, 'info');
    }
}
