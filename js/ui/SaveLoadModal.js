import { SaveManager } from '../persistence/SaveManager.js';
import i18n from '../i18n/index.js';
const { t } = i18n;

/**
 * Custom Modal for Saving and Loading games.
 * Replaces the legacy prompt-based system.
 */
export class SaveLoadModal {
    constructor(ui) {
        this.ui = ui;
        this.overlay = null;
        this.onResolve = null;
    }

    /**
     * Shows the save/load modal.
     * @param {string} mode - 'save' or 'load'
     * @returns {Promise<number|null>} The selected slot index or null if cancelled.
     */
    show(mode = 'save') {
        if (!this.overlay) this.createUI();

        return new Promise((resolve) => {
            this.onResolve = resolve;
            this.updateSlots(mode);

            const title = mode === 'save' ? '💾 SPIEL SPEICHERN' : '📂 SPIEL LADEN';
            this.overlay.querySelector('.modal-title').textContent = title;
            this.overlay.classList.add('active');
        });
    }

    createUI() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay save-load-modal-overlay';
        this.overlay.innerHTML = `
            <div class="modal-content save-load-modal-content">
                <div class="modal-header">
                    <h2 class="modal-title"></h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="slot-list">
                    <!-- Slots will be injected here -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">${t('ui.buttons.cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.overlay.querySelector('.modal-close').addEventListener('click', () => this.cancel());
        this.overlay.querySelector('.cancel-btn').addEventListener('click', () => this.cancel());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.cancel();
        });
    }

    updateSlots(mode) {
        const list = this.overlay.querySelector('.slot-list');
        list.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slotId = `slot_${i}`;
            const meta = SaveManager.getSaveMeta(slotId);
            const slotEl = document.createElement('div');
            slotEl.className = 'save-slot';
            if (!meta && mode === 'load') slotEl.classList.add('disabled');

            const dateStr = meta ? new Date(meta.timestamp).toLocaleString() : t('ui.labels.empty');
            const heroInfo = meta ? `${meta.heroName} (Lv. ${meta.heroLevel})` : '-';
            const turnInfo = meta ? `${t('ui.labels.round')} ${meta.turn}` : '';

            slotEl.innerHTML = `
                <div class="slot-number">${i + 1}</div>
                <div class="slot-details">
                    <div class="slot-main-info">
                        <span class="hero-info">${heroInfo}</span>
                        <span class="turn-info">${turnInfo}</span>
                    </div>
                    <div class="slot-timestamp">${dateStr}</div>
                </div>
                <div class="slot-actions">
                    <button class="btn btn-primary action-btn">
                        ${mode === 'save' ? t('ui.buttons.save') : t('ui.buttons.load')}
                    </button>
                </div>
            `;

            if (meta || mode === 'save') {
                slotEl.querySelector('.action-btn').addEventListener('click', () => {
                    this.selectSlot(i);
                });
                slotEl.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) this.selectSlot(i);
                });
            } else {
                slotEl.querySelector('.action-btn').disabled = true;
            }

            list.appendChild(slotEl);
        }
    }

    selectSlot(index) {
        if (this.onResolve) {
            this.onResolve(index);
            this.onResolve = null;
        }
        this.hide();
    }

    cancel() {
        if (this.onResolve) {
            this.onResolve(null);
            this.onResolve = null;
        }
        this.hide();
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }
}
