/**
 * Undo/Redo Manager
 * Separates undo/redo logic from ActionManager
 * Provides keyboard shortcuts, toolbar button, and redo functionality
 */

import { GAME_EVENTS } from '../../constants';
import { eventBus } from '../../eventBus';
import { logger } from '../../logger';
import { createButton, ButtonPatterns } from '../../ui/components';

export interface GameStateSnapshot {
    hero: any;
    mana: any;
    timestamp: number;
    combat?: any;
    orchestrator?: {
        attackTotal: number;
        blockTotal: number;
        activeBlocks: any[];
        rangedTotal: number;
        siegeTotal: number;
    };
    // Track what type of action this was for UI context
    actionType?:
        | 'move'
        | 'playCard'
        | 'endTurn'
        | 'explore'
        | 'combat'
        | 'site'
        | 'recruit'
        | 'heal'
        | 'rest'
        | 'other';
    description?: string;
}

export interface UndoRedoState {
    canUndo: boolean;
    canRedo: boolean;
    undoDescription?: string;
    redoDescription?: string;
}

export class UndoManager {
    private game: any;
    private undoStack: GameStateSnapshot[] = [];
    private redoStack: GameStateSnapshot[] = [];
    private readonly MAX_HISTORY: number = 30;
    private undoButton: HTMLButtonElement | null = null;
    private redoButton: HTMLButtonElement | null = null;
    private stateDisplay: HTMLElement | null = null;
    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private phaseChangeHandler: (() => void) | null = null;

    constructor(game: any) {
        this.game = game;
        // Initialize from ActionManager if it has history
        this.initializeFromActionManager();
        this.bindKeyboardShortcuts();
        this.createToolbarButtons();

        // Store handler for cleanup
        this.phaseChangeHandler = () => this.createToolbarButtons();
        eventBus.on(GAME_EVENTS.PHASE_CHANGED, this.phaseChangeHandler);
    }

    private initializeFromActionManager(): void {
        if (this.game.actionManager && this.game.actionManager.history) {
            this.undoStack = [...this.game.actionManager.history];
            // Clear ActionManager's history to avoid duplication
            this.game.actionManager.history = [];
        }
    }

    // ========== Public API ==========

    /** Save current state before an action - call BEFORE executing action */
    saveState(actionType: GameStateSnapshot['actionType'] = 'other', description?: string): void {
        if (this.game.isTestEnvironment) return;

        const snapshot: GameStateSnapshot = {
            hero: this.game.hero?.getState?.() ?? {},
            mana: this.game.manaSource?.getState?.() ?? {},
            timestamp: Date.now(),
            actionType,
            description
        };

        // Include combat state if in combat
        if (this.game.combat) {
            snapshot.combat = this.game.combat.getState?.();
            if (this.game.combatOrchestrator) {
                snapshot.orchestrator = {
                    attackTotal: this.game.combatOrchestrator.combatAttackTotal ?? 0,
                    blockTotal: this.game.combatOrchestrator.combatBlockTotal ?? 0,
                    activeBlocks: [...(this.game.combatOrchestrator.activeBlocks || [])],
                    rangedTotal: this.game.combatOrchestrator.combatRangedTotal ?? 0,
                    siegeTotal: this.game.combatOrchestrator.combatSiegeTotal ?? 0
                };
            }
        }

        this.undoStack.push(snapshot);
        this.redoStack = []; // Clear redo stack on new action

        // Limit history size
        if (this.undoStack.length > this.MAX_HISTORY) {
            this.undoStack.shift();
        }

        this.updateUI();
        logger.debug(`State saved: ${actionType} - ${description || 'unnamed'}`);
    }

