/**
 * Contextual Action Bar - Dynamic action hints based on game state
 * Shows available actions with keyboard shortcuts
 */
import { t } from '../i18n/index.js';
import { eventBus } from '../eventBus.js';

interface ActionButton {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    showCondition?: (game: any) => boolean;
    order?: number;
}

interface HintItem {
    label: string;
    shortcut?: string;
    condition?: (game: any) => boolean;
}

export class ActionBarManager {
    private game: any;
    private container: HTMLElement | null = null;
    private hintContainer: HTMLElement | null = null;
    private registeredActions: Map<string, ActionButton> = new Map();
    private firstTimeHints: Map<string, boolean> = new Map();
    private currentPhase: string = 'exploration';

    constructor(game: any) {
        this.game = game;
        this.init();
        this.registerDefaultActions();
        this.registerDefaultHints();
        this.bindEvents();
    }

    private init(): void {
        this.container = document.getElementById('action-bar-content');
        this.hintContainer = document.getElementById('action-bar-hint');
        if (!this.container || !this.hintContainer) {
            console.warn('[ActionBar] Container elements not found');
        }
    }

    private bindEvents(): void {
        // Re-render on game state changes
        eventBus.on('game:stateChanged', () => this.render());
        eventBus.on('game:phaseChanged', (data: unknown) => {
            this.currentPhase = data as string;
            this.render();
        });
        eventBus.on('hero:statsChanged', () => this.render());
        eventBus.on('combat:phaseChanged', () => this.render());
        eventBus.on('movement:modeChanged', () => this.render());
        eventBus.on('card:selected', () => this.render());
    }

    private registerDefaultActions(): void {
        // Movement Mode Actions
        this.registerAction({
            id: 'move-confirm',
            label: t('ui.actions.confirmMove'),
            icon: '👣',
            shortcut: 'Enter',
            primary: true,
            onClick: () => this.game.confirmMovement?.(),
            showCondition: () => this.game.movementMode === true,
            order: 10
        });

        this.registerAction({
            id: 'move-cancel',
            label: t('ui.actions.cancelMove'),
            icon: '✕',
            shortcut: 'Esc',
            danger: true,
            onClick: () => this.game.cancelMovement?.(),
            showCondition: () => this.game.movementMode === true,
            order: 20
        });

        // Card Selected Actions (when hovering a card)
        this.registerAction({
            id: 'play-basic',
            label: t('ui.actions.playBasic'),
            icon: '▶',
            shortcut: 'Klick / Enter',
            primary: true,
            onClick: () => this.playSelectedCard(false),
            showCondition: () => this.hasPlayableCard() && !this.game.combat,
            order: 10
        });

        this.registerAction({
            id: 'play-strong',
            label: t('ui.actions.playStrong'),
            icon: '⚡',
            shortcut: 'Shift+Klick',
            primary: true,
            onClick: () => this.playSelectedCard(true),
            showCondition: () => this.hasPlayableCardWithStrong() && !this.game.combat,
            order: 15
        });

        this.registerAction({
            id: 'play-sideways',
            label: t('ui.actions.playSideways'),
            icon: '↔',
            shortcut: 'Rechtsklick',
            onClick: () => this.openSidewaysModal(),
            showCondition: () => this.hasPlayableCard() && !this.game.combat,
            order: 20
        });

        // Combat Actions
        this.registerAction({
            id: 'combat-ranged',
            label: t('ui.actions.skipRanged'),
            icon: '🏹',
            shortcut: 'Space',
            onClick: () => this.game.combatOrchestrator?.endRangedPhase?.(),
            showCondition: () => this.game.combat && this.game.combat?.phase === 'RANGED',
            order: 10
        });

        this.registerAction({
            id: 'combat-block',
            label: t('ui.actions.block'),
            icon: '🛡️',
            shortcut: 'Klick Karte',
            primary: true,
            onClick: () => {}, // Handled by card click
            showCondition: () => this.game.combat && this.game.combat?.phase === 'BLOCK',
            order: 10
        });

        this.registerAction({
            id: 'combat-attack',
            label: t('ui.actions.attack'),
            icon: '⚔️',
            shortcut: 'Space',
            primary: true,
            onClick: () => this.game.combatOrchestrator?.executeAttack?.(),
            showCondition: () => this.game.combat && this.game.combat?.phase === 'ATTACK',
            order: 10
        });

        this.registerAction({
            id: 'combat-end',
            label: t('ui.actions.endCombat'),
            icon: '✓',
            shortcut: 'Space',
            primary: true,
            onClick: () => this.game.combatOrchestrator?.endCombat?.(),
            showCondition: () => this.game.combat && this.game.combat?.phase === 'COMPLETE',
            order: 10
        });

        // Exploration Actions
        this.registerAction({
            id: 'explore-site',
            label: t('ui.actions.explore'),
            icon: '🔍',
            shortcut: 'E',
            primary: true,
            onClick: () => this.game.actionManager?.explore?.(),
            showCondition: () => !this.game.combat && !this.game.movementMode && this.canExplore(),
            order: 10
        });

        this.registerAction({
            id: 'end-turn',
            label: t('ui.buttons.endTurn'),
            icon: '⏭️',
            shortcut: 'Space',
            primary: true,
            onClick: () => this.game.endTurn?.(),
            showCondition: () => !this.game.combat && !this.game.movementMode && this.game.canEndTurn !== false,
            order: 100
        });

        this.registerAction({
            id: 'rest',
            label: t('ui.buttons.rest'),
            icon: '🏕️',
            shortcut: 'R',
            onClick: () => this.game.rest?.(),
            showCondition: () => !this.game.combat && !this.game.movementMode && this.game.canRest !== false,
            order: 110
        });

        // Contextual site / heal (formerly left action-panel only)
        this.registerAction({
            id: 'heal',
            label: t('ui.buttons.heal') || 'Heilen',
            icon: '💚',
            primary: true,
            onClick: () => this.game.applyHealing?.(),
            showCondition: () => {
                const hero = this.game.hero;
                if (!hero || this.game.combat) return false;
                return (hero.wounds || 0) > 0 && (hero.healingPoints || 0) > 0;
            },
            order: 5
        });

        this.registerAction({
            id: 'visit',
            label: t('ui.actions.visit') || 'Besuchen',
            icon: '🏛️',
            primary: true,
            onClick: () => this.game.actionManager?.visitSite?.(),
            showCondition: () => this.canVisit(),
            order: 8
        });

        // Mana Actions (subtle hint)
        this.registerAction({
            id: 'take-mana',
            label: t('ui.actions.takeMana'),
            icon: '💎',
            shortcut: 'Klick Würfel',
            onClick: () => {},
            showCondition: () => !this.game.combat && this.game.manaPool?.length > 0,
            order: 200
        });
    }

