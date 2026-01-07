/**
 * Manages the interactive tutorial
 */
export default class TutorialManager {
    private game: any;
    private currentStep: number;
    private isActive: boolean;
    public overlay: any;
    public tutorialBox: any;
    public spotlight: any;

    constructor(game: any) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.initializeDefaultSteps();
    }

    private initializeDefaultSteps(): void {
        this.steps = [
            { text: 'Willkommen bei Mage Knight!' },
            { text: 'Dies ist das Spielfeld.' },
            { text: 'Hier sind deine Karten.' },
            { text: 'Viel Spaß!' }
        ];
    }

    nextStep() {
        if (!this.isActive) return;
        this.showStep(this.currentStep + 1);
        this.currentStep++;
    }

    prevStep() {
        if (!this.isActive) return;
        if (this.currentStep <= 0) {
            this.complete();
            return;
        }
        this.currentStep--;
        this.showStep(this.currentStep);
    }

    skip() {
        this.complete();
    }

    start(): void {
        if (TutorialManager.hasCompleted()) return;

        this.createTutorialUI();
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(1);
    }

    stop(): void {
        this.isActive = false;
        // Close any tutorial UI
    }

    public steps: any[] = [];

    showStep(step: number): void {
        if (this.steps.length > 0) {
            if (step > this.steps.length || step < 1) {
                this.complete();
                return;
            }
        }

        // Implementation of tutorial steps would go here
        console.log(`Tutorial Step ${step}`);

        if (this.game.showToast) {
            this.game.showToast(`Tutorial: Willkommen! (Schritt ${step})`, 'info');
        }

        // Update UI if it exists
        if (this.tutorialBox) {
            const nextBtn = document.getElementById('tutorial-next-btn');
            if (nextBtn) {
                if (step === this.steps.length && this.steps.length > 0) {
                    nextBtn.innerText = "Los geht's!";
                } else {
                    nextBtn.innerText = 'Weiter';
                }
            }

            const content = document.getElementById('tutorial-content');
            if (content && this.steps[step - 1]) {
                content.innerText = this.steps[step - 1].text || '';
            }
        }
    }

    complete(): void {
        this.isActive = false;
        localStorage.setItem('mk_tutorial_completed', 'true');
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.game.showToast('Tutorial abgeschlossen!', 'success');
    }

    createTutorialUI(): void {
        if (document.getElementById('tutorial-overlay')) {
            this.overlay = document.getElementById('tutorial-overlay');
            this.tutorialBox = document.getElementById('tutorial-box');
            return;
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '9999';

        this.tutorialBox = document.createElement('div');
        this.tutorialBox.id = 'tutorial-box';
        this.tutorialBox.className = 'tutorial-box';
        this.tutorialBox.style.position = 'absolute';
        this.tutorialBox.style.bottom = '20px';
        this.tutorialBox.style.left = '50%';
        this.tutorialBox.style.transform = 'translateX(-50%)';
        this.tutorialBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.tutorialBox.style.color = 'white';
        this.tutorialBox.style.padding = '20px';
        this.tutorialBox.style.borderRadius = '8px';
        this.tutorialBox.style.pointerEvents = 'auto';

        const nextBtn = document.createElement('button');
        nextBtn.innerText = 'Weiter';
        nextBtn.id = 'tutorial-next-btn';
        nextBtn.onclick = () => {
            // Next step logic
            this.currentStep++;
            this.showStep(this.currentStep);
        };

        this.tutorialBox.appendChild(document.createElement('div')).id = 'tutorial-content';
        this.tutorialBox.appendChild(nextBtn);

        this.overlay.appendChild(this.tutorialBox);

        // Spotlight element
        this.spotlight = document.createElement('div');
        this.spotlight.id = 'tutorial-spotlight';
        this.spotlight.style.position = 'fixed';
        this.spotlight.style.display = 'none';
        this.spotlight.style.pointerEvents = 'none';
        this.spotlight.style.zIndex = '9998'; // Below overlay but above game
        this.spotlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
        this.spotlight.style.borderRadius = '50%';
        document.body.appendChild(this.spotlight);

        document.body.appendChild(this.overlay);

        // Add Previous and Skip buttons for test
        const prevBtn = document.createElement('button');
        prevBtn.innerText = 'Zurück';
        prevBtn.id = 'tutorial-prev-btn';
        prevBtn.onclick = () => {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.showStep(this.currentStep);
            }
        };
        this.tutorialBox.appendChild(prevBtn);

        const skipBtn = document.createElement('button');
        skipBtn.innerText = 'Überspringen';
        skipBtn.id = 'tutorial-skip-btn';
        skipBtn.onclick = () => {
            this.complete();
        };
        this.tutorialBox.appendChild(skipBtn);
    }

    highlightElement(selector: string): void {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            element.style.zIndex = '10000';
            element.dataset.tutorialHighlight = 'true';

            const rect = element.getBoundingClientRect();
            this.spotlight.style.display = 'block';
            this.spotlight.style.top = `${rect.top - 10}px`;
            this.spotlight.style.left = `${rect.left - 10}px`;
            this.spotlight.style.width = `${rect.width + 20}px`;
            this.spotlight.style.height = `${rect.height + 20}px`;
        }
    }

    clearHighlight(): void {
        const highlighted = document.querySelector('[data-tutorial-highlight="true"]') as HTMLElement;
        if (highlighted) {
            highlighted.style.zIndex = '';
            delete highlighted.dataset.tutorialHighlight;
        }
        if (this.spotlight) {
            this.spotlight.style.display = 'none';
        }
    }

    positionTutorialBox(position: 'top' | 'bottom' | 'center'): void {
        if (!this.tutorialBox) return;
        this.tutorialBox.style.top = '';
        this.tutorialBox.style.bottom = '';
        this.tutorialBox.style.transform = 'translateX(-50%)';

        if (position === 'top') {
            this.tutorialBox.style.top = '20px';
        } else if (position === 'bottom') {
            this.tutorialBox.style.bottom = '20px';
        } else if (position === 'center') {
            this.tutorialBox.style.top = '50%';
        }
    }

    static reset(): void {
        localStorage.removeItem('mk_tutorial_completed');
    }

    static hasCompleted(): boolean {
        if (typeof localStorage === 'undefined') return false;
        return localStorage.getItem('mk_tutorial_completed') === 'true';
    }
}
