/**
 * Contextual Action Bar + Coach Strip
 * One prioritized "what now?" message, combat phase stepper, action buttons.
 * Coach is clickable: highlights the suggested target (cards / buttons / board).
 */
import { t } from '../i18n/index.js';
import { eventBus } from '../eventBus.js';
import { COMBAT_PHASES, GAME_EVENTS } from '../constants.js';
import { confirmEndTurnIfNeeded } from './endTurnGuard.js';

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

/** What happens when the player clicks the coach strip */
export type CoachAction =
    | 'highlight-cards-block'
    | 'highlight-cards-attack'
    | 'highlight-cards-ranged'
    | 'highlight-cards-move'
    | 'highlight-end-turn'
    | 'highlight-heal'
    | 'highlight-rest'
    | 'highlight-visit'
    | 'highlight-board'
    | 'advance-ranged'
    | 'advance-block'
    | 'execute-attack'
    | 'none';

interface CoachMessage {
    text: string;
    icon?: string;
    tone?: 'info' | 'combat' | 'warn' | 'success';
    action?: CoachAction;
}

export class ActionBarManager {
    private game: any;
    private container: HTMLElement | null = null;
    private hintContainer: HTMLElement | null = null;
    private coachStrip: HTMLElement | null = null;
    private phaseStepper: HTMLElement | null = null;
    private registeredActions: Map<string, ActionButton> = new Map();
    private firstTimeHints: Map<string, boolean> = new Map();
    private currentPhase: string = 'exploration';
    private lastCoachAction: CoachAction = 'none';
    private coachClickBound = false;

    constructor(game: any) {
        this.game = game;
        this.init();
        this.registerDefaultActions();
        this.registerDefaultHints();
        this.bindEvents();
        // Initial paint once DOM is ready
        queueMicrotask(() => this.render());
    }

    private init(): void {
        this.container = document.getElementById('action-bar-content');
        this.hintContainer = document.getElementById('action-bar-hint');
        this.coachStrip = document.getElementById('coach-strip');
        this.phaseStepper = document.getElementById('combat-phase-stepper');
        if (!this.container || !this.hintContainer) {
            console.warn('[ActionBar] Container elements not found');
        }
    }

    private bindEvents(): void {
        const refresh = () => {
            this.render();
            this.refreshHandHighlights();
        };
        eventBus.on('game:stateChanged', refresh);
        eventBus.on('game:phaseChanged', (data: unknown) => {
            this.currentPhase = data as string;
            refresh();
        });
        eventBus.on(GAME_EVENTS.PHASE_CHANGED, refresh);
        eventBus.on('hero:statsChanged', refresh);
        eventBus.on('combat:phaseChanged', refresh);
        eventBus.on('movement:modeChanged', refresh);
        eventBus.on('card:selected', refresh);
        eventBus.on(GAME_EVENTS.CARD_PLAYED, refresh);
        eventBus.on(GAME_EVENTS.COMBAT_STARTED, refresh);
        eventBus.on(GAME_EVENTS.COMBAT_ENDED, refresh);
        eventBus.on(GAME_EVENTS.TURN_ENDED, refresh);
        eventBus.on(GAME_EVENTS.HERO_MOVED, refresh);
    }

    /** Re-paint hand so dim/relevant classes match combat phase */
    private refreshHandHighlights(): void {
        const ui = this.game?.ui;
        const hand = this.game?.hero?.hand;
        if (!ui?.handRenderer || !hand || !ui.handRenderer.callbacks?.onCardClick) return;
        try {
            ui.handRenderer.renderHandCards(
                hand,
                ui.handRenderer.callbacks.onCardClick,
                ui.handRenderer.callbacks.onCardRightClick || undefined
            );
        } catch {
            /* ignore mid-teardown */
        }
    }

    /** Normalize combat phase to lowercase constant values */
    combatPhase(): string {
        const p = this.game.combat?.phase;
        if (!p) return '';
        return String(p).toLowerCase();
    }

    private isCombatPhase(...phases: string[]): boolean {
        if (!this.game.combat) return false;
        const current = this.combatPhase();
        return phases.some((ph) => current === String(ph).toLowerCase());
    }

