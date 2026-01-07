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
        if (typeof document !== 'undefined') {
            this.panel = document.createElement('div');
            this.panel.id = 'debug-panel';
            this.panel.classList.add('hidden');
        } else {
            this.panel = { classList: { contains: () => true, toggle: () => { }, add: () => { }, remove: () => { } } };
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
        this.game.updateStats();
    }

    addFame() {
        if (!this.game.hero) return;
        this.game.hero.gainFame(10);
        this.game.updateStats();
    }

    addReputation() {
        if (!this.game.hero) return;
        this.game.hero.changeReputation(1);
        this.game.updateStats();
    }

    addInfluence() {
        if (!this.game.hero) return;
        this.game.hero.influencePoints = 10;
        this.game.updateStats();
    }

    healAll() {
        if (!this.game.hero) return;
        this.game.hero.wounds = [];
        this.game.hero.units.forEach((u: any) => {
            if (u.heal) u.heal();
        });
        this.game.updateStats();
        this.game.renderHand();
    }

    drawCard() {
        if (!this.game.hero) return;
        const card = this.game.hero.drawCard();
        if (card) {
            this.game.addLog(`Debug: Drew ${card.name}`, 'debug');
        } else {
            this.game.addLog('Debug: Deck empty', 'warning');
        }
        this.game.renderHand();
    }

    resetHand() {
        if (!this.game.hero) return;
        while (this.game.hero.hand.length > 0) {
            const card = this.game.hero.hand.pop();
            this.game.hero.discard.push(card);
        }
        this.game.hero.drawCards(5);
        this.game.renderHand();
    }

    toggleCoordinates() {
        this.showCoordinates = !this.showCoordinates;
        if (this.game.hexGrid) {
            this.game.hexGrid.debugMode = this.showCoordinates;
            this.game.render();
        }
    }

    revealMap() {
        this.game.addLog('Debug: revealMap not implemented', 'info');
    }

    teleportMode() {
        this.game.debugTeleport = true;
        this.game.addLog('Debug: Teleport mode enabled', 'debug');
    }

    spawnEnemy() {
        if (!this.game.enemies) return;
        this.game.enemies.push({
            name: 'Debug Orc',
            type: 'orc',
            position: { q: 0, r: 0 },
            isDefeated: () => false
        });
        this.game.render();
    }

    killEnemies() {
        if (!this.game.enemies) return;
        this.game.enemies = [];
        this.game.render();
    }

    addMana(color: string, amount: number) {
        if (!this.game.hero) return;
    }

    teleport(q: number, r: number) {
        if (!this.game.hero) return;
        this.game.hero.position = { q, r };
        this.game.render();
    }

    toggleFog() {
        // Toggle fog reveal
    }

    destroy() {
        // cleanup
    }
}
