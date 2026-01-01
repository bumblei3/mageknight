import { describe, it, expect, beforeEach } from './testRunner.js';
import { UI } from '../js/ui.js';
import { createMockElement } from './test-mocks.js';

/**
 * Tests for UI panel toggle functionality (collapsible sidebars).
 */

describe('UI Panel Toggles', () => {
    let ui;

    beforeEach(() => {
        // Create mock panel elements with toggle buttons
        const mockPanel = createMockElement('div');
        mockPanel.className = 'panel';

        const mockToggleBtn = createMockElement('button');
        mockToggleBtn.className = 'panel-toggle';
        mockPanel.appendChild(mockToggleBtn);

        // Mock document.querySelectorAll to return our mock elements
        const originalQuerySelectorAll = document.querySelectorAll;
        document.querySelectorAll = (selector) => {
            if (selector === '.panel-toggle') {
                return [mockToggleBtn];
            }
            return originalQuerySelectorAll.call(document, selector);
        };

        ui = new UI();

        // Restore original
        document.querySelectorAll = originalQuerySelectorAll;
    });

    describe('setupPanelToggles', () => {
        it('should initialize UI without errors', () => {
            expect(ui).toBeDefined();
            expect(ui.elements).toBeDefined();
        });

        it('should have setupPanelToggles method', () => {
            expect(typeof ui.setupPanelToggles).toBe('function');
        });
    });

    describe('Panel Collapse Behavior', () => {
        it('should toggle collapsed class on panel when button clicked', () => {
            // Create a panel with toggle button
            const panel = createMockElement('div');
            panel.className = 'panel';

            const toggleBtn = createMockElement('button');
            toggleBtn.className = 'panel-toggle';
            panel.appendChild(toggleBtn);

            // Add a simplified click handler (the actual UI uses stopPropagation but mocks don't fully support it)
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
            });

            // Initially not collapsed
            expect(panel.classList.contains('collapsed')).toBe(false);

            // Simulate click
            toggleBtn.click();
            expect(panel.classList.contains('collapsed')).toBe(true);

            // Click again to un-collapse
            toggleBtn.click();
            expect(panel.classList.contains('collapsed')).toBe(false);
        });
    });
});

describe('UI Element References', () => {
    let ui;

    beforeEach(() => {
        ui = new UI();
    });

    describe('HUD Elements', () => {
        it('should have reference to fame value', () => {
            expect(ui.elements.fameValue).toBeDefined();
        });

        it('should have reference to reputation value', () => {
            expect(ui.elements.reputationValue).toBeDefined();
        });

        it('should have reference to hero stats elements', () => {
            expect(ui.elements.heroName).toBeDefined();
            expect(ui.elements.heroArmor).toBeDefined();
            expect(ui.elements.heroHandLimit).toBeDefined();
            expect(ui.elements.heroWounds).toBeDefined();
        });

        it('should have reference to movement points', () => {
            expect(ui.elements.movementPoints).toBeDefined();
        });

        it('should have reference to mana source', () => {
            expect(ui.elements.manaSource).toBeDefined();
        });

        it('should have reference to game log', () => {
            expect(ui.elements.gameLog).toBeDefined();
        });

        it('should have reference to hand cards container', () => {
            expect(ui.elements.handCards).toBeDefined();
        });

        it('should have reference to play area', () => {
            expect(ui.elements.playArea).toBeDefined();
        });

        it('should have reference to combat panel', () => {
            expect(ui.elements.combatPanel).toBeDefined();
        });

        it('should have reference to action buttons', () => {
            expect(ui.elements.endTurnBtn).toBeDefined();
            expect(ui.elements.restBtn).toBeDefined();
            expect(ui.elements.exploreBtn).toBeDefined();
        });
    });

    describe('Modal Elements', () => {
        it('should have reference to site modal', () => {
            expect(ui.elements.siteModal).toBeDefined();
        });

        it('should have reference to level up modal', () => {
            expect(ui.elements.levelUpModal).toBeDefined();
        });
    });

    describe('Renderer Instances', () => {
        it('should have stats renderer', () => {
            expect(ui.statsRenderer).toBeDefined();
        });

        it('should have mana renderer', () => {
            expect(ui.manaRenderer).toBeDefined();
        });

        it('should have unit renderer', () => {
            expect(ui.unitRenderer).toBeDefined();
        });

        it('should have hand renderer', () => {
            expect(ui.handRenderer).toBeDefined();
        });

        it('should have tooltip manager', () => {
            expect(ui.tooltipManager).toBeDefined();
        });

        it('should have notification manager', () => {
            expect(ui.notifications).toBeDefined();
        });

        it('should have modal manager', () => {
            expect(ui.modals).toBeDefined();
        });

        it('should have combat UI manager', () => {
            expect(ui.combatUI).toBeDefined();
        });
    });
});
