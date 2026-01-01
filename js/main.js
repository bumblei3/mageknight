import { MageKnightGame } from './game.js';
import i18n from './i18n/index.js';

// Expose i18n globally for easy access
window.i18n = i18n;

/**
 * Robust initialization for Mage Knight.
 * Uses a global guard and state check to ensure only one instance runs.
 */
const startMageKnight = () => {
    // Global singleton guard
    if (window.game) {
        console.warn('Mage Knight already initialized. Skipping.');
        return;
    }

    console.log('Starting Mage Knight...');
    try {
        window.game = new MageKnightGame();
        console.log('Game initialized successfully!');

        // Expose debug manager for console access
        if (window.game.debugManager) {
            window.debug = window.game.debugManager;
        }
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
};

// Handle both normal loading and deferred/module loading
if (document.readyState === 'loading') {
    window.addEventListener('load', startMageKnight, { once: true });
} else {
    // Use requestAnimationFrame to ensure DOM is fully ready and painted if readyState is already 'complete'
    requestAnimationFrame(startMageKnight);
}
