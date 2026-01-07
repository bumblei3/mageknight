import { MageKnightGame } from './game';
// Game3D is lazy-loaded via dynamic import
import i18n from './i18n/index';
import { ErrorHandler } from './errorHandler';

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
    // Global singleton guard
    if ((window as any).game) {
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

        const game = new MageKnightGame();
        (window as any).game = game;

        // 3D View - Lazy loaded on first toggle
        const toggle3DBtn = document.getElementById('toggle-3d-btn') as HTMLButtonElement | null;

        if (toggle3DBtn) {
            toggle3DBtn.addEventListener('click', async () => {
                try {
                    // Lazy load 3D module on first click
                    if (!(window as any).game3D) {
                        toggle3DBtn.disabled = true;
                        toggle3DBtn.style.opacity = '0.5';

                        // Dynamic import - only loads Three.js when needed
                        // @ts-ignore - dynamic import of JS module or TS module
                        const { Game3D } = await import('./3d/Game3D.js');
                        (window as any).game3D = new Game3D((window as any).game);
                        (window as any).game3D.init('game-container-3d');

                        // Hook into updateStats to refresh 3D view
                        const originalUpdateStats = (window as any).game.updateStats.bind((window as any).game);
                        (window as any).game.updateStats = () => {
                            originalUpdateStats();
                            if ((window as any).game3D && (window as any).game3D.enabled) {
                                (window as any).game3D.update();
                            }
                        };

                        toggle3DBtn.disabled = false;
                        toggle3DBtn.style.opacity = '';
                    }

                    const isEnabled = (window as any).game3D.toggle();
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
