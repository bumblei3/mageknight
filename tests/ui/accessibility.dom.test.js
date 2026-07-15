// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AccessibilityManager from '../../js/ui/AccessibilityManager.js';

describe('AccessibilityManager (real DOM, jsdom)', () => {
    let mgr;

    beforeEach(() => {
        document.documentElement.removeAttribute('data-colorblind');
        document.documentElement.removeAttribute('data-high-contrast');
        document.documentElement.removeAttribute('data-large-text');
        document.documentElement.style.removeProperty('--animation-duration');
        localStorage.clear();
        mgr = new AccessibilityManager();
        mgr.init();
    });

    it('initializes with no colorblind mode (dataset.colorblind = "none")', () => {
        expect(document.documentElement.dataset.colorblind).toBe('none');
    });

    it('maps a normal red to colorblind-safe palette per mode', () => {
        // default none -> passthrough
        expect(mgr.getColorblindColor('#ef4444')).toBe('#ef4444');

        // deuteranopia shifts red -> black
        // set via the (private) setter path is not exported; emulate a saved pref + re-init
        localStorage.setItem('mk_accessibility', JSON.stringify({ colorblindMode: 'deuteranopia' }));
        const m2 = new AccessibilityManager();
        m2.init();
        expect(document.documentElement.dataset.colorblind).toBe('deuteranopia');
        expect(m2.getColorblindColor('#ef4444')).toBe('#000000');

        // tritanopia shifts red -> red-ish (#FF0000)
        localStorage.setItem('mk_accessibility', JSON.stringify({ colorblindMode: 'tritanopia' }));
        const m3 = new AccessibilityManager();
        m3.init();
        expect(m3.getColorblindColor('#3b82f6')).toBe('#000000'); // blue -> black in tritanopia

        // monochrome collapses everything to grey
        localStorage.setItem('mk_accessibility', JSON.stringify({ colorblindMode: 'monochrome' }));
        const m4 = new AccessibilityManager();
        m4.init();
        expect(m4.getColorblindColor('#10b981')).toBe('#808080');
    });

    it('toggles reduced motion via animation-duration property', () => {
        localStorage.setItem('mk_accessibility', JSON.stringify({ reducedMotion: true }));
        const m2 = new AccessibilityManager();
        m2.init();
        expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.01ms');
    });

    it('reflects high contrast in the dataset', () => {
        localStorage.setItem('mk_accessibility', JSON.stringify({ highContrast: true }));
        const m2 = new AccessibilityManager();
        m2.init();
        expect(document.documentElement.dataset.highContrast).toBe('true');
    });
});
