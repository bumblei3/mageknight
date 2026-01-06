import { MageKnightGame } from './game.js';
// Game3D is now lazy-loaded via dynamic import when 3D mode is first activated
import i18n from './i18n/index.js';
import { ErrorHandler } from './errorHandler.js';

// Expose i18n globally for easy access
window.i18n = i18n;

// Initialize global error handler early
let errorHandler = null;

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

        // 3D View - Lazy loaded on first toggle
        let game3DModule = null;
        const toggle3DBtn = document.getElementById('toggle-3d-btn');

        toggle3DBtn.addEventListener('click', async () => {
            try {
                // Lazy load 3D module on first click
                if (!window.game3D) {
                    toggle3DBtn.disabled = true;
                    toggle3DBtn.style.opacity = '0.5';

                    // Dynamic import - only loads Three.js when needed
                    const { Game3D } = await import('./3d/Game3D.js');
                    window.game3D = new Game3D(window.game);
                    window.game3D.init('game-container-3d');

                    // Hook into updateStats to refresh 3D view
                    const originalUpdateStats = window.game.updateStats.bind(window.game);
                    window.game.updateStats = () => {
                        originalUpdateStats();
                        if (window.game3D && window.game3D.enabled) {
                            window.game3D.update();
                        }
                    };

                    toggle3DBtn.disabled = false;
                    toggle3DBtn.style.opacity = '';
                }

                const isEnabled = window.game3D.toggle();
                toggle3DBtn.classList.toggle('active', isEnabled);
                if (isEnabled) {
                    toggle3DBtn.style.backgroundColor = 'var(--primary-color)';
                } else {
                    toggle3DBtn.style.backgroundColor = '';
                }
            } catch (e) {
                console.warn('3D initialization failed:', e);
                toggle3DBtn.disabled = false;
                toggle3DBtn.style.opacity = '';
            }
        });

        updateLoading(70, 'Lade Karten und Einheiten...');
        await new Promise(r => setTimeout(r, 150));

        updateLoading(90, 'Bereite HUD vor...');
        await new Promise(r => setTimeout(r, 100));

        console.log('Game initialized successfully!');

        // Expose debug manager for console access
        if (window.game.debugManager) {
            window.debug = window.game.debugManager;
        }

        // Initialize error handler with game reference
        errorHandler = new ErrorHandler(window.game);
        window.errorHandler = errorHandler;

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
