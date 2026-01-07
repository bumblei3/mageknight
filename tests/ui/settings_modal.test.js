import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { SettingsModal } from '../../js/ui/SettingsModal.js';
import i18n from '../../js/i18n/index.js';

// Mock i18n
vi.mock('../../js/i18n/index.js', () => ({
    default: {
        getLanguage: vi.fn(() => 'de'),
        setLanguage: vi.fn(),
    }
}));

// Mock logger
vi.mock('../../js/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn()
    }
}));

describe('SettingsModal', () => {
    let ui;
    let settingsModal;

    beforeEach(() => {
        // Mock UI
        ui = {
            game: {
                sound: { enabled: true, setVolume: vi.fn() },
                animator: { speedMultiplier: 1 }
            },
            tooltipManager: { enabled: true },
            showToast: vi.fn(),
            refreshTranslations: vi.fn(),
            shortcutsModal: { show: vi.fn() }
        };

        // Mock DOM
        document.body.innerHTML = `
            <div id="settings-modal">
                <button id="settings-close"></button>
                <button id="settings-save-btn"></button>
                <button id="settings-shortcuts-btn"></button>
                <div class="settings-tab-btn active" data-tab="general"></div>
                <div class="settings-tab-btn" data-tab="audio"></div>
                <div class="settings-tab-content active" id="settings-general"></div>
                <div class="settings-tab-content" id="settings-audio"></div>
                
                <select id="setting-language"><option value="de">DE</option><option value="en">EN</option></select>
                <select id="setting-theme"><option value="classic">Classic</option><option value="dark">Dark</option></select>
                <input type="checkbox" id="setting-sound-enabled" checked>
                <input type="range" id="setting-volume" value="100">
                <select id="setting-anim-speed"><option value="1">1</option><option value="2">2</option></select>
                <input type="checkbox" id="setting-tooltips-enabled" checked>
            </div>
        `;

        settingsModal = new SettingsModal(ui);
        vi.clearAllMocks();
        localStorage.clear();
    });

    test('should load default settings', () => {
        expect(settingsModal.settings.theme).toBe('classic');
        expect(settingsModal.settings.soundEnabled).toBe(true);
    });

    test('should save and apply settings', () => {
        document.getElementById('setting-sound-enabled').checked = false;
        document.getElementById('setting-volume').value = "50";
        document.getElementById('setting-theme').value = "dark";

        settingsModal.saveSettings();

        expect(settingsModal.settings.soundEnabled).toBe(false);
        expect(settingsModal.settings.volume).toBe(50);
        expect(settingsModal.settings.theme).toBe('dark');
        expect(ui.game.sound.enabled).toBe(false);
        expect(ui.game.sound.setVolume).toHaveBeenCalledWith(0.5);
        expect(document.body.className).toBe('theme-dark');
    });

    test('should persist settings to localStorage', () => {
        document.getElementById('setting-theme').value = 'dark';
        settingsModal.saveSettings();

        const stored = JSON.parse(localStorage.getItem('mageknight_settings'));
        expect(stored.theme).toBe('dark');
    });

    test('should handle malformed JSON in localStorage', () => {
        localStorage.setItem('mageknight_settings', 'invalid-json');
        const modal = new SettingsModal(ui);
        expect(modal.settings.theme).toBe('classic'); // Should fall back to defaults
    });

    test('should toggle visibility (show/hide)', () => {
        settingsModal.show();
        expect(settingsModal.modal.classList.contains('show')).toBe(true);

        settingsModal.hide();
        expect(settingsModal.modal.classList.contains('show')).toBe(false);
    });

    test('should hide when close button is clicked', () => {
        settingsModal.show();
        document.getElementById('settings-close').click();
        expect(settingsModal.modal.classList.contains('show')).toBe(false);
    });

    test('should hide when save button is clicked', () => {
        settingsModal.show();
        document.getElementById('settings-save-btn').click();
        expect(settingsModal.modal.classList.contains('show')).toBe(false);
    });

    test('should hide when clicking outside (on modal wrapper)', () => {
        settingsModal.show();
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: settingsModal.modal });
        settingsModal.modal.dispatchEvent(event);
        expect(settingsModal.modal.classList.contains('show')).toBe(false);
    });

    test('should switch tabs', () => {
        const audioTabBtn = document.querySelector('.settings-tab-btn[data-tab="audio"]');
        audioTabBtn.click();

        expect(audioTabBtn.classList.contains('active')).toBe(true);
        expect(document.getElementById('settings-audio').classList.contains('active')).toBe(true);
        expect(document.getElementById('settings-general').classList.contains('active')).toBe(false);
    });

    test('should show shortcuts modal when button is clicked', () => {
        document.getElementById('settings-shortcuts-btn').click();
        expect(ui.shortcutsModal.show).toHaveBeenCalled();
    });

    test('should handle missing game instance in applySettings', () => {
        ui.game = null;
        settingsModal.applySettings(settingsModal.settings);
        // Should return early without error
        expect(true).toBe(true);
    });

    test('should handle missing sound or animator in applySettings', () => {
        ui.game.sound = null;
        ui.game.animator = null;
        settingsModal.applySettings(settingsModal.settings);
        // Should not throw
        expect(true).toBe(true);
    });

    test('should update language via i18n', () => {
        // Mock current language as English to trigger change to German
        i18n.getLanguage.mockReturnValue('en');
        document.getElementById('setting-language').value = 'de';

        settingsModal.saveSettings();

        expect(i18n.setLanguage).toHaveBeenCalledWith('de');
        expect(ui.refreshTranslations).toHaveBeenCalled();
    });

    test('should refresh UI values on show', () => {
        settingsModal.settings.volume = 80;
        settingsModal.show();
        expect(document.getElementById('setting-volume').value).toBe("80");
    });
});