    /** Undo the last action */
    undo(): boolean {
        if (this.undoStack.length === 0) {
            this.game.showToast?.('Nichts zum Rückgängig machen.', 'info');
            return false;
        }

        const snapshot = this.undoStack.pop()!;
        this.redoStack.push(snapshot);

        // Prevent undoing across combat boundaries
        if (this.game.combat && !snapshot.combat) {
            this.game.showToast?.('Kann nicht über Kampf-Grenzen hinweg rückgängig machen.', 'error');
            // Put it back
            this.undoStack.push(snapshot);
            this.redoStack.pop();
            return false;
        }

        if (this.restoreSnapshot(snapshot)) {
            this.game.addLog?.('Aktion rückgängig gemacht.', 'info');
            this.game.showToast?.('Rückgängig gemacht', 'info');
            this.updateUI();
            eventBus.emit(GAME_EVENTS.TURN_STARTED, { undo: true });
            return true;
        }

        // Restore failed - put back
        this.undoStack.push(snapshot);
        this.redoStack.pop();
        return false;
    }

    /** Redo the last undone action */
    redo(): boolean {
        if (this.redoStack.length === 0) {
            this.game.showToast?.('Nichts zum Wiederholen.', 'info');
            return false;
        }

        const snapshot = this.redoStack.pop()!;

        // Prevent redoing into combat if not in combat
        if (!this.game.combat && snapshot.combat) {
            this.game.showToast?.('Kann nicht in Kampf zurückkehren.', 'error');
            this.redoStack.push(snapshot);
            return false;
        }

        if (this.restoreSnapshot(snapshot)) {
            this.undoStack.push(snapshot);
            this.game.addLog?.('Aktion wiederholt.', 'info');
            this.game.showToast?.('Wiederholt', 'info');
            this.updateUI();
            eventBus.emit(GAME_EVENTS.TURN_STARTED, { redo: true });
            return true;
        }

        // Restore failed - put back
        this.redoStack.push(snapshot);
        return false;
    }

    /** Get current undo/redo state for UI */
    getState(): UndoRedoState {
        const undo = this.undoStack[this.undoStack.length - 1];
        const redo = this.redoStack[this.redoStack.length - 1];
        return {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0,
            undoDescription: undo?.description || undo?.actionType,
            redoDescription: redo?.description || redo?.actionType
        };
    }

    /** Clear all history (e.g., on new game, exploration) */
    clearHistory(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUI();
    }

    /** Check if we can undo across current context */
    canUndo(): boolean {
        if (this.undoStack.length === 0) return false;
        const snapshot = this.undoStack[this.undoStack.length - 1];
        return !(this.game.combat && !snapshot.combat);
    }

    canRedo(): boolean {
        if (this.redoStack.length === 0) return false;
        const snapshot = this.redoStack[this.redoStack.length - 1];
        return !(!this.game.combat && snapshot.combat);
    }

    // ========== Private Methods ==========

    private restoreSnapshot(snapshot: GameStateSnapshot): boolean {
        try {
            // Restore hero state
            if (this.game.hero && snapshot.hero) {
                this.game.hero.loadState(snapshot.hero);
            }

            // Restore mana state
            if (this.game.manaSource && snapshot.mana) {
                this.game.manaSource.loadState(snapshot.mana);
            }

            // Restore combat state if applicable
            if (this.game.combat && snapshot.combat) {
                this.game.combat.loadState(snapshot.combat);
            }

            // Restore combat orchestrator state
            if (this.game.combatOrchestrator && snapshot.orchestrator) {
                const orch = this.game.combatOrchestrator;
                orch.combatAttackTotal = snapshot.orchestrator.attackTotal;
                orch.combatBlockTotal = snapshot.orchestrator.blockTotal;
                orch.activeBlocks = [...snapshot.orchestrator.activeBlocks];
                orch.combatRangedTotal = snapshot.orchestrator.rangedTotal;
                orch.combatSiegeTotal = snapshot.orchestrator.siegeTotal;

                orch.updateCombatInfo?.();
                orch.renderUnitsInCombat?.();
            }

            // Full UI re-render
            this.game.render?.();
            this.game.renderHand?.();
            this.game.renderMana?.();
            this.game.updateStats?.();

            // Handle movement mode
            if (this.game.hero?.movementPoints > 0 && !this.game.combat && this.game.actionManager?.enterMovementMode) {
                this.game.actionManager.enterMovementMode();
            } else if (!this.game.combat && this.game.actionManager?.exitMovementMode) {
                this.game.actionManager.exitMovementMode();
            }

            return true;
        } catch (e) {
            logger.error('Failed to restore snapshot:', e);
            this.game.showToast?.('Fehler beim Wiederherstellen.', 'error');
            return false;
        }
    }

