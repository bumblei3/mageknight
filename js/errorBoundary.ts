/**
 * Global Error Boundary for Mage Knight
 * Catches unhandled errors and shows a user-friendly crash dialog
 * Provides error reporting and recovery options
 */

interface ErrorInfo {
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
    userAgent: string;
    gameState?: any;
    componentStack?: string;
}

interface ErrorBoundaryConfig {
    onError?: (error: Error, info: ErrorInfo) => void;
    showReportButton?: boolean;
    enableAutoRecovery?: boolean;
    maxErrorsPerSession?: number;
}

// Internal config (mutable)
const _errorConfig = {
    showReportButton: true,
    enableAutoRecovery: true,
    maxErrorsPerSession: 10
};

// Global error storage for reporting
const errorLog: ErrorInfo[] = [];
let errorCount = 0;
let hasShownCrashDialog = false;

// Extend Window interface for error boundary
declare global {
    interface Window {
        __MAGEKNIGHT_ERROR_BOUNDARY__?: {
            captureError: (error: Error, context?: Record<string, any>) => void;
            reset: () => void;
            getErrors: () => ErrorInfo[];
        };
    }
}

// Export for external access
export { errorLog, errorCount };

/**
 * Initializes the global error boundary
 * Should be called as early as possible in the app lifecycle
 */
