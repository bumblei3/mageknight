import { SaveManager } from '../persistence/SaveManager';
import i18n from '../i18n/index';
const { t } = i18n as any;

/**
 * Custom Modal for Saving and Loading games.
 * Replaces the legacy prompt-based system.
 */
export class SaveLoadModal {
    private ui: any;
    private overlay: HTMLElement | null = null;
    private onResolve: ((value: number | null) => void) | null = null;

    constructor(ui: any) {
        this.ui = ui;
        this.overlay = null;
        this.onResolve = null;
    }

    /**
     * Shows the save/load modal.
     * @param {string} mode - 'save' or 'load'
     * @returns {Promise<number|null>} The selected slot index or null if cancelled.
     */
    public show(mode: 'save' | 'load' = 'save'): Promise<number | null> {
        if (!this.overlay) this.createUI();

        return new Promise((resolve) => {
            this.onResolve = resolve;
            this.updateSlots(mode);

            const title = mode === 'save' ? '💾 SPIEL SPEICHERN' : '📂 SPIEL LADEN';
            const titleEl = this.overlay!.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = title;
            this.overlay!.classList.add('active');
        });
    }

    private createUI(): void {
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

        this.overlay.querySelector('.modal-close')?.addEventListener('click', () => this.cancel());
        this.overlay.querySelector('.cancel-btn')?.addEventListener('click', () => this.cancel());
        this.overlay.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.overlay) this.cancel();
        });
    }

    private updateSlots(mode: 'save' | 'load'): void {
        if (!this.overlay) return;
        const list = this.overlay.querySelector('.slot-list');
        if (!list) return;
        list.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slotId = `slot_${i}`;
            const meta = (SaveManager as any).getSaveMeta(slotId);
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

            const actionBtn = slotEl.querySelector('.action-btn') as HTMLButtonElement | null;
            if (meta || mode === 'save') {
                actionBtn?.addEventListener('click', () => {
                    this.selectSlot(i);
                });
                slotEl.addEventListener('click', (e: MouseEvent) => {
                    if (!(e.target as HTMLElement).closest('button')) this.selectSlot(i);
                });
            } else if (actionBtn) {
                actionBtn.disabled = true;
            }

            list.appendChild(slotEl);
        }
    }

    private selectSlot(index: number): void {
        if (this.onResolve) {
            this.onResolve(index);
            this.onResolve = null;
        }
        this.hide();
    }

    private cancel(): void {
        if (this.onResolve) {
            this.onResolve(null);
            this.onResolve = null;
        }
        this.hide();
    }

    public hide(): void {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }
}