    // ========== Keyboard Shortcuts ==========

    private bindKeyboardShortcuts(): void {
        this.boundKeyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
        document.addEventListener('keydown', this.boundKeyHandler);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // Ignore if typing in input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Ctrl+Z / Cmd+Z = Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Ctrl+Y / Cmd+Y / Ctrl+Shift+Z = Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            this.redo();
        }
    }

    unbindKeyboardShortcuts(): void {
        if (this.boundKeyHandler) {
            document.removeEventListener('keydown', this.boundKeyHandler);
            this.boundKeyHandler = null;
        }
    }

    // ========== Toolbar Buttons ==========

    private createToolbarButtons(): void {
        if (typeof document === 'undefined') return;
        const checkToolbar = () => {
            if (typeof document === 'undefined') return;
            // If a statically-declared #undo-btn exists, attach redo/state next
            // to it so the controls stay grouped. Otherwise fall back to a
            // self-created container anchored in the header.
            const existingUndo = document.getElementById('undo-btn');
            const toolbar =
                document.getElementById('action-toolbar') ||
                document.getElementById('toolbar') ||
                (existingUndo ? existingUndo.parentElement : null) ||
                this.ensureToolbarContainer();
            if (toolbar) {
                this.injectButtons(toolbar);
            }
        };

        checkToolbar();
    }

    /**
     * Create a visible, clickable toolbar container if none exists in the DOM.
     * The undo/redo buttons must live outside the canvas-only `.bottom-dock`
     * (which has `pointer-events: none`), so we anchor them in the always-on
     * `.hud-top-bar` header. Returns the container, or null if even that
     * anchor is unavailable.
     */
    private ensureToolbarContainer(): HTMLElement | null {
        if (typeof document === 'undefined') return null;
        let container = document.getElementById('action-toolbar');
        if (container) return container;

        container = document.createElement('div');
        container.id = 'action-toolbar';
        container.className = 'action-toolbar';

        const anchor = document.querySelector('.header-controls') || document.querySelector('.hud-top-bar');
        if (anchor) {
            anchor.insertBefore(container, anchor.firstChild);
        } else {
            document.body.appendChild(container);
        }
        return container;
    }

    private injectButtons(toolbar: HTMLElement): void {
        if (this.undoButton || this.redoButton) return; // Already created

        // Prefer the statically-declared button in index.html (class "btn-icon",
        // id "undo-btn") over creating a duplicate. A duplicate would produce
        // two elements with the same id (invalid DOM) and split the click wiring.
        const existingUndo = document.getElementById('undo-btn') as HTMLButtonElement | null;
        if (existingUndo) {
            this.undoButton = existingUndo;
        } else {
            this.undoButton = ButtonPatterns.icon('↩', () => this.undo(), 'Rückgängig (Ctrl+Z)', 'ghost', 'sm');
            this.undoButton.id = 'undo-btn';
            this.undoButton.setAttribute('aria-label', 'Rückgängig machen (Ctrl+Z)');
        }

        // Create redo button (no static declaration exists)
        this.redoButton = ButtonPatterns.icon('↪', () => this.redo(), 'Wiederholen (Ctrl+Y)', 'ghost', 'sm');
        this.redoButton.id = 'redo-btn';
        this.redoButton.setAttribute('aria-label', 'Wiederholen (Ctrl+Y / Ctrl+Shift+Z)');

        // Create state display
        this.stateDisplay = document.createElement('span');
        this.stateDisplay.id = 'undo-redo-state';
        this.stateDisplay.className = 'undo-redo-state';
        this.stateDisplay.setAttribute('aria-live', 'polite');
        this.stateDisplay.style.cssText = `
            font-size: 0.7rem;
            color: #9ca3af;
            margin: 0 8px;
            min-width: 80px;
            text-align: center;
        `;

        // Add to toolbar
        const group = document.createElement('div');
        group.className = 'mk-btn-group undo-redo-group';
        group.style.display = 'flex';
        group.style.alignItems = 'center';
        group.style.gap = '4px';
        group.appendChild(this.undoButton);
        group.appendChild(this.redoButton);
        group.appendChild(this.stateDisplay);
        toolbar.appendChild(group);

        this.updateUI();
    }

    private updateUI(): void {
        const state = this.getState();

        // Update buttons
        if (this.undoButton) {
            this.undoButton.disabled = !state.canUndo;
            this.undoButton.classList.toggle('mk-btn--disabled', !state.canUndo);
            if (state.undoDescription) {
                this.undoButton.title = `Rückgängig: ${state.undoDescription} (Ctrl+Z)`;
            }
        }

        if (this.redoButton) {
            this.redoButton.disabled = !state.canRedo;
            this.redoButton.classList.toggle('mk-btn--disabled', !state.canRedo);
            if (state.redoDescription) {
                this.redoButton.title = `Wiederholen: ${state.redoDescription} (Ctrl+Y)`;
            }
        }

        // Update state display with action history icons
        this.updateHistoryDisplay();

        // Legacy support
        if (this.game.actionManager?.updateUndoUI) {
            this.game.actionManager.updateUndoUI();
        }
    }

    /** Update the undo history display showing last 5 actions as icons */
    private updateHistoryDisplay(): void {
        if (!this.stateDisplay) return;

        const state = this.getState();
        if (!state.canUndo && !state.canRedo) {
            this.stateDisplay.textContent = '';
            this.stateDisplay.innerHTML = '';
            return;
        }

        // Build history list (last 5 undoable actions)
        const historyItems = this.undoStack.slice(-5);
        const total = this.undoStack.length;

        // Create icon list
        const container = document.createElement('div');
        container.className = 'undo-history-bar';
        container.style.cssText = 'display:flex;gap:2px;align-items:center;';

        historyItems.forEach((item, i) => {
            const icon = document.createElement('span');
            icon.className = 'undo-history-icon';
            icon.textContent = this.getActionIcon(item.actionType);
            icon.title = item.description || item.actionType || 'Aktion';
            icon.style.cssText = `
                font-size: 0.65rem;
                opacity: ${0.4 + (i / historyItems.length) * 0.6};
                cursor: default;
            `;
            container.appendChild(icon);
        });

        // Count badge
        const badge = document.createElement('span');
        badge.textContent = `${total}`;
        badge.style.cssText = 'font-size:0.6rem;color:#64748b;margin-left:4px;';
        container.appendChild(badge);

        this.stateDisplay.innerHTML = '';
        this.stateDisplay.appendChild(container);
    }

    /** Map action type to emoji icon */
    private getActionIcon(actionType?: string): string {
        const icons: Record<string, string> = {
            move: '🚶',
            playCard: '🃏',
            endTurn: '⏭',
            explore: '🔍',
            combat: '⚔',
            site: '🏰',
            recruit: '👥',
            heal: '💚',
            rest: '🛏',
            other: '•'
        };
        return icons[actionType || 'other'] || '•';
    }

    // ========== Cleanup ==========

    destroy(): void {
        this.unbindKeyboardShortcuts();
        if (this.phaseChangeHandler) {
            eventBus.off(GAME_EVENTS.PHASE_CHANGED, this.phaseChangeHandler);
        }

        if (this.undoButton?.parentNode) {
            this.undoButton.parentNode.removeChild(this.undoButton);
        }
        if (this.redoButton?.parentNode) {
            this.redoButton.parentNode.removeChild(this.redoButton);
        }
        if (this.stateDisplay?.parentNode) {
            this.stateDisplay.parentNode.removeChild(this.stateDisplay);
        }
    }
}
