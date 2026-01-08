import { MageKnightGame } from './game';
// Game3D is lazy-loaded via dynamic import
import i18n from './i18n/index';
import { ErrorHandler } from './errorHandler';

/**
 * Handles dynamic import errors (common after new deployments due to hash mismatch)
 */
const handleImportError = (error: any) => {
    console.error('Dynamic import failed:', error);
    // If it's a fetch error for a chunk, it might be due to a new deployment
    if (error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('chunk')) {
        const lastReload = localStorage.getItem('mk_last_import_reload');
        const now = Date.now();
        // Only auto-reload once every 30 seconds to avoid loops
        if (!lastReload || now - parseInt(lastReload) > 30000) {
            localStorage.setItem('mk_last_import_reload', now.toString());
            console.warn('Chunk mismatch detected, reloading page...');
            window.location.reload();
            return;
        }
    }
    throw error;
};

// Import all CSS for Vite bundling
import '../css/reset.css';
import '../css/layout.css';
import '../css/hud.css';
import '../css/cards.css';
import '../css/modals.css';
import '../css/tooltips.css';
import '../css/loading.css';
import '../css/tutorial.css';
import '../css/effects.css';
import '../css/mobile.css';
import '../css/icons.css';
import '../css/floating-text.css';
import '../css/rewards.css';

// Expose i18n globally for easy access
(window as any).i18n = i18n;

// Initialize global error handler early
let errorHandler: ErrorHandler | null = null;

/**
 * Update loading screen progress
 */
const updateLoading = (progress: number, status: string): void => {
    const progressBar = document.getElementById('loading-progress');
    const statusText = document.getElementById('loading-status');
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusText) statusText.textContent = status;
};

/**
 * Hide loading screen with smooth transition
 */
const hideLoadingScreen = (): void => {
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
const startMageKnight = async (): Promise<void> => {
    // Global singleton guard (synchronous check)
    if ((window as any).game || (window as any).mk_initializing) {
        console.warn('Mage Knight already initialized or initializing. Skipping.');
        return;
    }
    (window as any).mk_initializing = true;

    console.log('Starting Mage Knight...');

    try {
        updateLoading(20, 'Lade Spielressourcen...');
        await new Promise(r => setTimeout(r, 100)); // Allow UI update

        updateLoading(40, 'Initialisiere Spielwelt...');
        await new Promise(r => setTimeout(r, 100));

        const game = new MageKnightGame();
        (window as any).game = game;
        delete (window as any).mk_initializing;

        // 3D View - Lazy loaded on first toggle
        const toggle3DBtn = document.getElementById('toggle-3d-btn') as HTMLButtonElement | null;
        let is3DLoading = false;

        if (toggle3DBtn) {
            toggle3DBtn.addEventListener('click', async () => {
                console.log('Toggle 3D: Clicked');
                if (is3DLoading) {
                    console.log('Toggle 3D: Loading in progress, ignoring click');
                    return;
                }

                try {
                    // Lazy load 3D module on first click
                    if (!(window as any).game3D) {
                        is3DLoading = true;
                        toggle3DBtn.disabled = true;
                        toggle3DBtn.style.opacity = '0.5';
                        toggle3DBtn.classList.add('loading');

                        // Dynamic import - only loads Three.js when needed
                        // @ts-ignore
                        const { Game3D } = await import('./3d/Game3D').catch(handleImportError);

                        // Double-check in case another click got through (unlikely with flag but safe)
                        if (!(window as any).game3D) {
                            (window as any).game3D = new Game3D((window as any).game);
                            (window as any).game3D.init('game-container-3d');
                        }

                        toggle3DBtn.disabled = false;
                        toggle3DBtn.style.opacity = '';
                        toggle3DBtn.classList.remove('loading');
                        is3DLoading = false;
                    }

                    console.log('Toggling 3D view...');
                    const isEnabled = (window as any).game3D.toggle();
                    console.log('3D Enabled state:', isEnabled);
                    toggle3DBtn.classList.toggle('active', isEnabled);
                    if (isEnabled) {
                        // active style handled by class
                    }
                } catch (e) {
                    console.warn('3D initialization failed:', e);
                    toggle3DBtn.disabled = false;
                    toggle3DBtn.style.opacity = '';
                    toggle3DBtn.classList.remove('loading');
                    is3DLoading = false;
                }
            });
        }

        updateLoading(70, 'Lade Karten und Einheiten...');
        await new Promise(r => setTimeout(r, 150));

        updateLoading(90, 'Bereite HUD vor...');
        await new Promise(r => setTimeout(r, 100));

        console.log('Game initialized successfully!');

        // Expose debug manager for console access
        if ((window as any).game.debugManager) {
            (window as any).debug = (window as any).game.debugManager;
        }

        // Initialize error handler with game reference
        errorHandler = new ErrorHandler((window as any).game);
        (window as any).errorHandler = errorHandler;

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
    window.addEventListener('load', () => {
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => startMageKnight(), { timeout: 2000 });
        } else {
            setTimeout(startMageKnight, 100);
        }
    }, { once: true });
} else {
    // Use requestIdleCallback to ensure DOM is fully ready and painted if readyState is already 'complete'
    if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => startMageKnight(), { timeout: 2000 });
    } else {
        requestAnimationFrame(startMageKnight); // mismatch types if proper requestAnimationFrame typing used, calling direct
    }
}
