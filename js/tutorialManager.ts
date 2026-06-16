/**
 * Manages the interactive tutorial
 */
import { t } from './i18n/index';
import { COMBAT_PHASES, GAME_EVENTS } from './constants';
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
    // New: custom handler for complex steps
    onEnter?: (manager: TutorialManager) => void;
    onAction?: (manager: TutorialManager, action: string) => boolean; // return true to advance
}

export default class TutorialManager {
    private game: any;
    private currentStep: number;
    private isActive: boolean;
    public overlay: any;
    public tutorialBox: any;
    public spotlight: any;
    public stepIndicator: any;
    public steps: TutorialStep[] = [];
    private highlightedElements: HTMLElement[] = [];
    private isWaitingForAction: boolean = false;
    private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

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
                onEnter: () => this.showWelcomeAnimation(),
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
            // Step 5: Movement - wait for actual move action
            {
                id: 'movement',
                titleKey: 'tutorial.movement.title',
                textKey: 'tutorial.movement.text',
                highlightSelector: '#game-board',
                action: 'move',
                nextOnAction: 'hero_moved',
                onEnter: () => this.highlightReachableHexes(),
            },
            // Step 6: End Turn Button
            {
                id: 'end_turn',
                titleKey: 'tutorial.endTurn.title',
                textKey: 'tutorial.endTurn.text',
                highlightSelector: '#end-turn-btn',
                action: 'endTurn',
                nextOnAction: 'turn_ended',
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
                action: 'endTurn',
                nextOnAction: 'phase_changed',
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
                action: 'endTurn',
                nextOnAction: 'phase_changed',
            },
            // Step 11: Complete
            {
                id: 'complete',
                titleKey: 'tutorial.complete.title',
                textKey: 'tutorial.complete.text',
                tutorialBoxPosition: 'center',
                onEnter: () => this.showCompletionConfetti(),
            },
        ];
    }

    private showWelcomeAnimation(): void {
        if (this.tutorialBox) {
            this.tutorialBox.style.animation = 'tutorial-pop-in 0.5s ease-out';
            // Add keyframe if not exists
            if (!document.getElementById('tutorial-animations')) {
                const style = document.createElement('style');
                style.id = 'tutorial-animations';
                style.textContent = `
                    @keyframes tutorial-pop-in {
                        from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
                        to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    }
                    @keyframes tutorial-pulse {
                        0%, 100% { box-shadow: 0 0 0 4px #3b82f6, 0 0 0 8px rgba(59, 130, 246, 0.3); }
                        50% { box-shadow: 0 0 0 6px #3b82f6, 0 0 0 12px rgba(59, 130, 246, 0.5); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    private showCompletionConfetti(): void {
        if (!this.game.particleSystem) return;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const velocity = 150 + Math.random() * 100;
            this.game.particleSystem.engine.emit('confetti', {
                x: centerX,
                y: centerY,
                count: 1,
                color: ['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#8b5cf6'][i % 5],
                velocity,
                angle,
                life: 2,
                size: 8,
                gravity: 200
            });
        }
    }

    private highlightReachableHexes(): void {
        if (!this.game.reachableHexes || !this.game.hexGrid) return;
        this.game.reachableHexes.forEach((hex: any) => {
            const el = this.game.hexGrid.getHexElement?.(hex.q, hex.r);
            if (el) {
                el.style.animation = 'tutorial-pulse 1s ease-in-out infinite';
                this.highlightedElements.push(el);
            }
        });
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
        this.bindKeyboardShortcuts();
        this.showStep(0);
    }

    private bindKeyboardShortcuts(): void {
        this.boundOnKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
        document.addEventListener('keydown', this.boundOnKeyDown);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.isActive) return;
        // Arrow right / Enter -> Next
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            this.nextStep();
        }
        // Arrow left -> Previous
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevStep();
        }
        // Escape -> Skip
        if (e.key === 'Escape') {
            this.skip();
        }
    }

    stop(): void {
        this.isActive = false;
        this.isWaitingForAction = false;
        this.clearHighlight();
        this.unbindKeyboardShortcuts();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.spotlight && this.spotlight.parentNode) {
            this.spotlight.parentNode.removeChild(this.spotlight);
        }
    }

    private unbindKeyboardShortcuts(): void {
        if (this.boundOnKeyDown) {
            document.removeEventListener('keydown', this.boundOnKeyDown);
            this.boundOnKeyDown = null;
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
        this.isWaitingForAction = !!step.action || !!step.waitForEvent;

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
        
        // Call onEnter callback
        if (step.onEnter) {
            step.onEnter(this);
        }
        
        // If waiting for action, set up listener
        if (step.nextOnAction) {
            this.setupActionListener(step.nextOnAction);
        }
    }

    private setupActionListener(eventName: string): void {
        const handler = () => {
            eventBus.off(eventName, handler);
            if (this.isActive && this.isWaitingForAction) {
                this.isWaitingForAction = false;
                this.nextStep();
            }
        };
        eventBus.on(eventName, handler);
    }

    private renderStep(step: TutorialStep): void {
        if (!this.tutorialBox) return;

        // Update step indicator
        if (this.stepIndicator) {
            this.stepIndicator.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
        }

        // Update content
        const titleEl = document.getElementById('tutorial-title');
        const contentEl = document.getElementById('tutorial-content');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const shortcutHint = document.getElementById('tutorial-shortcut-hint');
        
        if (titleEl) titleEl.textContent = t(step.titleKey);
        if (contentEl) contentEl.textContent = t(step.textKey);
        
        // Add shortcut hint based on action
        if (shortcutHint) {
            let hint = '';
            if (step.action === 'move') hint = t('tutorial.hint.move');
            else if (step.action === 'endTurn') hint = t('tutorial.hint.endTurn');
            else if (step.action === 'playCard') hint = t('tutorial.hint.playCard');
            else if (step.action === 'block') hint = t('tutorial.hint.block');
            else if (step.waitForEvent) hint = t('tutorial.hint.wait');
            shortcutHint.textContent = hint;
        }
        
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
        this.isWaitingForAction = false;
        localStorage.setItem('mk_tutorial_completed', 'true');
        this.clearHighlight();
        this.unbindKeyboardShortcuts();
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
            this.spotlight = document.getElementById('tutorial-spotlight');
            this.stepIndicator = document.getElementById('tutorial-step-indicator');
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
        this.tutorialBox.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        this.tutorialBox.style.color = 'white';
        this.tutorialBox.style.padding = '24px';
        this.tutorialBox.style.borderRadius = '12px';
        this.tutorialBox.style.pointerEvents = 'auto';
        this.tutorialBox.style.maxWidth = '420px';
        this.tutorialBox.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(59, 130, 246, 0.3)';
        this.tutorialBox.style.border = '2px solid #3b82f6';
        this.tutorialBox.style.fontFamily = 'inherit';

        // Title
        const title = document.createElement('h3');
        title.id = 'tutorial-title';
        title.style.margin = '0 0 12px 0';
        title.style.fontSize = '1.25rem';
        title.style.color = '#3b82f6';
        this.tutorialBox.appendChild(title);

        // Content
        const content = document.createElement('div');
        content.id = 'tutorial-content';
        content.style.lineHeight = '1.7';
        content.style.fontSize = '1rem';
        this.tutorialBox.appendChild(content);

        // Shortcut hint
        const shortcutHint = document.createElement('div');
        shortcutHint.id = 'tutorial-shortcut-hint';
        shortcutHint.style.fontSize = '0.8rem';
        shortcutHint.style.color = '#9ca3af';
        shortcutHint.style.marginTop = '8px';
        shortcutHint.style.fontStyle = 'italic';
        shortcutHint.style.minHeight = '1.2em';
        this.tutorialBox.appendChild(shortcutHint);

        // Button container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '8px';
        btnContainer.style.marginTop = '20px';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.flexWrap = 'wrap';

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
        this.stepIndicator = document.createElement('div');
        this.stepIndicator.id = 'tutorial-step-indicator';
        this.stepIndicator.style.textAlign = 'center';
        this.stepIndicator.style.marginTop = '12px';
        this.stepIndicator.style.fontSize = '0.85rem';
        this.stepIndicator.style.color = '#9ca3af';
        this.tutorialBox.appendChild(this.stepIndicator);

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
            this.highlightedElements.push(element);

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
        // Clear elements tracked in array
        this.highlightedElements.forEach(el => {
            el.style.zIndex = '';
            el.style.boxShadow = '';
            el.style.animation = '';
            delete el.dataset.tutorialHighlight;
        });
        // Also clear any elements that might have been highlighted outside our tracking
        const highlighted = document.querySelectorAll('[data-tutorial-highlight="true"]');
        highlighted.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.zIndex = '';
            htmlEl.style.boxShadow = '';
            htmlEl.style.animation = '';
            delete htmlEl.dataset.tutorialHighlight;
        });
        this.highlightedElements = [];
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