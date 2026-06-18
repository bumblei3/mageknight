/**
 * Combat Phase Indicator Component
 * Clear visual indication of current combat phase with actions
 * Keyboard accessible, screen reader friendly
 */

import './PhaseIndicator.css';
import { COMBAT_PHASES } from '../../constants';

export interface PhaseIndicatorProps {
    /** Current combat phase */
    phase: string;
    /** Available phases in order */
    allPhases?: string[];
    /** Whether in combat */
    inCombat?: boolean;
    /** Callback when phase change requested (via button) */
    onPhaseChange?: (phase: string) => void;
    /** Custom class */
    className?: string;
    /** Element ID */
    id?: string;
    /** Show action buttons for each phase */
    showActions?: boolean;
    /** Button texts (i18n) */
    labels?: {
        ranged?: string;
        block?: string;
        attack?: string;
        endCombat?: string;
        endRanged?: string;
        endBlock?: string;
        executeAttack?: string;
    };
}

/** Creates a phase indicator element */
export function createPhaseIndicator(props: PhaseIndicatorProps): HTMLElement {
    const {
        phase,
        allPhases = [COMBAT_PHASES.RANGED, COMBAT_PHASES.BLOCK, COMBAT_PHASES.DAMAGE, COMBAT_PHASES.ATTACK],
        inCombat = true,
        onPhaseChange,
        className = '',
        id,
        showActions = true,
        labels = {}
    } = props;

    const defaultLabels = {
        ranged: 'Fernkampf',
        block: 'Blocken',
        attack: 'Angriff',
        endCombat: 'Kampf beenden',
        endRanged: 'Fernkampf beenden → Blocken',
        endBlock: 'Blocken beenden → Schaden',
        executeAttack: 'Angriff ausführen'
    };
    const l = { ...defaultLabels, ...labels };

    const container = document.createElement('div');
    if (id) container.id = id;
    container.className = `mk-phase-indicator ${inCombat ? '' : 'mk-phase-indicator--inactive'} ${className}`;
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Kampfphasen');
    container.setAttribute('aria-live', 'polite');

    // Build phase indicator
    container.innerHTML = buildPhaseHTML({
        phase,
        allPhases,
        inCombat,
        l,
        showActions
    });

    // Event handlers for action buttons
    if (showActions && onPhaseChange) {
        container.querySelectorAll('[data-phase-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPhase = btn.getAttribute('data-phase-action');
                if (targetPhase) onPhaseChange(targetPhase);
            });
        });
    }

    return container;
}