export function initErrorBoundary(config: ErrorBoundaryConfig = {}): void {
    const {
        showReportButton = true,
        enableAutoRecovery = true,
        maxErrorsPerSession = 10
    } = config;

    _errorConfig.maxErrorsPerSession = maxErrorsPerSession;
    _errorConfig.showReportButton = showReportButton;
    _errorConfig.enableAutoRecovery = enableAutoRecovery;

    // Global unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error 
            ? event.reason 
            : new Error(String(event.reason));
        handleError(error, { type: 'unhandledrejection' });
        event.preventDefault(); // Prevent default browser behavior
    });

    // Global uncaught errors
    window.addEventListener('error', (event) => {
        const error = event.error instanceof Error 
            ? event.error 
            : new Error(event.message);
        handleError(error, { 
            type: 'uncaught',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    // React-style component error boundary (for manual use)
    window.__MAGEKNIGHT_ERROR_BOUNDARY__ = {
        captureError: (error: Error, context?: Record<string, any>) => {
            handleError(error, { type: 'boundary', context });
        },
        reset: () => {
            hasShownCrashDialog = false;
            errorCount = 0;
        },
        getErrors: () => [...errorLog]
    };

    console.log('[ErrorBoundary] Initialized');
}

/**
 * Main error handler
 */
function handleError(error: Error, extra: Record<string, any> = {}): void {
    // Prevent error spam
    if (errorCount >= _errorConfig.maxErrorsPerSession) {
        console.error('[ErrorBoundary] Max errors per session reached, suppressing:', error);
        return;
    }

    errorCount++;

    const errorInfo: ErrorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...extra
    };

    // Store for reporting
    errorLog.push(errorInfo);

    // Log to console
    console.error('[ErrorBoundary] Caught error:', errorInfo);

    // Call custom handler if provided
    if (_errorConfig.enableAutoRecovery) {
        attemptAutoRecovery(error);
    }

    // Show crash dialog for critical errors (not on first minor error)
    if (shouldShowCrashDialog(error, extra)) {
        showCrashDialog(error, errorInfo);
    }
}

/**
 * Determines if we should show the crash dialog
 */
function shouldShowCrashDialog(error: Error, extra: Record<string, any>): boolean {
    // Don't show for minor network errors that might self-recover
    if (extra.type === 'unhandledrejection' && error.message.includes('NetworkError')) {
        return false;
    }

    // Don't show if already shown (unless it's a different error)
    if (hasShownCrashDialog && errorCount <= 2) {
        return false;
    }

    // Show for critical errors
    const criticalPatterns = [
        /cannot read propert/i,
        /cannot read properties of null/i,
        /undefined is not a function/i,
        /cannot read property.*of undefined/i,
        /malformed/i,
        /out of memory/i
    ];

    const isCritical = criticalPatterns.some(p => p.test(error.message));

    return isCritical || errorCount > 3;
}

/**
 * Attempts automatic recovery for common errors
 */
function attemptAutoRecovery(error: Error): void {
    // Try to reload critical resources
    if (error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('chunk') ||
        error.message.includes('Loading chunk')) {
        
        console.log('[ErrorBoundary] Chunk load error detected, attempting reload...');
        const lastReload = localStorage.getItem('mk_last_import_reload');
        const now = Date.now();
        
        if (!lastReload || now - parseInt(lastReload) > 30000) {
            localStorage.setItem('mk_last_import_reload', now.toString());
            setTimeout(() => window.location.reload(), 1000);
        }
        return;
    }

    // Try to re-initialize game systems
    if ((window as any).game?.renderer?.reset) {
        console.log('[ErrorBoundary] Attempting soft recovery...');
        try {
            (window as any).game.renderer?.reset?.();
        } catch (e) {
            console.error('[ErrorBoundary] Soft recovery failed:', e);
        }
    }
}

/**
 * Creates and shows the crash dialog modal
 */
function showCrashDialog(error: Error, errorInfo: ErrorInfo): void {
    if (hasShownCrashDialog) return;
    hasShownCrashDialog = true;

    // Remove any existing crash dialog
    const existing = document.getElementById('mk-crash-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'mk-crash-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'crash-title');
    dialog.setAttribute('aria-describedby', 'crash-message');
    dialog.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px);
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    const stackPreview = error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available';

    dialog.innerHTML = `
        <div style="
            background: #1f2937;
            border: 2px solid #ef4444;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            animation: mk-slide-up 0.3s ease;
        ">
            <style>
                @keyframes mk-slide-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes mk-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                }
            </style>

            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 20px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div style="
                    width: 40px; height: 40px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.5rem; animation: mk-pulse 2s infinite;
                ">⚠</div>
                <div>
                    <h2 id="crash-title" style="margin: 0; font-size: 1.25rem; font-weight: 600;">
                        Ein unerwarteter Fehler ist aufgetreten
                    </h2>
                    <p style="margin: 4px 0 0; opacity: 0.9; font-size: 0.85rem;">
                        Das Spiel konnte nicht fortgesetzt werden.
                    </p>
                </div>
            </div>

            <!-- Content -->
            <div style="padding: 24px; max-height: 60vh; overflow-y: auto;">
                <!-- Error ID & Time -->
                <div style="
                    background: #111827;
                    border: 1px solid #374151;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    font-family: monospace;
                    font-size: 0.75rem;
                    color: #9ca3af;
                ">
                    <div><strong>Fehler-ID:</strong> ${generateErrorId()}</div>
                    <div><strong>Zeitpunkt:</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>Typ:</strong> ${error.name || 'Error'}</div>
                </div>

                <!-- Message -->
                <div style="margin-bottom: 16px;">
                    <strong style="color: #d1d5db; font-size: 0.85rem;">Fehlermeldung:</strong>
                    <div id="crash-message" style="
                        background: #111827;
                        border: 1px solid #374151;
                        border-radius: 8px;
                        padding: 12px;
                        margin-top: 8px;
                        font-family: monospace;
                        font-size: 0.8rem;
                        color: #fca5a5;
                        white-space: pre-wrap;
                        word-break: break-word;
                        max-height: 150px;
                        overflow: auto;
                    ">${escapeHtml(error.message || 'Unbekannter Fehler')}</div>
                </div>

                <!-- Stack Trace (collapsible) -->
                <details style="margin-bottom: 16px;">
                    <summary style="
                        cursor: pointer;
                        color: #9ca3af;
                        font-size: 0.85rem;
                        padding: 8px 0;
                        user-select: none;
                    ">Stack Trace anzeigen (${error.stack?.split('\n').length || 0} Zeilen)</summary>
                    <div style="
                        background: #111827;
                        border: 1px solid #374151;
                        border-radius: 8px;
                        padding: 12px;
                        margin-top: 8px;
                        font-family: monospace;
                        font-size: 0.7rem;
                        color: #9ca3af;
                        white-space: pre-wrap;
                        word-break: break-word;
                        max-height: 200px;
                        overflow: auto;
                    ">${escapeHtml(error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available')}</div>
                </details>

                <!-- Game State (if available) -->
                ${errorInfo.gameState ? `
                    <details style="margin-bottom: 16px;">
                        <summary style="cursor: pointer; color: #9ca3af; font-size: 0.85rem;">Spielstand (Debug)</summary>
                        <div style="
                            background: #111827;
                            border: 1px solid #374151;
                            border-radius: 8px;
                            padding: 12px;
                            margin-top: 8px;
                            font-family: monospace;
                            font-size: 0.7rem;
                            color: #9ca3af;
                            white-space: pre-wrap;
                            word-break: break-word;
                            max-height: 150px;
                            overflow: auto;
                        ">${escapeHtml(JSON.stringify(errorInfo.gameState, null, 2))}</div>
                    </details>
                ` : ''}

                <!-- Actions -->
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                    <button id="crash-reload" class="mk-btn mk-btn--primary mk-btn--lg mk-btn--block" style="width: 100%;">
                        🔄 Seite neu laden (empfohlen)
                    </button>
                    <button id="crash-soft-reset" class="mk-btn mk-btn--secondary mk-btn--lg mk-btn--block" style="width: 100%;">
                        🔧 Weiches Reset (Spielstand behalten)
                    </button>
                    ${_errorConfig.showReportButton ? `
                        <button id="crash-report" class="mk-btn mk-btn--ghost mk-btn--lg mk-btn--block" style="width: 100%;">
                            📋 Fehlerbericht kopieren
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Event listeners
    const reloadBtn = dialog.querySelector('#crash-reload') as HTMLButtonElement;
    const softResetBtn = dialog.querySelector('#crash-soft-reset') as HTMLButtonElement;
    const reportBtn = dialog.querySelector('#crash-report') as HTMLButtonElement | null;

    reloadBtn?.addEventListener('click', () => {
        localStorage.setItem('mk_crash_reload', Date.now().toString());
        window.location.reload();
    });

    softResetBtn?.addEventListener('click', () => {
        attemptSoftReset(dialog);
    });

    const reportBtnEl = dialog.querySelector('#crash-report') as HTMLButtonElement | null;
    reportBtnEl?.addEventListener('click', () => {
        copyErrorReport(errorInfo);
    });

    // Focus first button
    setTimeout(() => reloadBtn?.focus(), 100);
}

/**
 * Attempts a soft reset of the game state
 */
function attemptSoftReset(dialog: HTMLElement): void {
    try {
        // Try to gracefully reset game state
        if ((window as any).game) {
            const game = (window as any).game;
            
            // Reset combat if in progress
            if (game.combat) {
                game.combat = null;
                game.combatOrchestrator?.reset?.();
            }
            
            // Exit movement mode
            if (game.movementMode && game.actionManager) {
                game.actionManager.exitMovementMode();
            }
            
            // Clear error state
            hasShownCrashDialog = false;
            errorCount = 0;
            
            // Hide dialog
            dialog.remove();
            
            // Notify user
            if (game.showToast) {
                game.showToast('Spielstand wurde zurückgesetzt. Sie können weiterspielen.', 'info');
            }
            
            // Re-render
            game.render?.();
            game.updateStats?.();
            
            console.log('[ErrorBoundary] Soft reset successful');
        } else {
            throw new Error('No game instance found');
        }
    } catch (e) {
        console.error('[ErrorBoundary] Soft reset failed:', e);
        // Fallback to reload
        localStorage.setItem('mk_crash_reload', Date.now().toString());
        window.location.reload();
    }
}

/**
 * Copies error report to clipboard
 */
function copyErrorReport(errorInfo: ErrorInfo): void {
    const report = [
        '=== Mage Knight Error Report ===',
        `Error ID: ${generateErrorId()}`,
        `Timestamp: ${new Date(errorInfo.timestamp).toISOString()}`,
        `URL: ${errorInfo.url}`,
        `User Agent: ${errorInfo.userAgent}`,
        '',
        `Error: ${errorInfo.message}`,
        '',
        'Stack Trace:',
        errorInfo.stack || 'No stack trace',
        '',
        'Game State:',
        JSON.stringify(errorInfo.gameState || {}, null, 2)
    ].join('\n');

    navigator.clipboard.writeText(report).then(() => {
        if ((window as any).game?.showToast) {
            (window as any).game.showToast('Fehlerbericht in Zwischenablage kopiert', 'success');
        }
    }).catch(() => {
        // Fallback: show in prompt
        prompt('Fehlerbericht (Strg+C zum Kopieren):', report);
    });
}

/**
 * Generates a short error ID
 */
function generateErrorId(): string {
    return `MK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Escapes HTML for safe insertion
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Exports all errors as JSON for bug reports
 */
export function exportErrorLog(): string {
    return JSON.stringify({
        exportTime: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorCount,
        errors: errorLog
    }, null, 2);
}

/**
 * Clears error log
 */
export function clearErrorLog(): void {
    errorLog.length = 0;
    errorCount = 0;
    hasShownCrashDialog = false;
}

/**
 * Gets the current error config
 */
export function getErrorConfig(): Readonly<typeof _errorConfig> {
    return { ..._errorConfig };
}

/**
 * Sets error config values
 */
export function setErrorConfig(config: Partial<typeof _errorConfig>): void {
    Object.assign(_errorConfig, config);
}