    private registerDefaultActions(): void {
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

        this.registerAction({
            id: 'combat-ranged',
            label: t('ui.actions.skipRanged'),
            icon: '🏹',
            shortcut: 'Space',
            onClick: () =>
                this.game.combatOrchestrator?.endRangedPhase?.() ||
                this.game.combat?.endRangedPhase?.(),
            showCondition: () => this.isCombatPhase(COMBAT_PHASES.RANGED, 'ranged', 'RANGED'),
            order: 10
        });

        this.registerAction({
            id: 'combat-block-done',
            label: t('ui.actions.skipBlock') || 'Block beenden',
            icon: '🛡️',
            shortcut: 'Space',
            onClick: () =>
                this.game.combatOrchestrator?.endBlockPhase?.() || this.game.combat?.endBlockPhase?.(),
            showCondition: () => this.isCombatPhase(COMBAT_PHASES.BLOCK, 'block', 'BLOCK'),
            order: 20
        });

        this.registerAction({
            id: 'combat-attack',
            label: t('ui.actions.attack'),
            icon: '⚔️',
            shortcut: 'Space',
            primary: true,
            onClick: () =>
                this.game.combatOrchestrator?.executeAttackAction?.() ||
                this.game.combatOrchestrator?.executeAttack?.(),
            showCondition: () => this.isCombatPhase(COMBAT_PHASES.ATTACK, 'attack', 'ATTACK'),
            order: 10
        });

        this.registerAction({
            id: 'combat-end',
            label: t('ui.actions.endCombat'),
            icon: '✓',
            shortcut: 'Space',
            primary: true,
            onClick: () =>
                this.game.combatOrchestrator?.endCombat?.() || this.game.combat?.endCombat?.(),
            showCondition: () => this.isCombatPhase(COMBAT_PHASES.COMPLETE, 'complete', 'COMPLETE'),
            order: 10
        });

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

        this.registerAction({
            id: 'end-turn',
            label: t('ui.buttons.endTurn'),
            icon: '⏭️',
            shortcut: 'Space',
            primary: true,
            onClick: () => {
                if (!confirmEndTurnIfNeeded(this.game)) return;
                this.game.endTurn?.();
            },
            showCondition: () =>
                !this.game.combat && !this.game.movementMode && this.game.canEndTurn !== false,
            order: 100
        });

        this.registerAction({
            id: 'rest',
            label: t('ui.buttons.rest'),
            icon: '🏕️',
            shortcut: 'R',
            onClick: () => this.game.rest?.(),
            showCondition: () =>
                !this.game.combat && !this.game.movementMode && this.game.canRest !== false,
            order: 110
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
        return !!hex?.site;
    }

    private handHasEffect(key: string): boolean {
        const hand = this.game.hero?.hand || [];
        return hand.some((c: any) => {
            if (!c || c.isWound?.()) return false;
            const b = c.basicEffect || {};
            const s = c.strongEffect || {};
            return !!(b[key] || s[key]);
        });
    }

    /**
     * Single prioritized coach message — the core "what now?" answer.
     */
    getCoachMessage(): CoachMessage {
        if (this.game.movementMode) {
            const mp = this.game.hero?.movementPoints ?? 0;
            const dangerHex = (this.game.reachableHexes || []).find((h: any) => h?.danger);
            if (dangerHex) {
                return {
                    icon: '⚔️',
                    text:
                        t('ui.coach.movementCombat', {
                            points: mp,
                            enemy: dangerHex.enemyName || t('ui.coach.enemyFallback') || 'Feind'
                        }) ||
                        `Bewegung (${mp} MP) — rote Hexes starten Kampf`,
                    tone: 'warn',
                    action: 'highlight-board'
                };
            }
            return {
                icon: '👣',
                text:
                    t('ui.coach.movement', { points: mp }) ||
                    `Bewegung: klicke ein erreichbares Hex (${mp} MP) · Zahl = Kosten`,
                tone: 'info',
                action: 'highlight-board'
            };
        }

        if (this.game.combat) {
            const phase = this.combatPhase();
            const orch = this.game.combatOrchestrator;
            const combat = this.game.combat;

            if (phase === COMBAT_PHASES.RANGED || phase === 'ranged') {
                const fortified = (combat.enemies || []).some((e: any) => e.fortified);
                const hasRanged = this.handHasRanged();
                return {
                    icon: '🏹',
                    text: fortified
                        ? t('ui.coach.rangedFortified') ||
                          'Fernkampf: 🏰 Befestigt braucht Belagerung — sonst Phase überspringen'
                        : t('ui.coach.ranged') ||
                          'Fernkampf: Fern-/Belagerungskarten oder Phase überspringen',
                    tone: 'combat',
                    action: hasRanged ? 'highlight-cards-ranged' : 'advance-ranged'
                };
            }
            if (phase === COMBAT_PHASES.BLOCK || phase === 'block') {
                const blockHave = orch?.combatBlockTotal ?? 0;
                let blockNeed = 0;
                let swift = false;
                (combat.enemies || []).forEach((e: any) => {
                    if (combat.blockedEnemies?.has(e.id)) return;
                    blockNeed +=
                        typeof e.getBlockRequirement === 'function' ? e.getBlockRequirement() : e.attack || 0;
                    if (e.swift) swift = true;
                });
                const prediction = combat.getPredictedOutcome?.(orch?.combatAttackTotal ?? 0, blockHave);
                const wounds = prediction?.expectedWounds ?? 0;
                if (blockNeed > 0) {
                    const outcome =
                        wounds > 0
                            ? t('ui.coach.blockWounds', { wounds }) || ` · sonst ${wounds} Wunden`
                            : t('ui.coach.blockSafe') || ' · sicher';
                    const enough = blockHave >= blockNeed;
                    return {
                        icon: '🛡️',
                        text:
                            t('ui.coach.blockProgress', {
                                have: blockHave,
                                need: blockNeed,
                                swift: swift ? t('ui.coach.swiftNote') || ' · 💨 2× Block' : '',
                                outcome
                            }) ||
                            `Block ${blockHave}/${blockNeed}${swift ? ' · 💨 2×' : ''}${outcome}`,
                        tone: enough ? 'success' : 'combat',
                        action: enough ? 'advance-block' : 'highlight-cards-block'
                    };
                }
                return {
                    icon: '🛡️',
                    text:
                        t('ui.coach.block') ||
                        'Block-Phase: spiele Block-Karten, dann Block beenden',
                    tone: 'combat',
                    action: 'highlight-cards-block'
                };
            }
            if (phase === COMBAT_PHASES.DAMAGE || phase === 'damage') {
                return {
                    icon: '💔',
                    text: t('ui.coach.damage') || 'Schaden wird verrechnet…',
                    tone: 'warn',
                    action: 'none'
                };
            }
            if (phase === COMBAT_PHASES.ATTACK || phase === 'attack') {
                const attackHave = orch?.combatAttackTotal ?? 0;
                const prediction = combat.getPredictedOutcome?.(attackHave, 0);
                const defeated = prediction?.enemiesDefeated || [];
                if (defeated.length > 0) {
                    return {
                        icon: '⚔️',
                        text:
                            t('ui.coach.attackCanDefeat', {
                                attack: attackHave,
                                names: defeated.join(', ')
                            }) || `Angriff ${attackHave} — besiegbar: ${defeated.join(', ')}`,
                        tone: 'success',
                        action: 'execute-attack'
                    };
                }
                return {
                    icon: '⚔️',
                    text:
                        t('ui.coach.attackProgress', { attack: attackHave }) ||
                        `Angriff ${attackHave} — spiele Angriffskarten, dann ausführen`,
                    tone: 'combat',
                    action: this.handHasEffect('attack') ? 'highlight-cards-attack' : 'execute-attack'
                };
            }
            if (phase === COMBAT_PHASES.COMPLETE || phase === 'complete') {
                return {
                    icon: '✓',
                    text: t('ui.coach.combatEnd') || 'Kampf vorbei — beenden',
                    tone: 'success',
                    action: 'execute-attack'
                };
            }
            return {
                icon: '⚔️',
                text: t('ui.coach.combat') || 'Kampf läuft',
                tone: 'combat',
                action: 'none'
            };
        }

        // Healing available
        if ((this.game.hero?.wounds || 0) > 0 && (this.game.hero?.healingPoints || 0) > 0) {
            return {
                icon: '💚',
                text: t('ui.coach.heal') || 'Du hast Heilung — nutze „Heilen“',
                tone: 'success',
                action: 'highlight-heal'
            };
        }

        if (this.canVisit() || this.canExplore()) {
            return {
                icon: '🏛️',
                text: t('ui.coach.site') || 'Du stehst an einem Ort — besuchen/erkunden',
                tone: 'info',
                action: 'highlight-visit'
            };
        }

        const mp = this.game.hero?.movementPoints ?? 0;
        if (mp > 0) {
            return {
                icon: '👣',
                text:
                    t('ui.coach.hasMp', { points: mp }) ||
                    `${mp} Bewegungspunkte — klicke ein erreichbares Hex`,
                tone: 'info',
                action: 'highlight-board'
            };
        }

        if (this.handHasEffect('movement')) {
            return {
                icon: '🎴',
                text:
                    t('ui.coach.playCards') ||
                    'Spiele Karten: 🟢 Bewegung · 🔴 Angriff · 🔵 Block · Rechtsklick = seitlich',
                tone: 'info',
                action: 'highlight-cards-move'
            };
        }

        if (this.handHasEffect('attack') || this.hasPlayableCard()) {
            return {
                icon: '🎴',
                text:
                    t('ui.coach.playCards') ||
                    'Spiele Karten: 🟢 Bewegung · 🔴 Angriff · 🔵 Block · Rechtsklick = seitlich',
                tone: 'info',
                action: 'highlight-cards-attack'
            };
        }

        if ((this.game.hero?.wounds || 0) > 0) {
            return {
                icon: '🏕️',
                text: t('ui.coach.rest') || 'Wunden? Rasten heilt und erneuert die Hand',
                tone: 'warn',
                action: 'highlight-rest'
            };
        }

        return {
            icon: '⏭️',
            text: t('ui.coach.endTurn') || 'Keine weiteren Züge? Zug beenden für neue Karten',
            tone: 'info',
            action: 'highlight-end-turn'
        };
    }

    private handHasRanged(): boolean {
        const hand = this.game.hero?.hand || [];
        return hand.some((c: any) => {
            if (!c || c.isWound?.()) return false;
            const b = c.basicEffect || {};
            const s = c.strongEffect || {};
            return !!(b.ranged || s.ranged || b.siege || s.siege);
        });
    }

    /**
     * Coach click → focus the recommended UI (or advance phase if already ready).
     */
    handleCoachClick(): void {
        const action = this.lastCoachAction || this.getCoachMessage().action || 'none';
        switch (action) {
            case 'highlight-cards-block':
                this.pulseRelevantCards('block');
                break;
            case 'highlight-cards-attack':
                this.pulseRelevantCards('attack');
                break;
            case 'highlight-cards-ranged':
                this.pulseRelevantCards('ranged');
                break;
            case 'highlight-cards-move':
                this.pulseRelevantCards('move');
                break;
            case 'highlight-end-turn':
                this.pulseElement(
                    document.getElementById('action-bar-end-turn') ||
                        document.querySelector('[data-action-id="end-turn"]')
                );
                break;
            case 'highlight-heal':
                this.pulseElement(
                    document.getElementById('action-bar-heal') ||
                        document.querySelector('[data-action-id="heal"]') ||
                        this.game.ui?.elements?.healBtn
                );
                break;
            case 'highlight-rest':
                this.pulseElement(
                    document.querySelector('[data-action-id="rest"]') || this.game.ui?.elements?.restBtn
                );
                break;
            case 'highlight-visit':
                this.pulseElement(
                    document.querySelector('[data-action-id="visit"]') ||
                        document.getElementById('visit-btn')
                );
                break;
            case 'highlight-board':
                this.pulseElement(document.getElementById('game-board') || this.game.canvas);
                if (!this.game.movementMode && (this.game.hero?.movementPoints ?? 0) > 0) {
                    this.game.actionManager?.enterMovementMode?.();
                }
                break;
            case 'advance-ranged':
                this.game.combatOrchestrator?.endRangedPhase?.();
                break;
            case 'advance-block':
                this.game.combatOrchestrator?.endBlockPhase?.();
                break;
            case 'execute-attack':
                this.game.combatOrchestrator?.executeAttackAction?.();
                break;
            default:
                break;
        }
    }

    private pulseRelevantCards(kind: 'block' | 'attack' | 'ranged' | 'move'): void {
        const handRoot = document.getElementById('hand-cards');
        if (!handRoot) return;
        const cards = handRoot.querySelectorAll('.mk-card');
        const hand = this.game.hero?.hand || [];
        cards.forEach((el, index) => {
            const card = hand[index];
            if (!card || card.isWound?.()) return;
            const b = card.basicEffect || {};
            const s = card.strongEffect || {};
            let match = false;
            if (kind === 'block') match = !!(b.block || s.block);
            if (kind === 'attack')
                match = !!(b.attack || s.attack || b.ranged || s.ranged || b.siege || s.siege);
            if (kind === 'ranged') match = !!(b.ranged || s.ranged || b.siege || s.siege);
            if (kind === 'move') match = !!(b.movement || s.movement);
            if (match) {
                el.classList.add('mk-card--coach-pulse');
                setTimeout(() => el.classList.remove('mk-card--coach-pulse'), 1600);
            }
        });
        // Scroll first relevant into view
        const first = handRoot.querySelector('.mk-card--coach-pulse, .mk-card--relevant');
        if (first && 'scrollIntoView' in first) {
            (first as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    private pulseElement(el: Element | null | undefined): void {
        if (!el) return;
        const htmlEl = el as HTMLElement;
        htmlEl.classList.add('coach-target-pulse');
        htmlEl.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => htmlEl.classList.remove('coach-target-pulse'), 1600);
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
        if (!this.container) return;

        this.container.innerHTML = '';
        if (this.hintContainer) this.hintContainer.innerHTML = '';

        this.renderCoach();
        this.renderPhaseStepper();

        const visibleActions = Array.from(this.registeredActions.values())
            .filter((action) => !action.showCondition || action.showCondition(this.game))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Prefer one primary + up to 2 secondary buttons (less noise)
        let primarySeen = 0;
        const limited = visibleActions.filter((a) => {
            if (a.primary) {
                primarySeen++;
                return primarySeen <= 2;
            }
            return true;
        }).slice(0, 5);

        limited.forEach((action) => {
            const btn = document.createElement('button');
            btn.className = `action-btn ${action.primary ? 'primary' : ''} ${action.danger ? 'danger' : ''}`;
            btn.dataset.actionId = action.id;
            if (action.id === 'end-turn') btn.id = 'action-bar-end-turn';
            btn.disabled = action.disabled ?? false;
            btn.onclick = action.onClick;

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

        this.renderSecondaryHint();
    }

    private renderCoach(): void {
        if (!this.coachStrip) return;
        const msg = this.getCoachMessage();
        this.lastCoachAction = msg.action || 'none';
        const clickable = this.lastCoachAction !== 'none';

        this.coachStrip.className = `coach-strip coach-strip--${msg.tone || 'info'}${
            clickable ? ' coach-strip--clickable' : ''
        }`;
        this.coachStrip.innerHTML = '';
        this.coachStrip.setAttribute('role', clickable ? 'button' : 'status');
        this.coachStrip.setAttribute('tabindex', clickable ? '0' : '-1');
        const hint = clickable
            ? t('ui.coach.clickHint') || 'Klicken zum Hervorheben / Ausführen'
            : '';
        this.coachStrip.setAttribute(
            'aria-label',
            hint ? `${msg.text}. ${hint}` : msg.text
        );
        this.coachStrip.title = hint || msg.text;

        if (msg.icon) {
            const icon = document.createElement('span');
            icon.className = 'coach-strip-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = msg.icon;
            this.coachStrip.appendChild(icon);
        }

        const text = document.createElement('span');
        text.className = 'coach-strip-text';
        text.textContent = msg.text;
        this.coachStrip.appendChild(text);

        if (clickable) {
            const cue = document.createElement('span');
            cue.className = 'coach-strip-cue';
            cue.setAttribute('aria-hidden', 'true');
            cue.textContent = '↵';
            this.coachStrip.appendChild(cue);
        }

        if (!this.coachClickBound) {
            this.coachClickBound = true;
            this.coachStrip.addEventListener('click', () => this.handleCoachClick());
            this.coachStrip.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCoachClick();
                }
            });
        }
    }

    private renderPhaseStepper(): void {
        if (!this.phaseStepper) return;

        if (!this.game.combat) {
            this.phaseStepper.hidden = true;
            this.phaseStepper.setAttribute('aria-hidden', 'true');
            this.phaseStepper.innerHTML = '';
            return;
        }

        this.phaseStepper.hidden = false;
        this.phaseStepper.setAttribute('aria-hidden', 'false');
        this.phaseStepper.setAttribute('role', 'list');
        this.phaseStepper.setAttribute('aria-label', 'Kampfphasen');

        const current = this.combatPhase();
        const steps = [
            { id: COMBAT_PHASES.RANGED, label: t('ui.phases.ranged') || 'Fern', icon: '🏹' },
            { id: COMBAT_PHASES.BLOCK, label: t('ui.phases.block') || 'Block', icon: '🛡️' },
            { id: COMBAT_PHASES.ATTACK, label: t('ui.phases.attack') || 'Angriff', icon: '⚔️' },
            { id: COMBAT_PHASES.COMPLETE, label: 'Ende', icon: '✓' }
        ];

        // Map damage into block→attack progression visually
        const order = [COMBAT_PHASES.RANGED, COMBAT_PHASES.BLOCK, COMBAT_PHASES.DAMAGE, COMBAT_PHASES.ATTACK, COMBAT_PHASES.COMPLETE];
        const currentIdx = Math.max(0, order.indexOf(current as any));

        this.phaseStepper.innerHTML = steps
            .map((step, i) => {
                // Map visual index: 0 ranged, 1 block, 2 attack, 3 end
                const visualOrder = [0, 1, 3, 4]; // indices in `order`
                const stepOrderIdx = visualOrder[i];
                let state = 'upcoming';
                if (stepOrderIdx < currentIdx) state = 'done';
                if (step.id === current || (current === COMBAT_PHASES.DAMAGE && step.id === COMBAT_PHASES.BLOCK)) {
                    state = 'current';
                }
                if (current === COMBAT_PHASES.DAMAGE && step.id === COMBAT_PHASES.ATTACK) {
                    state = 'upcoming';
                }
                return `<div class="combat-step combat-step--${state}" role="listitem" data-phase="${step.id}">
                    <span class="combat-step-icon" aria-hidden="true">${step.icon}</span>
                    <span class="combat-step-label">${step.label}</span>
                </div>`;
            })
            .join('<span class="combat-step-arrow" aria-hidden="true">→</span>');
    }

    private renderSecondaryHint(): void {
        if (!this.hintContainer) return;

        // Only one short secondary line — avoid stacking
        let hint = '';
        if (this.game.combat) {
            const phase = this.combatPhase();
            if (phase === COMBAT_PHASES.BLOCK || phase === 'block') {
                hint = t('ui.hints.blockHint') || 'Blockkarten sind hervorgehoben';
            } else if (phase === COMBAT_PHASES.ATTACK || phase === 'attack') {
                hint = t('ui.hints.attackHint') || 'Angriffskarten sind hervorgehoben';
            } else if (phase === COMBAT_PHASES.RANGED || phase === 'ranged') {
                hint = t('ui.hints.rangedHint') || 'Space = Phase überspringen';
            }
        } else if ((this.game.hero?.movementPoints ?? 0) === 0 && this.handHasEffect('movement')) {
            hint = t('ui.hints.cardPlayHint') || 'Grün = Bewegung · Shift+Klick = Stark';
        }

        if (!hint) return;
        const item = document.createElement('span');
        item.className = 'hint-item';
        item.textContent = hint;
        this.hintContainer.appendChild(item);
    }
}