function buildPhaseHTML(params: {
    phase: string;
    allPhases: string[];
    inCombat: boolean;
    l: any;
    showActions: boolean;
}): string {
    const { phase, allPhases, inCombat, l, showActions } = params;

    const phaseInfo: Record<string, { icon: string; label: string; color: string; description: string }> = {
        [COMBAT_PHASES.RANGED]: {
            icon: '🏹',
            label: l.ranged,
            color: '#3b82f6',
            description: 'Spiele Angriffs- & Belagerungskarten. Feinde können nicht kontern.'
        },
        [COMBAT_PHASES.BLOCK]: {
            icon: '🛡',
            label: l.block,
            color: '#10b981',
            description: 'Blocke Feindangriffe. Element beachten: Feuer→Eis, Eis→Feuer.'
        },
        [COMBAT_PHASES.DAMAGE]: {
            icon: '💥',
            label: 'Schaden',
            color: '#ef4444',
            description: 'weise Schaden zu. Ungeblockte Feinde verletzen dich.'
        },
        [COMBAT_PHASES.ATTACK]: {
            icon: '⚔',
            label: l.attack,
            color: '#fbbf24',
            description: 'Greife an! Spiele Angriffskarten um Feinde zu besiegen.'
        },
        [COMBAT_PHASES.NOT_IN_COMBAT]: {
            icon: '✌',
            label: 'Erkundung',
            color: '#6b7280',
            description: 'Kein Kampf. Bewege dich, erkunde, interagiere mit Orten.'
        }
    };

    const currentPhaseInfo = phaseInfo[phase] || phaseInfo[COMBAT_PHASES.NOT_IN_COMBAT];
    const phaseOrder = allPhases.filter(p => phaseInfo[p]);

    let html = '';

    // Phase progress bar (desktop)
    if (inCombat && phaseOrder.length > 1) {
        html += '<div class="mk-phase__progress" aria-hidden="true">';
        phaseOrder.forEach((p, i) => {
            const info = phaseInfo[p];
            const isActive = p === phase;
            const isCompleted = phaseOrder.indexOf(phase) > i;
            html += `
                <div class="mk-phase__step ${isActive ? 'mk-phase__step--active' : ''} ${isCompleted ? 'mk-phase__step--completed' : ''}" 
                     style="--step-color: ${info.color};">
                    <div class="mk-phase__step-icon" aria-hidden="true">${info.icon}</div>
                    <div class="mk-phase__step-label">${info.label}</div>
                    ${i < phaseOrder.length - 1 ? '<div class="mk-phase__step-connector"></div>' : ''}
                </div>
            `;
        });
        html += '</div>';
    }

    // Current phase highlight
    html += `
        <div class="mk-phase__current" style="--phase-color: ${currentPhaseInfo.color};" aria-current="step">
            <div class="mk-phase__current-header">
                <span class="mk-phase__current-icon" aria-hidden="true">${currentPhaseInfo.icon}</span>
                <span class="mk-phase__current-label">${currentPhaseInfo.label}</span>
            </div>
            <div class="mk-phase__current-desc">${currentPhaseInfo.description}</div>
        </div>
    `;

    // Action buttons
    if (showActions && inCombat) {
        html += '<div class="mk-phase__actions">';
        
        if (phase === COMBAT_PHASES.RANGED) {
            html += `
                <button type="button" 
                        class="mk-btn mk-btn--primary mk-btn--md" 
                        data-phase-action="${COMBAT_PHASES.BLOCK}"
                        aria-label="${l.endRanged}">
                    ${l.endRanged}
                </button>
            `;
        } else if (phase === COMBAT_PHASES.BLOCK) {
            html += `
                <button type="button" 
                        class="mk-btn mk-btn--primary mk-btn--md" 
                        data-phase-action="${COMBAT_PHASES.DAMAGE}"
                        aria-label="${l.endBlock}">
                    ${l.endBlock}
                </button>
            `;
        } else if (phase === COMBAT_PHASES.DAMAGE) {
            html += `
                <button type="button" 
                        class="mk-btn mk-btn--primary mk-btn--md" 
                        data-phase-action="${COMBAT_PHASES.ATTACK}"
                        aria-label="${l.executeAttack}">
                    ${l.executeAttack}
                </button>
            `;
        } else if (phase === COMBAT_PHASES.ATTACK) {
            html += `
                <button type="button" 
                        class="mk-btn mk-btn--success mk-btn--md" 
                        data-phase-action="${COMBAT_PHASES.NOT_IN_COMBAT}"
                        aria-label="${l.endCombat}">
                    ${l.endCombat}
                </button>
            `;
        }
        
        html += '</div>';
    }

    // Not in combat state
    if (!inCombat) {
        html += '<div class="mk-phase__peace">⚔ Kein aktiver Kampf</div>';
    }

    return html;
}

