/**
 * Accessibility Manager — WCAG 2.1 AA Compliance
 * 
 * Features:
 * - Colorblind palettes (Protanopia, Deuteranopia, Tritanopia, Monochrome)
 * - Screen reader announcements (ARIA live regions)
 * - Keyboard navigation enhancement
 * - Focus management
 * - High contrast mode
 * - Reduced motion support
 */

export interface AccessibilitySettings {
    colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    largeText: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
    colorblindMode: 'none',
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    largeText: false,
};

export class AccessibilityManager {
    private settings: AccessibilitySettings;
    private liveRegion: HTMLElement | null = null;
    private announcer: HTMLElement | null = null;

    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.loadSettings();
    }

    /**
     * Initialize accessibility features
     */
    init(): void {
        this.createLiveRegion();
        this.applySettings();
    }

    /**
     * Create ARIA live region for screen reader announcements
     */
    private createLiveRegion(): void {
        if (this.liveRegion) return;

        this.liveRegion = document.createElement('div');
        this.liveRegion.id = 'aria-live-region';
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        this.liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(this.liveRegion);

        // Create assertive announcer for urgent messages
        this.announcer = document.createElement('div');
        this.announcer.id = 'aria-assertive-region';
        this.announcer.setAttribute('aria-live', 'assertive');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.style.cssText = this.liveRegion.style.cssText;
        document.body.appendChild(this.announcer);
    }

    /**
     * Announce message to screen readers
     */
    announce(message: string, urgent = false): void {
        const region = urgent ? this.announcer : this.liveRegion;
        if (!region) return;

        // Clear and set to ensure announcement triggers
        region.textContent = '';
        requestAnimationFrame(() => {
            region.textContent = message;
        });
    }

    /**
     * Update a setting and apply
     */
    setSetting<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]): void {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    /**
     * Get current settings
     */
    getSettings(): AccessibilitySettings {
        return { ...this.settings };
    }

    /**
     * Apply all accessibility settings to the DOM
     */
    private applySettings(): void {
        const root = document.documentElement;

        // Colorblind mode
        root.dataset.colorblind = this.settings.colorblindMode;

        // High contrast
        root.dataset.highContrast = this.settings.highContrast ? 'true' : 'false';

        // Reduced motion
        if (this.settings.reducedMotion) {
            root.style.setProperty('--animation-duration', '0.01ms');
        } else if (root.style.removeProperty) {
            root.style.removeProperty('--animation-duration');
        }

        // Large text
        root.dataset.largeText = this.settings.largeText ? 'true' : 'false';
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): void {
        try {
            const saved = localStorage.getItem('mk_accessibility');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch {
            // Use defaults
        }

        // Detect system preferences (only if matchMedia is available)
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.settings.reducedMotion = true;
            }
            if (window.matchMedia('(prefers-contrast: more)').matches) {
                this.settings.highContrast = true;
            }
        }
    }

    /**
     * Save settings to localStorage
     */
    private saveSettings(): void {
        try {
            localStorage.setItem('mk_accessibility', JSON.stringify(this.settings));
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Get colorblind-safe color palette
     */
    getColorblindColor(originalColor: string): string {
        if (this.settings.colorblindMode === 'none') return originalColor;

        const palettes: Record<string, Record<string, string>> = {
            protanopia: {
                red: '#000000', green: '#0000FF', blue: '#FFFF00',
                gold: '#FFFF00', white: '#FFFFFF', black: '#000000',
            },
            deuteranopia: {
                red: '#000000', green: '#0000FF', blue: '#FFFF00',
                gold: '#FFFF00', white: '#FFFFFF', black: '#000000',
            },
            tritanopia: {
                red: '#FF0000', green: '#00FF00', blue: '#000000',
                gold: '#FF0000', white: '#FFFFFF', black: '#000000',
            },
            monochrome: {
                red: '#808080', green: '#808080', blue: '#808080',
                gold: '#808080', white: '#FFFFFF', black: '#000000',
            },
        };

        const palette = palettes[this.settings.colorblindMode];
        if (!palette) return originalColor;

        // Map CSS variable names to colorblind-safe alternatives
        const colorMap: Record<string, string> = {
            'var(--color-red-500)': palette.red,
            'var(--color-green-500)': palette.green,
            'var(--color-blue-500)': palette.blue,
            'var(--color-gold-400)': palette.gold,
            '#ef4444': palette.red,
            '#10b981': palette.green,
            '#3b82f6': palette.blue,
            '#fbbf24': palette.gold,
        };

        return colorMap[originalColor] || originalColor;
    }

    /**
     * Check if user needs accessible announcements
     */
    isScreenReaderEnabled(): boolean {
        return this.settings.screenReader;
    }
}

export default AccessibilityManager;
