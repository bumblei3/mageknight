export class DebugManager {
    private game: any;
    public active: boolean = false;
    public showCoordinates: boolean = false;
    public panel: any;

    constructor(game: any) {
        this.game = game;
        if (typeof window !== 'undefined') {
            (window as any).game = game;
            (window as any).debug = this;
        }
        this.createPanel();
        console.log('DebugManager initialized');
    }

    private createPanel() {
        if (typeof document === 'undefined') {
            this.panel = { classList: { contains: () => true, toggle: () => { }, add: () => { }, remove: () => { } } };
            return;
        }

        // Create Panel
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.classList.add('debug-panel', 'hidden');
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>Debug Tools</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div id="debug-log-container" style="max-height: 100px; overflow-y: auto; font-size: 0.7rem; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px; padding: 5px;">
                <div style="color: #888">Debug logs appear here...</div>
            </div>
            <div class="debug-section">
                <h4>Hero Stats</h4>
                <button onclick="window.debug.addCrystals()">Max Crystals</button>
                <button onclick="window.debug.addFame()">+10 Fame</button>
                <button onclick="window.debug.addReputation()">+1 Rep</button>
                <button onclick="window.debug.addInfluence()">Max Influence</button>
                <button onclick="window.debug.healAll()">Heal All</button>
            </div>
            <div class="debug-section">
                <h4>Gameplay</h4>
                <button onclick="window.debug.drawCard()">Draw Card</button>
                <button onclick="window.debug.resetHand()">Reset Hand</button>
                <button onclick="window.debug.teleportMode()">Teleport Mode</button>
                <button onclick="window.debug.revealMap()">Reveal Map</button>
                <button onclick="window.debug.toggleFPS()">Toggle FPS</button>
            </div>
            <div class="debug-section">
                <h4>Combat & Units</h4>
                <button onclick="window.debug.spawnEnemy()">Spawn Orc</button>
                <button onclick="window.debug.killEnemies()">Clear Enemies</button>
                <button onclick="window.debug.addUnit()">Add Unit</button>
            </div>
        `;

        // Create Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.classList.add('debug-toggle');
        toggleBtn.textContent = 'Debug';
        toggleBtn.addEventListener('click', () => this.togglePanel());

        // Append to body
        document.body.appendChild(toggleBtn);
        document.body.appendChild(this.panel);

        // Close button listener
        const closeBtn = this.panel.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.togglePanel());
        }

        // Performance Overlay
        this.createPerfOverlay();
    }

    private createPerfOverlay() {
        if (typeof document === 'undefined') return;
        const overlay = document.createElement('div');
        overlay.id = 'perf-overlay';
        overlay.style.cssText = 'position:fixed; top:10px; right:10px; background:rgba(0,0,0,0.7); color:#0f0; padding:5px; font-family:monospace; z-index:10000; border-radius:4px; display:none; pointer-events:none;';
        overlay.innerHTML = 'FPS: <span id="fps-value">0</span>';
        document.body.appendChild(overlay);
    }

    private fpsCounterRunning: boolean = false;
    private lastTime: number = 0;
    private frameCount: number = 0;

    toggleFPS() {
        const overlay = document.getElementById('perf-overlay');
        if (!overlay) return;

        this.fpsCounterRunning = !this.fpsCounterRunning;
        overlay.style.display = this.fpsCounterRunning ? 'block' : 'none';

        if (this.fpsCounterRunning) {
            this.lastTime = performance.now();
            this.updateFPS();
        }
    }

    private updateFPS() {
        if (!this.fpsCounterRunning) return;

        const now = performance.now();
        this.frameCount++;

        if (now - this.lastTime >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            const fpsEl = document.getElementById('fps-value');
            if (fpsEl) fpsEl.textContent = fps.toString();
            this.frameCount = 0;
            this.lastTime = now;
        }

        requestAnimationFrame(() => this.updateFPS());
    }

    addUnit() {
        if (!this.game.hero) return;
        const unit = {
            id: 'debug-unit-' + Date.now(),
            name: 'Debug Unit',
            type: 'silver',
            level: 1,
            stats: { attack: 3, block: 3, armor: 3 },
            abilities: [],
            isReady: true,
            isWounded: false
        };
        this.game.hero.units.push(unit);
        this.log('Debug: Added unit ' + unit.name);
        this.game.updateStats();
        if (this.game.ui) this.game.ui.renderUnits(this.game.hero.units);
    }

    private log(msg: string, level: string = 'info') {
        console.log(`[DEBUG] ${msg}`);
        if (this.game && typeof this.game.addLog === 'function') {
            this.game.addLog(msg, level);
        }
    }

    togglePanel() {
        this.active = !this.active;
        if (this.panel && this.panel.classList) {
            this.panel.classList.toggle('hidden');
        }
    }

    addCrystals() {
        if (!this.game.hero) return;
        ['red', 'blue', 'green', 'white'].forEach(color => {
            this.game.hero.crystals[color] = 5;
        });
        this.log('Debug: Maxed crystals');
        this.game.updateStats();
    }

    addFame() {
        if (!this.game.hero) return;
        this.game.hero.gainFame(10);
        this.log('Debug: Added 10 fame');
        this.game.updateStats();
    }

    addReputation() {
        if (!this.game.hero) return;
        this.game.hero.changeReputation(1);
        this.log('Debug: Added 1 reputation');
        this.game.updateStats();
    }

    addInfluence() {
        if (!this.game.hero) return;
        this.game.hero.influencePoints = 10;
        this.log('Debug: Added 10 influence');
        this.game.updateStats();
    }

    healAll() {
        if (!this.game.hero) return;
        this.game.hero.wounds = [];
        this.game.hero.units.forEach((u: any) => {
            if (u.heal) u.heal();
            u.isWounded = false;
            u.isReady = true;
        });
        this.log('Debug: Healed all');
        this.game.updateStats();
        if (this.game.ui) this.game.ui.renderHandCards(this.game.hero.hand, () => { });
    }

    drawCard() {
        if (!this.game.hero) return;
        const card = this.game.hero.drawCard();
        if (card) {
            this.log(`Debug: Drew ${card.name}`);
        } else {
            this.log('Debug: Deck empty', 'warning');
        }
        if (this.game.ui) this.game.ui.renderHandCards(this.game.hero.hand, () => { });
    }

    resetHand() {
        if (!this.game.hero) return;
        while (this.game.hero.hand.length > 0) {
            const card = this.game.hero.hand.pop();
            this.game.hero.discard.push(card);
        }
        this.game.hero.drawCards(5);
        this.log('Debug: Reset hand');
        if (this.game.ui) this.game.ui.renderHandCards(this.game.hero.hand, () => { });
    }

    toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
        if (this.game.hexGrid) {
            this.game.hexGrid.debugMode = this.showCoordinates;
            this.game.render();
        }
    }

    revealMap() {
        this.log('Debug: revealMap not implemented');
    }

    teleportMode() {
        this.game.debugTeleport = true;
        this.log('Debug: Teleport mode enabled');
    }

    spawnEnemy() {
        if (!this.game.enemies) return;
        this.game.enemies.push({
            name: 'Debug Orc',
            type: 'orc',
            position: { q: 0, r: 0 },
            isDefeated: () => false
        });
        this.log('Debug: Spawned Orc');
        this.game.render();
    }

    killEnemies() {
        if (!this.game.enemies) return;
        this.game.enemies = [];
        this.log('Debug: Cleared enemies');
        this.game.render();
    }

    addMana(color: string, _amount: number) {
        if (!this.game.hero) return;
        this.game.hero.addMana(color);
        this.log(`Debug: Added ${color} mana`);
    }

    teleport(q: number, r: number) {
        if (!this.game.hero) return;
        this.game.hero.position = { q, r };
        this.log(`Debug: Teleported to ${q},${r}`);
        this.game.render();
    }

    toggleFog() {
        // Toggle fog reveal
    }

    destroy() {
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        const overlay = document.getElementById('perf-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        this.fpsCounterRunning = false;
    }
}
