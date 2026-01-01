// Simple Interactive Tutorial for Mage Knight
// Auto-starts on first visit and guides player through first steps

export class SimpleTutorial {
    constructor(game) {
        this.game = game;
        this.currentStep = 0;
        this.active = false;
        this.overlay = null;

        this.steps = [
            {
                title: '👋 Willkommen bei Mage Knight!',
                message: 'In 2 Minuten weißt du wie man spielt! Klicke auf "Weiter" um zu starten.',
                highlight: null,
                autoNext: false
            },
            {
                title: '🎴 Deine Handkarten',
                message: 'Unten siehst du deine Karten. Jede Farbe hat eine Bedeutung:\n\n⚔️ ROT = Angriff\n🛡️ BLAU = Verteidigung\n👣 GRÜN = Bewegung\n💬 WEISS = Einfluss',
                highlight: '.hand-area',
                autoNext: false
            },
            {
                title: '🖱️ Karte spielen',
                message: 'Klicke auf eine GRÜNE Karte (👣 Bewegung) um sie zu spielen. Du bekommst dann Bewegungspunkte!',
                highlight: '.card[data-color="green"]',
                waitForAction: true,
                actionType: 'card_played'
            },
            {
                title: '🗺️ Auf der Karte bewegen',
                message: 'Super! Du hast jetzt ' + (this.game?.hero?.movementPoints || 2) + ' Bewegungspunkte. Klicke auf ein benachbartes, VIOLETT markiertes Feld um dich zu bewegen!',
                highlight: '.game-board-container',
                waitForAction: true,
                actionType: 'hero_moved'
            },
            {
                title: '⚔️ Gegner angreifen',
                message: 'Auf der Karte siehst du Gegner (Icons). Um zu gewinnen musst du alle besiegen!\n\nBewege dich zu einem Gegner um einen Kampf zu starten.',
                highlight: null,
                autoNext: false
            },
            {
                title: '🛡️ Kampf-System',
                message: 'Kampf hat 3 Phasen:\n\n1. BLOCK - Spiele 🛡️ blaue Karten\n2. SCHADEN - Nicht geblockte Gegner greifen an\n3. ANGRIFF - Spiele ⚔️ rote Karten',
                highlight: null,
                autoNext: false
            },
            {
                title: '✨ Das war\'s!',
                message: 'Du weißt jetzt die Basics! Weitere Tipps:\n\n• Drücke "R" zum Rasten (neue Karten)\n• Drücke "H" für Hilfe\n• Drücke "E" am Ende deines Zugs\n\nViel Erfolg!',
                highlight: null,
                autoNext: false,
                final: true
            }
        ];
    }

    // Check if tutorial should start
    shouldStart() {
        return !localStorage.getItem('tutorial_completed');
    }

    // Start the tutorial
    start() {
        if (this.active) return;

        this.active = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(0);

        // Log tutorial start
        this.game.ui?.addLog('🎓 Tutorial gestartet', 'info');
    }

    // Create overlay DOM elements
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-dialog">
                <div class=" tutorial-header">
                    <h2 class="tutorial-title"></h2>
                    <div class="tutorial-progress"></div>
                </div>
                <p class="tutorial-message"></p>
                <div class="tutorial-actions">
                    <button class="btn-tutorial-skip">Überspringen (ESC)</button>
                    <button class="btn-tutorial-next">Weiter</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Button handlers
        this.overlay.querySelector('.btn-tutorial-skip').addEventListener('click', () => {
            this.skip();
        });

        this.overlay.querySelector('.btn-tutorial-next').addEventListener('click', () => {
            this.next();
        });

        // ESC key to skip
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    handleKeyPress(e) {
        if (!this.active) return;

        if (e.key === 'Escape') {
            this.skip();
        } else if (e.key === 'Enter' && !this.steps[this.currentStep].waitForAction) {
            this.next();
        }
    }

    // Show specific step
    showStep(index) {
        if (index >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[index];
        this.currentStep = index;

        // Update UI
        this.overlay.querySelector('.tutorial-title').textContent = step.title;
        this.overlay.querySelector('.tutorial-message').textContent = step.message;
        this.overlay.querySelector('.tutorial-progress').textContent =
            `Schritt ${index + 1} von ${this.steps.length}`;

        // Clear old highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        // Add new highlight
        if (step.highlight) {
            const elements = document.querySelectorAll(step.highlight);
            elements.forEach(el => el.classList.add('tutorial-highlight'));

            // Scroll first element into view
            if (elements.length > 0) {
                elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Handle waited actions
        const nextBtn = this.overlay.querySelector('.btn-tutorial-next');

        // Remove old 'highlight-pulse' from button if any
        nextBtn.classList.remove('btn-disabled');
        nextBtn.disabled = false;
        nextBtn.title = '';

        if (step.waitForAction) {
            // Instead of hiding, we disable it and explain why
            nextBtn.disabled = true;
            nextBtn.classList.add('btn-disabled');
            nextBtn.title = 'Führe die Aktion aus um fortzufahren';
            nextBtn.textContent = 'Aktion ausführen...';
            this.waitForAction(step.actionType);
        } else {
            nextBtn.style.display = 'inline-block';
        }

        // Final step special handling
        if (step.final) {
            nextBtn.textContent = 'Tutorial abschließen';
        } else {
            nextBtn.textContent = 'Weiter';
        }
    }

    // Wait for specific game action
    waitForAction(actionType) {
        // Store original action handlers
        const originalHandleCardClick = this.game.handleCardClick.bind(this.game);
        const originalMoveHero = this.game.moveHero.bind(this.game);

        if (actionType === 'card_played') {
            // Temporary override to detect card play
            this.game.handleCardClick = (index, card) => {
                const result = originalHandleCardClick(index, card);

                // Check if green card was played
                if (card && card.color === 'green') {
                    // We need to wait a bit because the card play logic itself might need time
                    setTimeout(() => {
                        this.game.handleCardClick = originalHandleCardClick; // Restore
                        this.next();
                    }, 500);
                }

                return result;
            };
        } else if (actionType === 'hero_moved') {
            // Temporary override to detect movement
            this.game.moveHero = (q, r) => {
                originalMoveHero(q, r);
                setTimeout(() => {
                    this.game.moveHero = originalMoveHero; // Restore
                    this.next();
                }, 500);
            };
        }
    }

    // Go to next step
    next() {
        this.showStep(this.currentStep + 1);
    }

    // Skip tutorial
    skip() {
        // No confirmation needed - just skip
        this.complete();
    }

    // Complete tutorial
    complete() {
        this.active = false;
        localStorage.setItem('tutorial_completed', 'true');

        // Remove overlay
        if (this.overlay) {
            this.overlay.classList.add('hiding');
            setTimeout(() => {
                this.overlay.remove();
                this.overlay = null;
            }, 300);
        }

        // Clear highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        this.game.ui?.addLog('✅ Tutorial abgeschlossen!', 'info');
        if (typeof this.game.ui?.showNotification === 'function') {
            this.game.ui.showNotification('Tutorial abgeschlossen! Viel Erfolg!', 'success');
        }
    }

    // Reset and restart tutorial
    restart() {
        localStorage.removeItem('tutorial_completed');
        if (this.active) {
            this.complete();
        }
        setTimeout(() => this.start(), 100);
    }
}

export default SimpleTutorial;
