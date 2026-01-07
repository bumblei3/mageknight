import { logger } from '../logger.js';
import i18n from '../i18n/index.js';

export class SettingsModal {
    constructor(ui) {
        this.ui = ui;
        this.modal = document.getElementById('settings-modal');
        this.closeBtn = document.getElementById('settings-close');
        this.saveBtn = document.getElementById('settings-save-btn');
        this.tabBtns = document.querySelectorAll('.settings-tab-btn');
        this.tabContents = document.querySelectorAll('.settings-tab-content');

        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        if (!this.modal) return;

        this.closeBtn.addEventListener('click', () => this.hide());
        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
            this.hide();
        });

        // Shortcuts button
        const shortcutsBtn = document.getElementById('settings-shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                if (this.ui.shortcutsModal) {
                    this.ui.shortcutsModal.show();
                    // Optionally hide settings? Keeping it open might be better context.
                }
            });
        }

        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Hide when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        this.applySettings(this.settings);
    }

    show() {
        this.updateUIValues();
        this.modal.classList.add('show');
        logger.debug('Settings Modal shown');
    }

    hide() {
        this.modal.classList.remove('show');
    }

    switchTab(tabId) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `settings-${tabId}`);
        });
    }

    loadSettings() {
        const defaults = {
            language: i18n.getLanguage() || 'de',
            theme: 'classic',
            soundEnabled: true,
            volume: 100,
            animSpeed: 1,
            tooltipsEnabled: true
        };

        const stored = localStorage.getItem('mageknight_settings');
        if (stored) {
            try {
                return { ...defaults, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        return defaults;
    }

    saveSettings() {
        this.settings = {
            language: document.getElementById('setting-language').value,
            theme: document.getElementById('setting-theme').value,
            soundEnabled: document.getElementById('setting-sound-enabled').checked,
            volume: parseInt(document.getElementById('setting-volume').value),
            animSpeed: parseFloat(document.getElementById('setting-anim-speed').value),
            tooltipsEnabled: document.getElementById('setting-tooltips-enabled').checked
        };

        localStorage.setItem('mageknight_settings', JSON.stringify(this.settings));
        this.applySettings(this.settings);

        if (this.ui.showToast) {
            this.ui.showToast('Einstellungen gespeichert', 'success');
        }
    }

    updateUIValues() {
        document.getElementById('setting-language').value = this.settings.language;
        document.getElementById('setting-theme').value = this.settings.theme;
        document.getElementById('setting-sound-enabled').checked = this.settings.soundEnabled;
        document.getElementById('setting-volume').value = this.settings.volume;
        document.getElementById('setting-anim-speed').value = this.settings.animSpeed;
        document.getElementById('setting-tooltips-enabled').checked = this.settings.tooltipsEnabled;
    }

    applySettings(settings) {
        // Wait for game instance to be linked
        if (!this.ui.game) {
            return;
        }

        const game = this.ui.game;

        // Apply Language
        if (i18n.getLanguage() !== settings.language) {
            i18n.setLanguage(settings.language);
            if (this.ui.refreshTranslations) {
                this.ui.refreshTranslations();
            }
        }

        // Apply Sound
        if (game.sound) {
            game.sound.enabled = settings.soundEnabled;
            if (typeof game.sound.setVolume === 'function') {
                game.sound.setVolume(settings.volume / 100);
            }
        }

        // Apply Theme
        document.body.className = `theme-${settings.theme}`;

        // Apply Tooltips
        if (this.ui.tooltipManager) {
            this.ui.tooltipManager.enabled = settings.tooltipsEnabled;
        }

        // Apply Animation Speed
        if (game.animator) {
            game.animator.speedMultiplier = settings.animSpeed;
        }
    }
}
