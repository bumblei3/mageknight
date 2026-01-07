// Tutorial Manager for Mage Knight
// Provides interactive, step-by-step tutorial with spotlight effects and interaction detection

export class TutorialManager {
    constructor(game) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.steps = this.defineTutorialSteps();
        this.overlay = null;
        this.spotlight = null;
        this.tutorialBox = null;
        this.originalHandlers = {};
    }

    /**
     * Start the tutorial
     */
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;
        this.createTutorialUI();
        this.showStep(0);

        if (this.game && this.game.addLog) {
            this.game.addLog('🎓 Tutorial gestartet', 'info');
        }
    }

    /**
     * Create tutorial UI elements
     */
    createTutorialUI() {
        if (typeof document === 'undefined') return;
        // Check if already exists
        if (document.getElementById('tutorial-overlay-custom')) {
            this.overlay = document.getElementById('tutorial-overlay-custom');
            this.spotlight = document.getElementById('tutorial-spotlight');
            this.tutorialBox = document.getElementById('tutorial-box-custom');
        } else {
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.id = 'tutorial-overlay-custom';
            this.overlay.className = 'tutorial-overlay-custom';

            // Create spotlight
            this.spotlight = document.createElement('div');
            this.spotlight.id = 'tutorial-spotlight';
            this.spotlight.className = 'tutorial-spotlight';

            // Create tutorial box
            this.tutorialBox = document.createElement('div');
            this.tutorialBox.id = 'tutorial-box-custom';
            this.tutorialBox.className = 'tutorial-box-custom';
            this.tutorialBox.innerHTML = `
                <div class="tutorial-progress-wrapper" style="text-align:center;">
                    <div class="tutorial-progress" id="tutorial-step-counter"></div>
                </div>
                <h3 id="tutorial-title-custom"></h3>
                <p id="tutorial-text-custom"></p>
                <div class="tutorial-navigation">
                    <button class="btn btn-secondary" id="tutorial-prev-btn">← Zurück</button>
                    <button class="btn btn-secondary" id="tutorial-skip-btn">Überspringen</button>
                    <button class="btn btn-primary" id="tutorial-next-btn">Weiter →</button>
                </div>
            `;

            this.overlay.appendChild(this.spotlight);
            this.overlay.appendChild(this.tutorialBox);
            document.body.appendChild(this.overlay);

            // Add event listeners
            document.getElementById('tutorial-next-btn').addEventListener('click', () => this.nextStep());
            document.getElementById('tutorial-prev-btn').addEventListener('click', () => this.prevStep());
            document.getElementById('tutorial-skip-btn').addEventListener('click', () => this.skip());

            // Keyboard support
            this.keyboardHandler = (e) => {
                if (!this.isActive) return;
                if (e.key === 'Escape') this.skip();
                if (e.key === 'Enter' && !this.steps[this.currentStep].waitForAction) this.nextStep();
            };
            document.addEventListener('keydown', this.keyboardHandler);
        }
    }

    /**
     * Show specific step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        // Cleanup previous interactive wait
        this.restoreHandlers();

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        if (typeof document === 'undefined') return;

        // Update UI
        const counter = document.getElementById('tutorial-step-counter');
        const title = document.getElementById('tutorial-title-custom');
        const text = document.getElementById('tutorial-text-custom');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const prevBtn = document.getElementById('tutorial-prev-btn');

        if (counter) counter.textContent = `Schritt ${stepIndex + 1} / ${this.steps.length}`;
        if (title) title.textContent = step.title;
        if (text) text.innerHTML = step.text.replace(/\n/g, '<br>');

        if (prevBtn) {
            prevBtn.disabled = stepIndex === 0;
            prevBtn.style.visibility = step.waitForAction ? 'hidden' : 'visible';
        }

        if (nextBtn) {
            if (stepIndex === this.steps.length - 1) {
                nextBtn.textContent = "Los geht's!";
            } else if (step.waitForAction) {
                nextBtn.textContent = 'Aktion ausführen...';
            } else {
                nextBtn.textContent = 'Weiter →';
            }
            nextBtn.disabled = !!step.waitForAction;
        }

        // Show overlay
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }

        // Highlight element if specified
        if (step.highlightSelector) {
            this.highlightElement(step.highlightSelector);
        } else {
            this.clearHighlight();
        }

        // Position tutorial box
        this.positionTutorialBox(step.boxPosition || 'center');

        // Setup interactive wait if needed
        if (step.waitForAction) {
            this.setupActionWait(step.waitForAction);
        }
    }

    /**
     * Highlight an element with spotlight
     */
    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            this.clearHighlight();
            return;
        }

        const rect = element.getBoundingClientRect();
        if (this.spotlight) {
            this.spotlight.style.display = 'block';
            this.spotlight.style.left = `${rect.left - 10}px`;
            this.spotlight.style.top = `${rect.top - 10}px`;
            this.spotlight.style.width = `${rect.width + 20}px`;
            this.spotlight.style.height = `${rect.height + 20}px`;
        }

        // Add highlight class
        if (element.classList) {
            element.classList.add('tutorial-highlight');
        }
        element.style.zIndex = '10000';
        element.dataset.tutorialHighlight = 'true';
    }

    /**
     * Clear spotlight
     */
    clearHighlight() {
        if (this.spotlight) {
            this.spotlight.style.display = 'none';
        }

        // Reset all highlighted elements
        document.querySelectorAll('[data-tutorial-highlight="true"]').forEach(el => {
            if (el.classList) el.classList.remove('tutorial-highlight');
            el.style.zIndex = '';
            delete el.dataset.tutorialHighlight;
        });
    }

    /**
     * Position tutorial box
     */
    positionTutorialBox(position) {
        if (!this.tutorialBox) return;

        this.tutorialBox.style.top = '';
        this.tutorialBox.style.bottom = '';
        this.tutorialBox.style.left = '50%';
        this.tutorialBox.style.transform = 'translateX(-50%)';

        switch (position) {
        case 'top':
            this.tutorialBox.style.top = '20px';
            break;
        case 'bottom':
            this.tutorialBox.style.bottom = '20px';
            break;
        case 'center':
        default:
            this.tutorialBox.style.top = '50%';
            this.tutorialBox.style.transform = 'translate(-50%, -50%)';
            break;
        }
    }

    /**
     * Interactive Action Wait
     */
    setupActionWait(actionType) {
        if (actionType === 'card_played') {
            this.originalHandlers.playCard = this.game.handleCardClick;
            this.game.handleCardClick = (index, card) => {
                const result = this.originalHandlers.playCard.call(this.game, index, card);
                if (card) {
                    this.game.addLog('Perfekt! Karte gespielt.', 'success');
                    if (this.game.setGameTimeout) {
                        this.game.setGameTimeout(() => this.nextStep(), 500);
                    } else {
                        setTimeout(() => this.nextStep(), 500);
                    }
                }
                return result;
            };
        } else if (actionType === 'hero_moved') {
            this.originalHandlers.moveHero = this.game.moveHero;
            this.game.moveHero = (q, r) => {
                const result = this.originalHandlers.moveHero.call(this.game, q, r);
                this.game.addLog('Sehr gut! Du hast dich bewegt.', 'success');
                if (this.game.setGameTimeout) {
                    this.game.setGameTimeout(() => this.nextStep(), 500);
                } else {
                    setTimeout(() => this.nextStep(), 500);
                }
                return result;
            };
        }
    }

    restoreHandlers() {
        if (this.originalHandlers.playCard) {
            this.game.handleCardClick = this.originalHandlers.playCard;
            delete this.originalHandlers.playCard;
        }
        if (this.originalHandlers.moveHero) {
            this.game.moveHero = this.originalHandlers.moveHero;
            delete this.originalHandlers.moveHero;
        }
    }

    /**
     * Navigation
     */
    nextStep() {
        this.showStep(this.currentStep + 1);
    }

    prevStep() {
        this.showStep(this.currentStep - 1);
    }

    skip() {
        this.complete();
    }

    complete() {
        this.isActive = false;
        this.restoreHandlers();
        this.clearHighlight();
        if (this.overlay) this.overlay.style.display = 'none';
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }
        localStorage.setItem('mageKnightTutorialCompleted', 'true');
        if (this.game.addLog) this.game.addLog('🎓 Tutorial abgeschlossen!', 'success');
    }

    static hasCompleted() {
        return localStorage.getItem('mageKnightTutorialCompleted') === 'true';
    }

    /**
     * Reset tutorial completion
     */
    static reset() {
        localStorage.removeItem('mageKnightTutorialCompleted');
    }

    /**
     * Define tutorial steps
     */
    defineTutorialSteps() {
        return [
            {
                title: '👋 Willkommen, Held!',
                text: 'In dieser Welt bist du ein mächtiger Mage Knight. Dein Ziel: Die Karte erkunden, Ruhm sammeln und am Ende die stärksten Gegner besiegen.\n\nKlicke auf "Weiter" um die Steuerung zu lernen.',
                highlightSelector: null,
                boxPosition: 'center'
            },
            {
                title: '🎴 Deine Macht: Handkarten',
                text: 'Alles in diesem Spiel passiert durch Karten. Du findest sie hier unten.\n\n🌿 **Grün**: Bewegung\n🛡️ **Blau**: Verteidigung\n⚔️ **Rot**: Angriff\n👑 **Weiß**: Einfluss',
                highlightSelector: '.hand-area',
                boxPosition: 'top'
            },
            {
                title: '👣 Grundbewegung',
                text: 'Um dich zu bewegen, brauchst du Bewegungspunkte. Klicke jetzt auf eine **grüne Karte**, um sie zu spielen.',
                highlightSelector: '.hand-area',
                boxPosition: 'top',
                waitForAction: 'card_played'
            },
            {
                title: '🗺️ Die Welt erkunden',
                text: 'Hervorragend! Die violett markierten Felder sind nun erreichbar. Klicke auf ein benachbartes Feld, um den Helden dorthin zu ziehen.',
                highlightSelector: '#game-board',
                boxPosition: 'center',
                waitForAction: 'hero_moved'
            },
            {
                title: '💎 Mana & Quellen',
                text: 'Oben rechts siehst du die **Mana-Quelle**. Mana verstärkt deine Karten drastisch! Du kannst pro Zug einen Würfel aus der Quelle nutzen, indem du ihn anklickst.',
                highlightSelector: '.mana-source-container',
                boxPosition: 'bottom'
            },
            {
                title: '⚔️ Der Kampf',
                text: 'Triffst du auf Gegner, beginnt der Kampf. Er hat drei Phasen:\n\n1. **Fernkampf**: Besiege Gegner, bevor sie zuschlagen.\n2. **Block**: Verteidige dich gegen den Gegenangriff.\n3. **Angriff**: Gib dem Gegner den Rest.',
                highlightSelector: null,
                boxPosition: 'center'
            },
            {
                title: '🦅 Skills & Level-Up',
                text: 'Durch Siege sammelst du Ruhm und steigst Level auf. Bei jedem Level-Up darfst du mächtige **Skills** wie *Flug* oder *Belagerungs-Meister* wählen.',
                highlightSelector: '.hero-stats-panel',
                boxPosition: 'bottom'
            },
            {
                title: '🎲 Dein Abenteuer beginnt!',
                text: 'Nutze Shortcuts (1-5 für Karten, R für Rasten, Space für Zug-Ende). Jetzt bist du bereit. Befreie das Land!\n\nTipp: Mit **"T"** kannst du dieses Tutorial jederzeit neu starten.',
                highlightSelector: null,
                boxPosition: 'center'
            }
        ];
    }
}

export default TutorialManager;
