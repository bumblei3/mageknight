
import { describe, it, expect, beforeEach, afterEach } from '../testRunner.js';
import UI from '../../js/ui.js';
import { setupGlobalMocks, resetMocks, createSpy, MockHTMLElement } from '../test-mocks.js';

// Setup global mocks
setupGlobalMocks();

describe('UI Robustness', () => {
    let ui;

    beforeEach(() => {
        resetMocks();
        // Standard setup
        ui = new UI();
    });

    afterEach(() => {
        resetMocks();
    });

    it('should handle updateHeroStats even if some elements are missing', () => {
        // Artificially remove an element from ui.elements
        ui.elements.heroArmor = null;

        const heroMock = {
            getStats: () => ({
                name: 'Test',
                level: 1,
                armor: 3,
                handLimit: 5,
                wounds: 0,
                fame: 10,
                reputation: 0,
                move: 2
            }),
            healingPoints: 0
        };

        // Should not throw
        expect(() => ui.updateHeroStats(heroMock)).not.toThrow();

        // Verify other elements still updated
        if (ui.elements.heroName) {
            expect(ui.elements.heroName.textContent).toBe('Test');
        }
    });

    it('should handle renderUnits with units missing methods', () => {
        const brokenUnit = {
            name: 'Broken Unit'
            // Missing isReady, getIcon, etc.
        };

        const hero = { units: [brokenUnit] };

        // Should not throw
        expect(() => ui.renderUnits(hero.units)).not.toThrow();

        // Check if it rendered something
        if (ui.elements.heroUnits) {
            expect(ui.elements.heroUnits.children.length).toBeGreaterThan(0);
        }
    });

    it('should handle showLevelUpModal missing elements gracefully', () => {
        // Remove critical modal elements
        ui.elements.levelUpModal = null;

        // Should not throw
        expect(() => ui.showLevelUpModal(2, { skills: [], cards: [] }, () => { })).not.toThrow();
    });

    it('should handle multiple rapid notifications without overlapping', () => {
        // This tests logic if toast container handles multiple appends
        ui.showNotification('Message 1', 'info');
        ui.showNotification('Message 2', 'success');

        const toasts = ui.notifications.toastContainer;
        expect(toasts.children.length).toBe(2);

        // Check content
        expect(toasts.children[0].textContent).toContain('Message 1');
        expect(toasts.children[1].textContent).toContain('Message 2');
    });

    it('should safely ignore missing tooltip manager', () => {
        ui.tooltipManager = null;

        const manaSourceMock = {
            getAvailableDice: () => []
        };

        // renderManaSource uses tooltipManager
        expect(() => ui.renderManaSource(manaSourceMock)).not.toThrow();
    });
});
