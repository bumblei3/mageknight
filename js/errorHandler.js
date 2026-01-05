/**
 * Global Error Handler for Mage Knight
 * Catches unhandled errors and provides user-friendly feedback
 */
import { logger } from './logger.js';

export class ErrorHandler {
    constructor(game) {
        this.game = game;
        this.errors = [];
        this.maxErrors = 50;

        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                col: event.colno,
                stack: event.error?.stack
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });

        logger.info('🛡️ Error handler initialized');
    }

    handleError(errorInfo) {
        // Store error
        this.errors.push({
            ...errorInfo,
            timestamp: new Date().toISOString()
        });

        // Limit stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to console
        logger.error(`[${errorInfo.type}] ${errorInfo.message}`);

        // Show user-friendly notification if game is available
        if (this.game?.showToast) {
            this.game.showToast('Ein Fehler ist aufgetreten. Siehe Konsole für Details.', 'error');
        }

        // Log to debug panel if available
        if (this.game?.addLog) {
            this.game.addLog(`Fehler: ${errorInfo.message}`, 'error');
        }
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }

    getErrorCount() {
        return this.errors.length;
    }
}
