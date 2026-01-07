/**
 * Global Error Handler for Mage Knight
 * Catches unhandled errors and provides user-friendly feedback
 */
import { logger } from './logger';
// Using any for game reference to avoid circular dependencies with MageKnightGame
// or we can define an interface if needed.

export interface ErrorInfo {
    type: string;
    message: string;
    filename?: string;
    line?: number;
    col?: number;
    stack?: string;
    timestamp?: string;
}

export class ErrorHandler {
    private game: any;
    private errors: ErrorInfo[];
    private maxErrors: number;

    constructor(game: any) {
        this.game = game;
        this.errors = [];
        this.maxErrors = 50;

        this.setupGlobalHandlers();
    }

    setupGlobalHandlers(): void {
        // Catch unhandled errors
        window.addEventListener('error', (event: ErrorEvent) => {
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
        window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });

        logger.info('🛡️ Error handler initialized');
    }

    handleError(errorInfo: ErrorInfo): void {
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

    getErrors(): ErrorInfo[] {
        return [...this.errors];
    }

    clearErrors(): void {
        this.errors = [];
    }

    getErrorCount(): number {
        return this.errors.length;
    }
}