/** Updates the phase indicator dynamically */
export function updatePhaseIndicator(
    container: HTMLElement, 
    newPhase: string, 
    inCombat: boolean = true
): void {
    const phaseInfo: Record<string, { icon: string; label: string; color: string; description: string }> = {
        [COMBAT_PHASES.RANGED]: { icon: '🏹', label: 'Fernkampf', color: '#3b82f6', description: 'Spiele Angriffs- & Belagerungskarten. Feinde können nicht kontern.' },
        [COMBAT_PHASES.BLOCK]: { icon: '🛡', label: 'Blocken', color: '#10b981', description: 'Blocke Feindangriffe. Element beachten: Feuer→Eis, Eis→Feuer.' },
        [COMBAT_PHASES.DAMAGE]: { icon: '💥', label: 'Schaden', color: '#ef4444', description: 'Weise Schaden zu. Ungeblockte Feinde verletzen dich.' },
        [COMBAT_PHASES.ATTACK]: { icon: '⚔', label: 'Angriff', color: '#fbbf24', description: 'Greife an! Spiele Angriffskarten um Feinde zu besiegen.' },
        [COMBAT_PHASES.NOT_IN_COMBAT]: { icon: '✌', label: 'Erkundung', color: '#6b7280', description: 'Kein Kampf. Bewege dich, erkunde, interagiere mit Orten.' }
    };

    const info = phaseInfo[newPhase] || phaseInfo[COMBAT_PHASES.NOT_IN_COMBAT];

    // Update progress steps
    container.querySelectorAll('.mk-phase__step').forEach((step, i) => {
        const stepPhase = Array.from(container.querySelectorAll('.mk-phase__step')).findIndex(s => s === step);
        // We need a different approach - let's use data attributes
    });

    // Better: use data-phase on steps
    container.querySelectorAll('.mk-phase__step').forEach(step => {
        const stepPhase = step.getAttribute('data-phase');
        if (!stepPhase) return;
        
        const isActive = stepPhase === newPhase;
        const isCompleted = getPhaseOrder().indexOf(newPhase) > getPhaseOrder().indexOf(stepPhase);
        
        step.classList.toggle('mk-phase__step--active', isActive);
        step.classList.toggle('mk-phase__step--completed', isCompleted);
        step.classList.toggle('mk-phase__step--upcoming', !isActive && !isCompleted);
    });

    // Update current phase display
    const currentEl = container.querySelector('.mk-phase__current') as HTMLElement;
    if (currentEl) {
        currentEl.style.setProperty('--phase-color', info.color);
        const iconEl = currentEl.querySelector('.mk-phase__current-icon');
        const labelEl = currentEl.querySelector('.mk-phase__current-label');
        const descEl = currentEl.querySelector('.mk-phase__current-desc');
        if (iconEl) iconEl.textContent = info.icon;
        if (labelEl) labelEl.textContent = info.label;
        if (descEl) descEl.textContent = info.description;
    }

    // Update active/inactive state
    container.classList.toggle('mk-phase-indicator--inactive', !inCombat);

    // Update action buttons - replace them
    const actionsContainer = container.querySelector('.mk-phase__actions');
    if (actionsContainer) {
        actionsContainer.innerHTML = buildActionButtons(newPhase, inCombat);
    }
}

function getPhaseOrder(): string[] {
    return [COMBAT_PHASES.RANGED, COMBAT_PHASES.BLOCK, COMBAT_PHASES.DAMAGE, COMBAT_PHASES.ATTACK];
}

function buildActionButtons(phase: string, inCombat: boolean): string {
    if (!inCombat) return '';
    
    const labels = {
        endRanged: 'Fernkampf beenden → Blocken',
        endBlock: 'Blocken beenden → Schaden',
        executeAttack: 'Angriff ausführen',
        endCombat: 'Kampf beenden'
    };

    if (phase === COMBAT_PHASES.RANGED) {
        return `<button type="button" class="mk-btn mk-btn--primary mk-btn--md" data-phase-action="${COMBAT_PHASES.BLOCK}">${labels.endRanged}</button>`;
    } else if (phase === COMBAT_PHASES.BLOCK) {
        return `<button type="button" class="mk-btn mk-btn--primary mk-btn--md" data-phase-action="${COMBAT_PHASES.DAMAGE}">${labels.endBlock}</button>`;
    } else if (phase === COMBAT_PHASES.DAMAGE) {
        return `<button type="button" class="mk-btn mk-btn--primary mk-btn--md" data-phase-action="${COMBAT_PHASES.ATTACK}">${labels.executeAttack}</button>`;
    } else if (phase === COMBAT_PHASES.ATTACK) {
        return `<button type="button" class="mk-btn mk-btn--success mk-btn--md" data-phase-action="${COMBAT_PHASES.NOT_IN_COMBAT}">${labels.endCombat}</button>`;
    }
    return '';
}

/** Injects a new PhaseIndicator into a container, replacing old one */
export function renderPhaseIndicator(
    container: HTMLElement,
    props: any
): void {
    container.innerHTML = '';
    const indicator = createPhaseIndicator(props);
    container.appendChild(indicator);
}