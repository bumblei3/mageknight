/**
 * Manages the interactive tutorial
 */
import { t } from './i18n/index';
import { COMBAT_PHASES } from './constants';
import { eventBus } from './eventBus';

interface TutorialStep {
    id: string;
    titleKey: string;
    textKey: string;
    highlightSelector?: string;
    tutorialBoxPosition?: 'top' | 'bottom' | 'center';
    action?: 'move' | 'playCard' | 'endTurn' | 'clickEnemy' | 'block' | 'attack' | 'auto';
    waitForEvent?: string;
    condition?: (game: any) => boolean;
    nextOnAction?: string;
}

export default class TutorialManager {
    private game: any;
    private currentStep: number;
    private isActive: boolean;
    public overlay: any;
    public tutorialBox: any;
    public spotlight: any;
    public steps: TutorialStep[] = [];

    constructor(game: any) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.initializeSteps();
    }

    private initializeSteps(): void {
        this.steps = [
            // Step 1: Welcome
            {
                id: 'welcome',
                titleKey: 'tutorial.welcome.title',
                textKey: 'tutorial.welcome.text',
                tutorialBoxPosition: 'center',
            },
            // Step 2: Hero & Stats
            {
                id: 'hero_stats',
                titleKey: 'tutorial.heroStats.title',
                textKey: 'tutorial.heroStats.text',
                highlightSelector: '#hero-name',
            },
            // Step 3: Hand Cards
            {
                id: 'hand_cards',
                titleKey: 'tutorial.handCards.title',
                textKey: 'tutorial.handCards.text',
                highlightSelector: '#hand-cards',
            },
            // Step 4: Mana Source
            {
                id: 'mana_source',
                titleKey: 'tutorial.manaSource.title',
                textKey: 'tutorial.manaSource.text',
                highlightSelector: '#mana-source',
            },
            // Step 5: Movement
            {
                id: 'movement',
                titleKey: 'tutorial.movement.title',
                textKey: 'tutorial.movement.text',
                highlightSelector: '#game-board',
                action: 'move',
                condition: (game) => game.reachableHexes && game.reachableHexes.length > 0,
            },
            // Step 6: End Turn Button
            {
                id: 'end_turn',
                titleKey: 'tutorial.endTurn.title',
                textKey: 'tutorial.endTurn.text',
                highlightSelector: '#end-turn-btn',
                action: 'endTurn',
            },
            // Step 7: Combat Intro (when combat starts)
            {
                id: 'combat_intro',
                titleKey: 'tutorial.combatIntro.title',
                textKey: 'tutorial.combatIntro.text',
                highlightSelector: '#combat-panel',
                waitForEvent: 'combat_started',
            },
            // Step 8: Ranged Phase
            {
                id: 'ranged_phase',
                titleKey: 'tutorial.rangedPhase.title',
                textKey: 'tutorial.rangedPhase.text',
                highlightSelector: '#end-turn-btn',
                condition: (game) => game.combat && game.combat.phase === COMBAT_PHASES.RANGED,
            },
            // Step 9: Block Phase
            {
                id: 'block_phase',
                titleKey: 'tutorial.blockPhase.title',
                textKey: 'tutorial.blockPhase.text',
                highlightSelector: '#combat-panel',
                action: 'block',
                condition: (game) => game.combat && game.combat.phase === COMBAT_PHASES.BLOCK,
            },
            // Step 10: Attack Phase
            {
                id: 'attack_phase',
                titleKey: 'tutorial.attackPhase.title',
                textKey: 'tutorial.attackPhase.text',
                highlightSelector: '#end-turn-btn',
                condition: (game) => game.combat && game.combat.phase === COMBAT_PHASES.ATTACK,
            },
            // Step 11: Complete
            {
                id: 'complete',
                titleKey: 'tutorial.complete.title',
                textKey: 'tutorial.complete.text',
                tutorialBoxPosition: 'center',
            },
        ];
    }

    nextStep(): void {
        if (!this.isActive) return;
        this.showStep(this.currentStep + 1);
    }

    prevStep(): void {
        if (!this.isActive) return;
        if (this.currentStep <= 0) {
            this.complete();
            return;
        }
        this.showStep(this.currentStep - 1);
    }

    skip(): void {
        this.complete();
    }

    start(): void {
        if (TutorialManager.hasCompleted()) return;

        this.createTutorialUI();
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
    }

    stop(): void {
        this.isActive = false;
        this.clearHighlight();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.spotlight && this.spotlight.parentNode) {
            this.spotlight.parentNode.removeChild(this.spotlight);
        }
    }

    showStep(stepIndex: number): void {
        if (!this.isActive) return;
        
        const step = this.steps[stepIndex];
        if (!step) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;

        // Check condition
        if (step.condition && !step.condition(this.game)) {
            // Wait for condition - poll every 500ms
            const checkInterval = setInterval(() => {
                if (!this.isActive) {
                    clearInterval(checkInterval);
                    return;
                }
                if (step.condition && step.condition(this.game)) {
                    clearInterval(checkInterval);
                    this.renderStep(step);
                }
            }, 500);
            return;
        }

        // Wait for event
        if (step.waitForEvent) {
            const handler = () => {
                eventBus.off(step.waitForEvent!, handler);
                if (this.isActive) this.renderStep(step);
            };
            eventBus.on(step.waitForEvent, handler);
            return;
        }

        this.renderStep(step);
    }

    private renderStep(step: TutorialStep): void {
        if (!this.tutorialBox) return;

        // Update content
        const titleEl = document.getElementById('tutorial-title');
        const contentEl = document.getElementById('tutorial-content');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const prevBtn = document.getElementById('tutorial-prev-btn');
        
        if (titleEl) titleEl.textContent = t(step.titleKey);
        if (contentEl) contentEl.textContent = t(step.textKey);
        
        // Position box
        if (step.tutorialBoxPosition) {
            this.positionTutorialBox(step.tutorialBoxPosition);
        }

        // Highlight element
        this.clearHighlight();
        if (step.highlightSelector) {
            this.highlightElement(step.highlightSelector);
        }

        // Update buttons
        if (nextBtn) {
            if (this.currentStep >= this.steps.length - 1) {
                nextBtn.textContent = t('tutorial.btn.start');
            } else {
                nextBtn.textContent = t('tutorial.btn.next');
            }
        }
        if (prevBtn) {
            prevBtn.style.display = this.currentStep > 0 ? 'inline-block' : 'none';
        }
    }

    complete(): void {
        this.isActive = false;
        localStorage.setItem('mk_tutorial_completed', 'true');
        this.clearHighlight();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.spotlight && this.spotlight.parentNode) {
            this.spotlight.parentNode.removeChild(this.spotlight);
        }
        if (this.game.showToast) {
            this.game.showToast(t('tutorial.completed'), 'success');
        }
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
        this.tutorialBox.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.tutorialBox.style.color = 'white';
        this.tutorialBox.style.padding = '24px';
        this.tutorialBox.style.borderRadius = '12px';
        this.tutorialBox.style.pointerEvents = 'auto';
        this.tutorialBox.style.maxWidth = '400px';
        this.tutorialBox.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
        this.tutorialBox.style.border = '2px solid #3b82f6';
        this.tutorialBox.style.fontFamily = 'inherit';

        // Title
        const title = document.createElement('h3');
        title.id = 'tutorial-title';
        title.style.margin = '0 0 12px 0';
        title.style.fontSize = '1.2rem';
        title.style.color = '#3b82f6';
        this.tutorialBox.appendChild(title);

        // Content
        const content = document.createElement('div');
        content.id = 'tutorial-content';
        content.style.lineHeight = '1.6';
        content.style.fontSize = '1rem';
        this.tutorialBox.appendChild(content);

        // Button container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '8px';
        btnContainer.style.marginTop = '20px';
        btnContainer.style.justifyContent = 'center';

        const prevBtn = document.createElement('button');
        prevBtn.innerText = t('tutorial.btn.prev');
        prevBtn.id = 'tutorial-prev-btn';
        prevBtn.style.display = 'none';
        prevBtn.onclick = () => this.prevStep();
        this.styleButton(prevBtn, '#6b7280');

        const nextBtn = document.createElement('button');
        nextBtn.innerText = t('tutorial.btn.next');
        nextBtn.id = 'tutorial-next-btn';
        nextBtn.onclick = () => this.nextStep();
        this.styleButton(nextBtn, '#3b82f6');

        const skipBtn = document.createElement('button');
        skipBtn.innerText = t('tutorial.btn.skip');
        skipBtn.id = 'tutorial-skip-btn';
        skipBtn.onclick = () => this.skip();
        this.styleButton(skipBtn, '#ef4444');

        btnContainer.appendChild(prevBtn);
        btnContainer.appendChild(nextBtn);
        btnContainer.appendChild(skipBtn);
        this.tutorialBox.appendChild(btnContainer);

        // Step indicator
        const stepIndicator = document.createElement('div');
        stepIndicator.id = 'tutorial-step-indicator';
        stepIndicator.style.textAlign = 'center';
        stepIndicator.style.marginTop = '12px';
        stepIndicator.style.fontSize = '0.85rem';
        stepIndicator.style.color = '#9ca3af';
        this.tutorialBox.appendChild(stepIndicator);

        // Spotlight element
        this.spotlight = document.createElement('div');
        this.spotlight.id = 'tutorial-spotlight';
        this.spotlight.style.position = 'fixed';
        this.spotlight.style.display = 'none';
        this.spotlight.style.pointerEvents = 'none';
        this.spotlight.style.zIndex = '9998';
        this.spotlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.7)';
        this.spotlight.style.borderRadius = '8px';
        this.spotlight.style.transition = 'all 0.3s ease';
        document.body.appendChild(this.spotlight);

        document.body.appendChild(this.overlay);
        this.overlay.appendChild(this.tutorialBox);
    }

    private styleButton(btn: HTMLButtonElement, color: string): void {
        btn.style.padding = '10px 20px';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '0.95rem';
        btn.style.fontWeight = '600';
        btn.style.color = 'white';
        btn.style.backgroundColor = color;
        btn.style.transition = 'background-color 0.2s, transform 0.1s';
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.02)'; btn.style.filter = 'brightness(1.1)'; };
        btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.filter = 'brightness(1)'; };
    }

    highlightElement(selector: string): void {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            element.style.zIndex = '10000';
            element.dataset.tutorialHighlight = 'true';
            element.style.boxShadow = '0 0 0 4px #3b82f6, 0 0 0 8px rgba(59, 130, 246, 0.3)';
            element.style.transition = 'box-shadow 0.3s ease';

            const rect = element.getBoundingClientRect();
            this.spotlight.style.display = 'block';
            this.spotlight.style.top = `${rect.top - 8}px`;
            this.spotlight.style.left = `${rect.left - 8}px`;
            this.spotlight.style.width = `${rect.width + 16}px`;
            this.spotlight.style.height = `${rect.height + 16}px`;
            this.spotlight.style.borderRadius = '8px';
        }
    }

    clearHighlight(): void {
        const highlighted = document.querySelector('[data-tutorial-highlight="true"]') as HTMLElement;
        if (highlighted) {
            highlighted.style.zIndex = '';
            highlighted.style.boxShadow = '';
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
            this.tutorialBox.style.transform = 'translate(-50%, -50%)';
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
