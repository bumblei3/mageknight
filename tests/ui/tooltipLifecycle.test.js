/**
 * Tooltip lifecycle: a hide that already started must not kill a tooltip that
 * was shown again afterwards.
 *
 * hideTooltip() fades out (opacity 0) and force-hides 200 ms later. That tail
 * used to be an anonymous setTimeout nobody could cancel, so `hide → show`
 * within 200 ms left the freshly-shown tooltip invisible: hovering quickly from
 * one target to the next showed nothing. This is what kept the Playwright
 * `unit_management` tooltip step red.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TooltipManager } from '../../js/ui/TooltipManager';

function tooltipElement() {
    return document.querySelector('.game-tooltip');
}

describe('TooltipManager hide/show race', () => {
    let manager;
    let target;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '<div id="target" data-tooltip="Hallo">Ziel</div>';
        manager = new TooltipManager();
        target = document.getElementById('target');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps a tooltip that is shown again 100 ms after a hide', () => {
        manager.showTooltip(target, '<div>Erster</div>');
        manager.hideTooltip(50);

        vi.advanceTimersByTime(60); // delayed hide fired: fade-out started
        expect(tooltipElement().style.opacity).toBe('0');

        manager.showTooltip(target, '<div>Zweiter</div>');
        vi.advanceTimersByTime(500); // the old 200 ms tail would hide it here

        expect(tooltipElement().style.display).toBe('block');
        expect(tooltipElement().textContent).toContain('Zweiter');
    });

    it('still hides the tooltip when nothing re-shows it', () => {
        manager.showTooltip(target, '<div>Nur einmal</div>');
        manager.hideTooltip(0);

        vi.advanceTimersByTime(500);

        expect(tooltipElement().style.display).toBe('none');
    });

    it('cancels a pending delayed hide when the pointer moves to a new target', () => {
        manager.showTooltip(target, '<div>Alt</div>');
        manager.hideTooltip(100);
        manager.showTooltip(target, '<div>Neu</div>');

        vi.advanceTimersByTime(400);

        expect(tooltipElement().style.display).toBe('block');
        expect(tooltipElement().textContent).toContain('Neu');
    });
});
