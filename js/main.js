import { MageKnightGame } from './game.js';

window.addEventListener('load', () => {
    if (window.game) return; // Prevent double initialization
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
});
