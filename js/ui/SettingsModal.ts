import { logger } from '../logger';
import i18n from '../i18n/index';

interface Settings {
    language: string;
    theme: string;
    soundEnabled: boolean;
    volume: number;
    animSpeed: number;
    tooltipsEnabled: boolean;
}

export class SettingsModal {
    private ui: any;
    private modal: HTMLElement | null;
    private closeBtn: HTMLElement | null;
    private saveBtn: HTMLElement | null;
    private tabBtns: NodeListOf<HTMLElement>;
    private tabContents: NodeListOf<HTMLElement>;
    private settings: Settings;

    constructor(ui: any) {
        this.ui = ui;
        this.modal = document.getElementById('settings-modal');
        this.closeBtn = document.getElementById('settings-close');
        this.saveBtn = document.getElementById('settings-save-btn');
        this.tabBtns = document.querySelectorAll('.settings-tab-btn');
        this.tabContents = document.querySelectorAll('.settings-tab-content');

        this.settings = this.loadSettings();
        this.init();
    }

    private init(): void {
        if (!this.modal) return;

        this.closeBtn?.addEventListener('click', () => this.hide());
        this.saveBtn?.addEventListener('click', () => {
            this.saveSettings();
            this.hide();
        });

        // Shortcuts button
        const shortcutsBtn = document.getElementById('settings-shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                if (this.ui.shortcutsModal) {
                    this.ui.shortcutsModal.show();
                }
            });
        }

        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) this.switchTab(tab);
            });
        });

        // Hide when clicking outside
        this.modal.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) this.hide();
        });

        this.applySettings(this.settings);
    }

    public show(): void {
        this.updateUIValues();
        if (this.modal) this.modal.classList.add('show');
        (logger as any).debug('Settings Modal shown');
    }

    public hide(): void {
        if (this.modal) this.modal.classList.remove('show');
    }

    private switchTab(tabId: string): void {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `settings-${tabId}`);
        });
    }

    private loadSettings(): Settings {
        const defaults: Settings = {
            language: (i18n as any).getLanguage() || 'de',
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

    private saveSettings(): void {
        const langEl = document.getElementById('setting-language') as HTMLSelectElement;
        const themeEl = document.getElementById('setting-theme') as HTMLSelectElement;
        const soundEl = document.getElementById('setting-sound-enabled') as HTMLInputElement;
        const volumeEl = document.getElementById('setting-volume') as HTMLInputElement;
        const speedEl = document.getElementById('setting-anim-speed') as HTMLInputElement;
        const tooltipsEl = document.getElementById('setting-tooltips-enabled') as HTMLInputElement;

        this.settings = {
            language: langEl.value,
            theme: themeEl.value,
            soundEnabled: soundEl.checked,
            volume: parseInt(volumeEl.value),
            animSpeed: parseFloat(speedEl.value),
            tooltipsEnabled: tooltipsEl.checked
        };

        localStorage.setItem('mageknight_settings', JSON.stringify(this.settings));
        this.applySettings(this.settings);

        if (this.ui.showToast) {
            this.ui.showToast('Einstellungen gespeichert', 'success');
        }
    }

    private updateUIValues(): void {
        const langEl = document.getElementById('setting-language') as HTMLSelectElement;
        const themeEl = document.getElementById('setting-theme') as HTMLSelectElement;
        const soundEl = document.getElementById('setting-sound-enabled') as HTMLInputElement;
        const volumeEl = document.getElementById('setting-volume') as HTMLInputElement;
        const speedEl = document.getElementById('setting-anim-speed') as HTMLInputElement;
        const tooltipsEl = document.getElementById('setting-tooltips-enabled') as HTMLInputElement;

        if (langEl) langEl.value = this.settings.language;
        if (themeEl) themeEl.value = this.settings.theme;
        if (soundEl) soundEl.checked = this.settings.soundEnabled;
        if (volumeEl) volumeEl.value = this.settings.volume.toString();
        if (speedEl) speedEl.value = this.settings.animSpeed.toString();
        if (tooltipsEl) tooltipsEl.checked = this.settings.tooltipsEnabled;
    }

    private applySettings(settings: Settings): void {
        // Wait for game instance to be linked
        if (!this.ui.game) {
            return;
        }

        const game = this.ui.game;

        // Apply Language
        if ((i18n as any).getLanguage() !== settings.language) {
            (i18n as any).setLanguage(settings.language);
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
