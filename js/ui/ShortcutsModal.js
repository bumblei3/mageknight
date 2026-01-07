/**
 * ShortcutsModal
 * UI for viewing and editing keyboard shortcuts.
 */
import { t } from '../i18n/index.js';

export class ShortcutsModal {
    constructor(ui) {
        this.ui = ui;
        this.modal = null;
        this.isListening = false;
        this.listeningAction = null;
        this.createModal();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'shortcuts-modal';
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" id="shortcuts-close">&times;</span>
                <h2>${t('ui.settings.shortcuts') || 'Tastaturkürzel'}</h2>
                <div class="shortcuts-list" id="shortcuts-list"></div>
                <div class="modal-footer">
                    <button class="btn warning-btn" id="shortcuts-reset">${t('ui.settings.reset') || 'Zurücksetzen'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        // Styling
        // We'll rely on existing modal styles but add specific list styling dynamically or via new CSS file?
        // For now, inline or rely on generic classes.

        this.setupListeners();
    }

    setupListeners() {
        try {
            // Open button - we need to hook this into SettingsModal or main UI
            // Close
            const closeBtn = this.modal.querySelector('#shortcuts-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Reset
            const resetBtn = this.modal.querySelector('#shortcuts-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (typeof window !== 'undefined' && window.confirm && window.confirm('Wirklich alle Kürzel zurücksetzen?')) {
                        this.ui.game.shortcutManager.resetDefaults();
                        this.renderList();
                    }
                });
            }

            // Close on outside click
            if (typeof window !== 'undefined') {
                window.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.hide();
                });
            }
        } catch (e) {
            // Ignore errors in test environments where DOM is partially mocked
            if (process.env.NODE_ENV !== 'test') {
                console.error('ShortcutsModal.setupListeners failed:', e);
            }
        }
    }

    show() {
        this.renderList();
        this.modal.style.display = 'block';
        this.modal.classList.add('active');
    }

    hide() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
        this.isListening = false;
    }

    renderList() {
        const list = this.modal.querySelector('#shortcuts-list');
        list.innerHTML = '';

        const bindings = this.ui.game.shortcutManager.bindings;

        Object.entries(bindings).forEach(([action, binding]) => {
            const row = document.createElement('div');
            row.className = 'shortcut-row';
            row.innerHTML = `
                <span class="shortcut-label">${binding.label}</span>
                <span class="shortcut-key" data-action="${action}">${binding.key === ' ' ? 'Space' : binding.key}</span>
            `;

            row.querySelector('.shortcut-key').addEventListener('click', (e) => this.startListening(action, e.target));

            list.appendChild(row);
        });
    }

    startListening(action, element) {
        if (this.isListening) return;

        this.isListening = true;
        this.listeningAction = action;

        const originalText = element.textContent;
        element.textContent = 'Taste drücken...';
        element.classList.add('listening');

        const keyHandler = (e) => {
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
