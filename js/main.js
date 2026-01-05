import { MageKnightGame } from './game.js';
import i18n from './i18n/index.js';

// Expose i18n globally for easy access
window.i18n = i18n;

/**
 * Update loading screen progress
 */
const updateLoading = (progress, status) => {
    const progressBar = document.getElementById('loading-progress');
    const statusText = document.getElementById('loading-status');
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusText) statusText.textContent = status;
};

/**
 * Hide loading screen with smooth transition
 */
const hideLoadingScreen = () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            loadingScreen.remove();
        }, 600);
    }
};

/**
 * Robust initialization for Mage Knight.
 * Uses a global guard and state check to ensure only one instance runs.
 */
const startMageKnight = async () => {
    // Global singleton guard
    if (window.game) {
        console.warn('Mage Knight already initialized. Skipping.');
        hideLoadingScreen();
        return;
    }

    console.log('Starting Mage Knight...');

    try {
        updateLoading(20, 'Lade Spielressourcen...');
        await new Promise(r => setTimeout(r, 100)); // Allow UI update

        updateLoading(40, 'Initialisiere Spielwelt...');
        await new Promise(r => setTimeout(r, 100));

        window.game = new MageKnightGame();

        updateLoading(70, 'Lade Karten und Einheiten...');
        await new Promise(r => setTimeout(r, 150));

        updateLoading(90, 'Bereite HUD vor...');
        await new Promise(r => setTimeout(r, 100));

        console.log('Game initialized successfully!');

        // Expose debug manager for console access
        if (window.game.debugManager) {
            window.debug = window.game.debugManager;
        }

        updateLoading(100, 'Fertig!');
        await new Promise(r => setTimeout(r, 300));

        hideLoadingScreen();

    } catch (error) {
        console.error('Failed to initialize game:', error);
        updateLoading(0, 'Fehler beim Laden!');
    }
};

// Handle both normal loading and deferred/module loading
if (document.readyState === 'loading') {
    window.addEventListener('load', startMageKnight, { once: true });
} else {
    // Use requestAnimationFrame to ensure DOM is fully ready and painted if readyState is already 'complete'
    requestAnimationFrame(startMageKnight);
}
