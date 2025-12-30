// Tutorial Manager for Mage Knight
// Provides interactive, step-by-step tutorial with spotlight effects

export class TutorialManager {
    constructor(game) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.steps = this.defineTutorialSteps();
        this.overlay = null;
        this.spotlight = null;
        this.tutorialBox = null;
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
    }

    /**
     * Create tutorial UI elements
     */
    createTutorialUI() {
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
                <div class="tutorial-progress" id="tutorial-progress">
                    <span id="tutorial-step-counter"></span>
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

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // Update UI
        if (document.getElementById('tutorial-step-counter')) {
            document.getElementById('tutorial-step-counter').textContent = `${stepIndex + 1} / ${this.steps.length}`;
        }
        if (document.getElementById('tutorial-title-custom')) {
            document.getElementById('tutorial-title-custom').textContent = step.title;
        }
        if (document.getElementById('tutorial-text-custom')) {
            document.getElementById('tutorial-text-custom').textContent = step.text;
        }

        // Update button states
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');

        if (prevBtn) {
            prevBtn.disabled = stepIndex === 0;
        }
        if (nextBtn) {
            nextBtn.textContent = stepIndex === this.steps.length - 1 ? "Los geht's!" : 'Weiter →';
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

        // Make element temporarily higher z-index
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

        // Reset z-index of previously highlighted elements
        const highlighted = document.querySelectorAll('[data-tutorial-highlight="true"]');
        highlighted.forEach(el => {
            el.style.zIndex = '';
            delete el.dataset.tutorialHighlight;
        });
    }

    /**
     * Position tutorial box
     */
    positionTutorialBox(position) {
        this.tutorialBox.className = 'tutorial-box-custom';

        switch (position) {
            case 'top':
                this.tutorialBox.style.top = '20px';
                this.tutorialBox.style.bottom = 'auto';
                break;
            case 'bottom':
                this.tutorialBox.style.top = 'auto';
                this.tutorialBox.style.bottom = '20px';
                break;
            case 'center':
            default:
                this.tutorialBox.style.top = '50%';
                this.tutorialBox.style.bottom = 'auto';
                this.tutorialBox.style.transform = 'translate(-50%, -50%)';
                break;
        }
    }

    /**
     * Next step
     */
    nextStep() {
        this.showStep(this.currentStep + 1);
    }

    /**
     * Previous step
     */
    prevStep() {
        this.showStep(this.currentStep - 1);
    }

    /**
     * Skip tutorial
     */
    skip() {
        this.complete();
    }

    /**
     * Complete tutorial
     */
    complete() {
        this.isActive = false;
        this.clearHighlight();
        this.overlay.style.display = 'none';
        localStorage.setItem('mageKnightTutorialCompleted', 'true');
    }

    /**
     * Check if tutorial has been completed
     */
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
                title: '👋 Willkommen bei Mage Knight!',
                text: 'Dieser kurze Tutorial führt dich durch die Grundlagen des Spiels. Du kannst jederzeit überspringen oder mit "T" neu starten.',
                highlightSelector: null,
                boxPosition: 'center'
            },
            {
                title: '🎴 Deine Handkarten',
                text: 'Hier unten siehst du deine Handkarten. Hover über Karten zeigt Details. Linksklick spielt die Karte, Rechtsklick für seitlich (+1). Nutze auch Tasten 1-5!',
                highlightSelector: '.hand-area',
                boxPosition: 'top'
            },
            {
                title: '👣 Bewegung',
                text: 'Spiele grüne Bewegungskarten (🌿). Das Spiel zeigt dann erreichbare Felder violett an. Klicke auf ein Feld um dich zu bewegen. Verschiedene Terrains kosten unterschiedlich viel!',
                highlightSelector: '.movement-panel',
                boxPosition: 'center'
            },
            {
                title: '⚔️ Kampf',
                text: 'Betritt ein Feld mit einem Feind um zu kämpfen. Zuerst Block-Phase (blaue Karten 🛡️), dann Angriffs-Phase (rote Karten ⚔️). Drücke Space um die Phase zu beenden.',
                highlightSelector: '#game-board',
                boxPosition: 'bottom'
            },
            {
                title: '💾 Speichern & Laden',
                text: 'Oben rechts findest du Save (💾) und Load (📂) Buttons. Das Spiel speichert auch automatisch nach jedem Zug! Nutze Ctrl+S und Ctrl+L als Shortcuts.',
                highlightSelector: '.header-right',
                boxPosition: 'bottom'
            },
            {
                title: '⌨️ Keyboard Shortcuts',
                text: 'Unten siehst du alle Tastenkürzel. Mit 1-5 spielst du Karten schnell, R für Rasten, H für Hilfe, T für Tutorial. Viel schneller als nur mit Maus!',
                highlightSelector: '.shortcuts-bar',
                boxPosition: 'top'
            },
            {
                title: '🎯 Spielziel',
                text: 'Besiege alle 3 Feinde auf der Karte! Verwalte deine Karten klug, nutze Terrain zu deinem Vorteil und vergiss nicht zu rasten wenn du schlechte Karten hast. Viel Erfolg!',
                highlightSelector: null,
                boxPosition: 'center'
            }
        ];
    }
}

export default TutorialManager;
