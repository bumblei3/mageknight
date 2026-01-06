import { SettingsModal } from '../../js/ui/SettingsModal.js';

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
            refreshTranslations: vi.fn()
        };

        // Mock DOM
        document.body.innerHTML = `
            <div id="settings-modal">
                <button id="settings-close"></button>
                <button id="settings-save-btn"></button>
                <div class="settings-tab-btn" data-tab="general"></div>
                <div class="settings-tab-content" id="settings-general"></div>
                <select id="setting-language"><option value="de">DE</option><option value="en">EN</option></select>
                <select id="setting-theme"><option value="classic">Classic</option></select>
                <input type="checkbox" id="setting-sound-enabled" checked>
                <input type="range" id="setting-volume" value="100">
                <select id="setting-anim-speed"><option value="1">1</option></select>
                <input type="checkbox" id="setting-tooltips-enabled" checked>
            </div>
        `;

        settingsModal = new SettingsModal(ui);
    });

    test('should load default settings', () => {
        expect(settingsModal.settings.theme).toBe('classic');
        expect(settingsModal.settings.soundEnabled).toBe(true);
    });

    test('should save and apply settings', () => {
        document.getElementById('setting-sound-enabled').checked = false;
        document.getElementById('setting-volume').value = "50";

        settingsModal.saveSettings();

        expect(settingsModal.settings.soundEnabled).toBe(false);
        expect(settingsModal.settings.volume).toBe(50);
        expect(ui.game.sound.enabled).toBe(false);
        expect(ui.game.sound.setVolume).toHaveBeenCalledWith(0.5);
    });

    test('should persist settings to localStorage', () => {
        document.getElementById('setting-theme').value = 'classic';
        settingsModal.saveSettings();

        const stored = JSON.parse(localStorage.getItem('mageknight_settings'));
        expect(stored.theme).toBe('classic');
    });
});
