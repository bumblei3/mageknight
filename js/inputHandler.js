export class InputHandler {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.abortController = new AbortController();
    }

    setup() {
        const signal = this.abortController.signal;

        // UI Buttons
        this.game.ui.elements.endTurnBtn.addEventListener('click', () => this.game.turnManager.endTurn(), { signal });
        this.game.ui.elements.restBtn.addEventListener('click', () => this.game.rest(), { signal });
        this.game.ui.elements.exploreBtn.addEventListener('click', () => this.game.explore(), { signal });

        const visitBtn = document.getElementById('visit-btn');
        if (visitBtn) visitBtn.addEventListener('click', () => this.game.visitSite(), { signal });

        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) executeAttackBtn.addEventListener('click', () => this.game.executeAttackAction(), { signal });

        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.game.openSaveDialog(), { signal });
        if (loadBtn) loadBtn.addEventListener('click', () => this.game.openLoadDialog(), { signal });

        if (this.game.ui.elements.newGameBtn) {
            this.game.ui.elements.newGameBtn.addEventListener('click', () => this.game.reset(), { signal });
        }

        // Canvas Events
        this.canvas.addEventListener('click', (e) => this.game.interactionController.handleCanvasClick(e), { signal });
        this.canvas.addEventListener('mousemove', (e) => this.game.interactionController.handleCanvasMouseMove(e), { signal });
        this.canvas.addEventListener('mouseleave', () => {
            this.game.ui.tooltipManager.hideTooltip();
        }, { signal });

        // Keyboard Shortcuts
        this.setupKeyboardShortcuts(signal);

        // UI Modals & Toggles
        this.game.setupSoundToggle();
        this.game.setupUIListeners();
    }

    setupKeyboardShortcuts(signal) {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const helpModal = document.getElementById('help-modal');
            if (helpModal && helpModal.classList.contains('active')) return;

            // Number keys 1-5 to play cards
            if (e.key >= '1' && e.key <= '5') {
                const index = parseInt(e.key) - 1;
                if (index < this.game.hero.hand.length) {
                    this.game.interactionController.handleCardClick(index, this.game.hero.hand[index]);
                    this.game.addLog(`Karte ${e.key} gespielt (Tastatur)`, 'info');
                }
                e.preventDefault();
            }

            // Commands
            switch (e.key.toLowerCase()) {
                case ' ':
                case 'space':
                    this.game.turnManager.endTurn();
                    e.preventDefault();
                    break;
                case 'h':
                    const helpBtn = document.getElementById('help-btn');
                    if (helpBtn) helpBtn.click();
                    e.preventDefault();
                    break;
                case 'r':
                    this.game.rest();
                    e.preventDefault();
                    break;
                case 'e':
                    this.game.explore();
                    e.preventDefault();
                    break;
                case 't':
                    this.game.showTutorial();
                    e.preventDefault();
                    break;
                case 'escape':
                    if (this.game.movementMode) {
                        this.game.exitMovementMode();
                        this.game.addLog('Bewegungsmodus abgebrochen', 'info');
                    }
                    break;
                case 'm':
                    const manaPanel = document.querySelector('.mana-panel');
                    if (manaPanel) {
                        manaPanel.scrollIntoView({ behavior: 'smooth' });
                        manaPanel.classList.add('highlight-pulse');
                        setTimeout(() => manaPanel.classList.remove('highlight-pulse'), 1000);
                    }
                    break;
            }

            // Ctrl combinations
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.game.openSaveDialog();
                } else if (e.key === 'l') {
                    e.preventDefault();
                    this.game.openLoadDialog();
                }
            }
        }, { signal });
    }

    destroy() {
        this.abortController.abort();
    }
}
