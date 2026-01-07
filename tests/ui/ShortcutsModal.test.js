import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShortcutsModal } from '../../js/ui/ShortcutsModal.js';

// Mock i18n
vi.mock('../../js/i18n/index.js', () => ({
    t: (key) => key
}));

describe('ShortcutsModal', () => {
    let modal;
    let mockUI;
    let mockShortcutManager;

    beforeEach(() => {
        document.body.innerHTML = '';

        mockShortcutManager = {
            bindings: {
                'move': { key: 'm', label: 'Move' },
                'end_turn': { key: ' ', label: 'End Turn' }
            },
            updateBinding: vi.fn((action, key) => {
                if (mockShortcutManager.bindings[action]) {
                    mockShortcutManager.bindings[action].key = key;
                }
            }),
            resetDefaults: vi.fn()
        };

        mockUI = {
            game: {
                shortcutManager: mockShortcutManager
            }
        };

        // Mock window.confirm
        global.window.confirm = vi.fn();

        modal = new ShortcutsModal(mockUI);
    });

    it('should create modal on initialization', () => {
        const modalEl = document.getElementById('shortcuts-modal');
        expect(modalEl).not.toBeNull();
        expect(modalEl.querySelector('h2').textContent).toBe('ui.settings.shortcuts');
    });

    it('should show and hide correctly', () => {
        modal.show();
        expect(modal.modal.style.display).toBe('block');
        expect(modal.modal.classList.contains('active')).toBe(true);

        modal.hide();
        expect(modal.modal.style.display).toBe('none');
        expect(modal.modal.classList.contains('active')).toBe(false);
    });

    it('should render shortcut list correctly', () => {
        modal.show();
        const list = document.getElementById('shortcuts-list');
        const rows = list.querySelectorAll('.shortcut-row');

        expect(rows.length).toBe(2);
        expect(rows[0].querySelector('.shortcut-label').textContent).toBe('Move');
        expect(rows[0].querySelector('.shortcut-key').textContent).toBe('m');

        // Check space handling
        expect(rows[1].querySelector('.shortcut-key').textContent).toBe('Space');
    });

    it('should start listening when a key is clicked', () => {
        modal.show();
        const keyEl = document.querySelector('.shortcut-key');
        keyEl.click();

        expect(modal.isListening).toBe(true);
        expect(modal.listeningAction).toBe('move');
        expect(keyEl.textContent).toBe('Taste drücken...');
        expect(keyEl.classList.contains('listening')).toBe(true);
    });

    it('should update binding and stop listening on keydown', () => {
        modal.show();
        const keyEl = document.querySelector('.shortcut-key[data-action="move"]');
        keyEl.click();

        const event = new KeyboardEvent('keydown', { key: 'k' });
        document.dispatchEvent(event);

        expect(mockShortcutManager.updateBinding).toHaveBeenCalledWith('move', 'k');
        expect(modal.isListening).toBe(false);

        // The old keyEl is now stale because renderList() replaced the innerHTML.
        // We must query the new element from the DOM.
        const newKeyEl = document.querySelector('.shortcut-key[data-action="move"]');
        expect(newKeyEl.textContent).toBe('k');
        expect(newKeyEl.classList.contains('listening')).toBe(false);
    });

    it('should cancel listening on Escape key', () => {
        modal.show();
        const keyEl = document.querySelector('.shortcut-key[data-action="move"]');
        keyEl.click();

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        expect(mockShortcutManager.updateBinding).not.toHaveBeenCalled();
        expect(modal.isListening).toBe(false);
        expect(keyEl.textContent).toBe('m');
    });

    it('should reset defaults when reset button is clicked and confirmed', () => {
        window.confirm.mockReturnValue(true);
        const resetBtn = document.getElementById('shortcuts-reset');

        resetBtn.click();

        expect(window.confirm).toHaveBeenCalled();
        expect(mockShortcutManager.resetDefaults).toHaveBeenCalled();
    });

    it('should NOT reset defaults if NOT confirmed', () => {
        window.confirm.mockReturnValue(false);
        const resetBtn = document.getElementById('shortcuts-reset');

        resetBtn.click();

        expect(mockShortcutManager.resetDefaults).not.toHaveBeenCalled();
    });

    it('should hide when close button is clicked', () => {
        modal.show();
        const closeBtn = document.getElementById('shortcuts-close');
        closeBtn.click();
        expect(modal.modal.style.display).toBe('none');
    });

    it('should hide when clicking outside the modal content', () => {
        modal.show();
        // Simulate click on the modal overlay itself
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: modal.modal });
        window.dispatchEvent(event);

        expect(modal.modal.style.display).toBe('none');
    });

    it('should prevent multiple listening states', () => {
        modal.show();
        const keys = document.querySelectorAll('.shortcut-key');
        keys[0].click();

        expect(modal.isListening).toBe(true);
        expect(modal.listeningAction).toBe('move');

        // Clicking another shouldn't change listeningAction
        keys[1].click();
        expect(modal.listeningAction).toBe('move');
    });
});
