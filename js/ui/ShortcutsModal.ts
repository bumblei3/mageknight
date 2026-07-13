/**
 * ShortcutsModal
 * UI for viewing and editing keyboard shortcuts.
 */
import { t } from '../i18n/index';

export class ShortcutsModal {
    private ui: any;
    private modal: HTMLElement | null = null;
    private isListening: boolean = false;
    private listeningAction: string | null = null;

    constructor(ui: any) {
        this.ui = ui;
        this.modal = null;
        this.isListening = false;
        this.listeningAction = null;
        this.createModal();
    }

    private createModal(): void {
        const existingModal = document.getElementById('shortcuts-modal');
        if (existingModal) {
            existingModal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'shortcuts-modal';
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" id="shortcuts-close" tabindex="-1" role="button" aria-label="Schließen">&times;</span>
                <h2>${(t as any)('ui.settings.shortcuts') || 'Tastaturkürzel'}</h2>
                <div class="shortcuts-list" id="shortcuts-list"></div>
                <div class="modal-footer">
                    <button class="btn warning-btn" id="shortcuts-reset">${(t as any)('ui.settings.reset') || 'Zurücksetzen'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.setupListeners();
    }

    public show(): void {
        if (!this.modal) return;
        this.renderList();
        this.modal.style.display = 'block';
        this.modal.classList.add('active');
        this.modal.setAttribute('tabindex', '-1');

        // Accessibility: move focus into the dialog so keyboard users are not
        // left on the page behind it, and trap Tab within the modal. Defer one
        // frame so the (newly-shown) element can receive focus reliably.
        const focusTarget =
            (this.modal.querySelector('#shortcuts-close') as HTMLElement | null) ||
            (this.modal.querySelector('button, [href], input, select, textarea') as HTMLElement | null) ||
            this.modal;
        requestAnimationFrame(() => focusTarget.focus());
        document.addEventListener('keydown', this.trapHandler, true);
    }

    public hide(): void {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
        this.isListening = false;
        document.removeEventListener('keydown', this.trapHandler, true);
        // Return focus to the trigger if available (settings shortcuts button)
        const trigger = document.getElementById('settings-shortcuts-btn');
        if (trigger) (trigger as HTMLElement).focus();
    }

    /**
     * Keep keyboard focus inside the modal: Escape closes it (unless we are
     * currently capturing a new key), and Tab cycles the focusable elements
     * instead of escaping to the page behind.
     */
    private trapHandler = (e: KeyboardEvent): void => {
        if (!this.modal) return;
        if (e.key === 'Escape' && !this.isListening) {
            e.preventDefault();
            this.hide();
            return;
        }
        if (e.key !== 'Tab') return;

        const focusables = Array.from(
            this.modal.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    private setupListeners(): void {
        if (!this.modal) return;
        try {
            // Close
            const closeBtn = this.modal.querySelector('#shortcuts-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Reset
            const resetBtn = this.modal.querySelector('#shortcuts-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (
                        typeof window !== 'undefined' &&
                        window.confirm &&
                        window.confirm('Wirklich alle Kürzel zurücksetzen?')
                    ) {
                        this.ui.game.shortcutManager.resetDefaults();
                        this.renderList();
                    }
                });
            }

            // Close on outside click
            if (typeof window !== 'undefined') {
                window.addEventListener('click', (e: MouseEvent) => {
                    if (e.target === this.modal) this.hide();
                });
            }
        } catch (e) {
            // Ignore errors in test environments where DOM is partially mocked
            if ((process.env as any).NODE_ENV !== 'test') {
                console.error('ShortcutsModal.setupListeners failed:', e);
            }
        }
    }

    public renderList(): void {
        if (!this.modal) return;
        const list = this.modal.querySelector('#shortcuts-list');
        if (!list) return;
        list.innerHTML = '';

        const bindings = this.ui.game.shortcutManager.bindings;

        Object.entries(bindings).forEach(([action, binding]: [string, any]) => {
            const row = document.createElement('div');
            row.className = 'shortcut-row';
            row.innerHTML = `
                <span class="shortcut-label">${binding.label}</span>
                <span class="shortcut-key" data-action="${action}">${binding.key === ' ' ? 'Space' : binding.key}</span>
            `;

            row.querySelector('.shortcut-key')?.addEventListener('click', (e: Event) =>
                this.startListening(action, e.target as HTMLElement)
            );

            list.appendChild(row);
        });
    }

    private startListening(action: string, element: HTMLElement): void {
        if (this.isListening) return;

        this.isListening = true;
        this.listeningAction = action;

        const originalText = element.textContent;
        element.textContent = 'Taste drücken...';
        element.classList.add('listening');

        const keyHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Allow Escape to cancel
            if (e.key === 'Escape') {
                element.textContent = originalText;
                cleanup();
                return;
            }

            // Save new key
            this.ui.game.shortcutManager.updateBinding(action, e.key);
            cleanup();
            this.renderList(); // Refresh full list
        };

        const cleanup = () => {
            this.isListening = false;
            this.listeningAction = null;
            element.classList.remove('listening');
            document.removeEventListener('keydown', keyHandler, { capture: true });
        };

        document.addEventListener('keydown', keyHandler, { capture: true });
    }
}
