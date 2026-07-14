/**
 * Unit tests for the loading-screen error recovery UI.
 * Guards against regressions in the "stuck on infinite spinner" failure mode.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showLoadingError } from '../js/loadingError';

function buildLoadingScreen() {
    document.body.innerHTML = `
        <div id="loading-screen">
            <div id="loading-status">Lade…</div>
            <div id="loading-progress" style="width: 0%"></div>
        </div>
    `;
}

describe('showLoadingError', () => {
    beforeEach(() => {
        buildLoadingScreen();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete window.mkErrorBoundary;
    });

    it('shows a recoverable error state with a reload button', () => {
        showLoadingError(new Error('boom'));

        const screen = document.getElementById('loading-screen');
        expect(screen).not.toBeNull();
        expect(screen.classList.contains('hidden')).toBe(false);

        const status = document.getElementById('loading-status');
        expect(status.textContent).toContain('konnte nicht geladen');

        const reloadBtn = screen.querySelector('.loading-error-actions button');
        expect(reloadBtn).not.toBeNull();
        expect(reloadBtn.textContent).toBe('Neu laden');
    });

    it('includes the error message detail', () => {
        showLoadingError(new Error('chunk failed to load'));
        const detail = document.querySelector('.loading-error-actions span');
        expect(detail.textContent).toContain('chunk failed to load');
    });

    it('does not append the actions block twice on repeated calls', () => {
        showLoadingError(new Error('a'));
        showLoadingError(new Error('b'));
        const blocks = document.querySelectorAll('.loading-error-actions');
        expect(blocks.length).toBe(1);
    });

    it('falls back to "Unbekannter Fehler" for nullish values', () => {
        showLoadingError(null);
        const detail = document.querySelector('.loading-error-actions span');
        expect(detail.textContent).toContain('Unbekannter Fehler');
    });
});

describe('showLoadingError - edge branches', () => {
    beforeEach(() => {
        buildLoadingScreen();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete window.mkErrorBoundary;
    });

    it('returns silently when #loading-screen is absent (no crash)', () => {
        document.body.innerHTML = '<div id="other"></div>';
        expect(() => showLoadingError(new Error('x'))).not.toThrow();
    });

    it('stringifies a non-Error string error value', () => {
        showLoadingError('network timeout');
        const detail = document.querySelector('.loading-error-actions span');
        expect(detail.textContent).toContain('Details: network timeout');
    });

    it('stringifies a numeric error value', () => {
        showLoadingError(500);
        const detail = document.querySelector('.loading-error-actions span');
        expect(detail.textContent).toContain('Details: 500');
    });

    it('reports to the global error boundary when present', () => {
        const reportError = vi.fn();
        window.mkErrorBoundary = { reportError };
        const err = new Error('boom');
        showLoadingError(err);
        expect(reportError).toHaveBeenCalledWith(err);
    });

    it('does not crash if the error boundary itself throws', () => {
        window.mkErrorBoundary = {
            reportError: () => {
                throw new Error('boundary down');
            },
        };
        expect(() => showLoadingError(new Error('boom'))).not.toThrow();
    });
});
