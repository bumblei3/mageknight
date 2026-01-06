import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FloatingTextManager } from '../../js/ui/FloatingTextManager.js';

describe('FloatingTextManager', () => {
    let container;
    let manager;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        manager = new FloatingTextManager(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        manager.clear();
    });

    it('should create a container layer', () => {
        const layer = container.querySelector('#floating-text-layer');
        expect(layer).not.toBeNull();
        expect(layer.style.pointerEvents).toBe('none');
    });

    it('should set parent position to relative if static', () => {
        container.style.position = 'static';
        // Re-initialize to trigger check
        new FloatingTextManager(container);
        expect(container.style.position).toBe('relative');
    });

    it('should spawn text element', () => {
        manager.spawn(100, 100, 'Test', 'info');
        const textEl = container.querySelector('.floating-text');

        expect(textEl).not.toBeNull();
        expect(textEl.textContent).toBe('Test');
        expect(textEl.classList.contains('ft-info')).toBe(true);
    });

    it('should cleanup element after animation', async () => {
        vi.useFakeTimers();
        manager.spawn(100, 100, 'Fade', 'info');

        expect(container.querySelectorAll('.floating-text').length).toBe(1);

        vi.advanceTimersByTime(2500); // Wait for timeout

        expect(container.querySelectorAll('.floating-text').length).toBe(0);
        vi.useRealTimers();
    });

    it('should spawn different types of text', () => {
        manager.spawn(0, 0, '-5', 'damage');
        manager.spawn(0, 0, '+5', 'heal');
        manager.spawn(0, 0, 'Crit!', 'crit');

        expect(container.querySelector('.ft-damage')).not.toBeNull();
        expect(container.querySelector('.ft-heal')).not.toBeNull();
        expect(container.querySelector('.ft-crit')).not.toBeNull();
    });
});