    private registerDefaultHints(): void {
        this.firstTimeHints.set('card-play', false);
        this.firstTimeHints.set('movement', false);
        this.firstTimeHints.set('combat', false);
        this.firstTimeHints.set('mana', false);
        this.firstTimeHints.set('sideways', false);
        this.firstTimeHints.set('rest', false);
        this.firstTimeHints.set('end-turn', false);
    }

    registerAction(action: ActionButton): void {
        this.registeredActions.set(action.id, action);
    }

    unregisterAction(id: string): void {
        this.registeredActions.delete(id);
    }

    hasPlayableCard(): boolean {
        if (!this.game.hero?.hand) return false;
        return this.game.hero.hand.some((card: any) => card && !card.isWound?.());
    }

    hasPlayableCardWithStrong(): boolean {
        if (!this.game.hero?.hand) return false;
        const isNight = this.game.timeManager?.isNight?.() ?? false;
        return this.game.hero.hand.some(
            (card: any) =>
                card &&
                !card.isWound?.() &&
                Object.keys(card.strongEffect || {}).length > 0 &&
                this.game.hero.canAffordMana?.(card, isNight)
        );
    }

    canExplore(): boolean {
        const hex = this.game.hexGrid?.getHex(this.game.hero.position.q, this.game.hero.position.r);
        return !!hex?.site && !hex.site.conquered;
    }

    canVisit(): boolean {
        if (this.game.combat || this.game.movementMode || !this.game.hero?.position) return false;
        const hex = this.game.hexGrid?.getHex(this.game.hero.position.q, this.game.hero.position.r);
        return !!(hex?.site);
    }

    private playSelectedCard(strong: boolean): void {
        // This would be triggered by the card click handler
        // The action bar just shows the hint
    }

    private openSidewaysModal(): void {
        // Triggered by right-click on card
    }

    // First-time hint system
    showFirstTimeHint(key: string, element: HTMLElement, message: string, shortcut?: string): void {
        if (this.firstTimeHints.get(key)) return;
        this.firstTimeHints.set(key, true);

        const tooltip = this.createSmartTooltip(message, shortcut);
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;

        requestAnimationFrame(() => tooltip.classList.add('visible'));

        // Auto-hide after 8 seconds or on interaction
        const hide = () => {
            tooltip.classList.remove('visible');
            setTimeout(() => tooltip.remove(), 300);
            document.removeEventListener('click', hide);
            document.removeEventListener('keydown', hide);
        };
        setTimeout(hide, 8000);
        document.addEventListener('click', hide, { once: true });
        document.addEventListener('keydown', hide, { once: true });
    }

