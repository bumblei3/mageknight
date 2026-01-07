import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveLoadModal } from '../../js/ui/SaveLoadModal.js';
import { SaveManager } from '../../js/persistence/SaveManager.js';

// Mock SaveManager
vi.mock('../../js/persistence/SaveManager.js', () => ({
    SaveManager: {
        getSaveMeta: vi.fn()
    }
}));

// Mock i18n
vi.mock('../../js/i18n/index.js', () => ({
    default: {
        t: (key) => key
    }
}));

describe('SaveLoadModal', () => {
    let modal;
    let mockUI;

    beforeEach(() => {
        document.body.innerHTML = '';
        mockUI = {
            game: {
                sound: { click: vi.fn() }
            }
        };
        modal = new SaveLoadModal(mockUI);
        vi.clearAllMocks();
    });

    it('should create UI elements on first show', async () => {
        const showPromise = modal.show('save');

        const overlay = document.querySelector('.save-load-modal-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.classList.contains('active')).toBe(true);

        modal.cancel();
        await showPromise;
    });

    it('should display correct title for save mode', async () => {
        const showPromise = modal.show('save');
        const title = document.querySelector('.modal-title');
        expect(title.textContent).toBe('💾 SPIEL SPEICHERN');

        modal.cancel();
        await showPromise;
    });

    it('should display correct title for load mode', async () => {
        const showPromise = modal.show('load');
        const title = document.querySelector('.modal-title');
        expect(title.textContent).toBe('📂 SPIEL LADEN');

        modal.cancel();
        await showPromise;
    });

    it('should render 5 slots', async () => {
        const showPromise = modal.show('save');
        const slots = document.querySelectorAll('.save-slot');
        expect(slots.length).toBe(5);

        modal.cancel();
        await showPromise;
    });

    it('should show empty slot info when no metadata exists', async () => {
        SaveManager.getSaveMeta.mockReturnValue(null);

        const showPromise = modal.show('save');
        const firstSlot = document.querySelector('.save-slot');
        expect(firstSlot.textContent).toContain('ui.labels.empty');

        modal.cancel();
        await showPromise;
    });

    it('should show hero info when metadata exists', async () => {
        SaveManager.getSaveMeta.mockReturnValue({
            timestamp: Date.now(),
            heroName: 'Goldyx',
            heroLevel: 2,
            turn: 5
        });

        const showPromise = modal.show('save');
        const firstSlot = document.querySelector('.save-slot');
        expect(firstSlot.textContent).toContain('Goldyx (Lv. 2)');
        expect(firstSlot.textContent).toContain('ui.labels.round 5');

        modal.cancel();
        await showPromise;
    });

    it('should disable load button for empty slots in load mode', async () => {
        SaveManager.getSaveMeta.mockReturnValue(null);

        const showPromise = modal.show('load');
        const firstSlotActionBtn = document.querySelector('.save-slot .action-btn');
        expect(firstSlotActionBtn.disabled).toBe(true);
        expect(document.querySelector('.save-slot').classList.contains('disabled')).toBe(true);

        modal.cancel();
        await showPromise;
    });

    it('should resolve with slot index when action button is clicked', async () => {
        const showPromise = modal.show('save');
        const firstSlotActionBtn = document.querySelector('.save-slot .action-btn');

        firstSlotActionBtn.click();

        const result = await showPromise;
        expect(result).toBe(0);
        expect(modal.overlay.classList.contains('active')).toBe(false);
    });

    it('should resolve with null when cancel button is clicked', async () => {
        const showPromise = modal.show('save');
        const cancelBtn = document.querySelector('.cancel-btn');

        cancelBtn.click();

        const result = await showPromise;
        expect(result).toBe(null);
        expect(modal.overlay.classList.contains('active')).toBe(false);
    });

    it('should resolve with null when close button is clicked', async () => {
        const showPromise = modal.show('save');
        const closeBtn = document.querySelector('.modal-close');

        closeBtn.click();

        const result = await showPromise;
        expect(result).toBe(null);
    });

    it('should resolve with null when overlay is clicked', async () => {
        const showPromise = modal.show('save');
        const overlay = document.querySelector('.save-load-modal-overlay');

        // Simulate click on overlay (the backdrop)
        overlay.click();

        const result = await showPromise;
        expect(result).toBe(null);
    });

    it('should NOT resolve when clicking inside the modal content', async () => {
        const showPromise = modal.show('save');
        const content = document.querySelector('.save-load-modal-content');

        // This should not trigger cancel
        content.click();

        // Check if modal is still active (using a timeout to ensure no async rejection happened if it were to)
        expect(modal.overlay.classList.contains('active')).toBe(true);

        modal.cancel();
        await showPromise;
    });
});
