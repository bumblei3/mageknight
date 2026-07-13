/**
 * Recoverable error UI for the loading screen.
 *
 * If game initialization fails, we must not leave the user stuck on an
 * infinite spinner. Instead we show a clear error state plus a manual
 * "Neu laden" (reload) button so a transient failure (e.g. a half-deployed
 * JS chunk after a new deployment) is self-healing.
 */

export function showLoadingError(error: unknown): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    // Ensure the screen is visible (in case it was already fading out)
    loadingScreen.classList.remove('hidden');

    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = 'Das Spiel konnte nicht geladen werden.';
        statusEl.style.color = 'var(--color-red-400, #f87171)';
    }

    // Avoid adding the button twice on repeated failures
    if (loadingScreen.querySelector('.loading-error-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'loading-error-actions';
    actions.style.cssText = 'display:flex;gap:var(--space-3);margin-top:var(--space-4);z-index:1;';

    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'action-btn primary';
    reloadBtn.textContent = 'Neu laden';
    reloadBtn.addEventListener('click', () => window.location.reload());

    const detail = document.createElement('span');
    detail.style.cssText = 'font-size:0.75rem;color:rgba(255,255,255,0.6);max-width:320px;text-align:center;';
    const rawMsg = error instanceof Error ? error.message : error == null ? '' : String(error);
    detail.textContent = rawMsg ? `Details: ${rawMsg}` : 'Unbekannter Fehler.';

    actions.appendChild(reloadBtn);
    actions.appendChild(detail);
    loadingScreen.appendChild(actions);

    // Surface to the global error boundary too (report button if enabled)
    const boundary = (window as any).mkErrorBoundary;
    if (boundary?.reportError) {
        try {
            boundary.reportError(error);
        } catch {
            /* no-op */
        }
    }
}