    private createSmartTooltip(message: string, shortcut?: string): HTMLElement {
        const tooltip = document.createElement('div');
        tooltip.className = 'smart-tooltip';
        tooltip.innerHTML = `
            <div class="smart-tooltip-content">
                <div class="tooltip-header">${message}</div>
                ${shortcut ? `<span class="shortcut-badge"><kbd>${shortcut}</kbd> ${t('ui.hints.shortcut')}</span>` : ''}
            </div>
        `;
        return tooltip;
    }

    render(): void {
        if (!this.container || !this.hintContainer) return;

        // Clear containers
        this.container.innerHTML = '';
        this.hintContainer.innerHTML = '';

        // Filter and sort actions
        const visibleActions = Array.from(this.registeredActions.values())
            .filter((action) => !action.showCondition || action.showCondition(this.game))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Render action buttons
        visibleActions.forEach((action) => {
            const btn = document.createElement('button');
            btn.className = `action-btn ${action.primary ? 'primary' : ''} ${action.danger ? 'danger' : ''}`;
            btn.dataset.actionId = action.id;
            // Stable id for tutorial / e2e that target the primary end-turn control
            if (action.id === 'end-turn') btn.id = 'action-bar-end-turn';
            btn.disabled = action.disabled ?? false;
            btn.onclick = action.onClick;

            // Accessibility + tooltip: combine label and shortcut into a single
            // hint so keyboard/screen-reader/touch users get the same context
            // as the visible label + kbd badge.
            const tooltipText = action.shortcut ? `${action.label} (${action.shortcut})` : action.label;
            btn.setAttribute('aria-label', tooltipText);
            btn.setAttribute('title', tooltipText);
            btn.setAttribute('data-tooltip', tooltipText);

            if (action.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'action-btn-icon';
                iconSpan.textContent = action.icon;
                btn.appendChild(iconSpan);
            }

            const labelSpan = document.createElement('span');
            labelSpan.textContent = action.label;
            btn.appendChild(labelSpan);

            if (action.shortcut) {
                const kbd = document.createElement('kbd');
                kbd.textContent = action.shortcut;
                btn.appendChild(kbd);
            }

            this.container!.appendChild(btn);
        });

        // Render contextual hints (subtle, non-interactive)
        this.renderHints();
    }

    private renderHints(): void {
        if (!this.hintContainer) return;

        const hints: HintItem[] = [];

        if (this.game.movementMode) {
            hints.push({
                label: t('ui.hints.moveHint'),
                shortcut: 'Klick Hex + Enter'
            });
        }

        if (this.game.combat) {
            const phase = this.game.combat.phase;
            if (phase === 'RANGED') {
                hints.push({ label: t('ui.hints.rangedHint'), shortcut: 'Space = Überspringen' });
            } else if (phase === 'BLOCK') {
                hints.push({ label: t('ui.hints.blockHint'), shortcut: 'Klick Karte = Blocken' });
            } else if (phase === 'ATTACK') {
                hints.push({ label: t('ui.hints.attackHint'), shortcut: 'Space = Angreifen' });
            }
        } else {
            if (this.hasPlayableCard() && !this.firstTimeHints.get('card-play')) {
                hints.push({ label: t('ui.hints.cardPlayHint'), shortcut: 'Klick = Basic, Shift+Klick = Strong' });
            }
            if (this.canExplore()) {
                hints.push({ label: t('ui.hints.exploreHint'), shortcut: 'E' });
            }
            if (this.game.manaPool?.length > 0) {
                hints.push({ label: t('ui.hints.manaHint'), shortcut: 'Klick Würfel' });
            }
        }

        if (this.game.hero?.wounds > 0 && this.game.canRest) {
            hints.push({ label: t('ui.hints.restHint'), shortcut: 'R' });
        }

        hints.forEach((hint) => {
            const item = document.createElement('span');
            item.className = 'hint-item';
            if (hint.shortcut) {
                const kbd = document.createElement('kbd');
                kbd.textContent = hint.shortcut;
                item.appendChild(kbd);
            }
            const label = document.createElement('span');
            label.textContent = hint.label;
            item.appendChild(label);
            this.hintContainer!.appendChild(item);
        });
    }
}
