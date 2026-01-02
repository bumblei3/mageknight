import { describe, it, expect, beforeEach } from './testRunner.js';
import { createSpy } from './test-mocks.js';
import { TooltipManager } from '../js/ui/TooltipManager.js';
import { CombatUIManager } from '../js/ui/CombatUIManager.js';

// Mock UI and Game
class MockUI {
    constructor() {
        this.tooltipManager = new TooltipManager();
        this.game = {
            combat: {
                blockedEnemies: new Set(),
                getPredictedOutcome: () => null
            }
        };
    }
}

describe('UI Tooltips', () => {
    let tooltipManager;
    let combatUIManager;
    let mockUI;

    beforeEach(() => {
        // Setup simple DOM for tooltip
        document.body.innerHTML = '';
        mockUI = new MockUI();
        tooltipManager = mockUI.tooltipManager;
        combatUIManager = new CombatUIManager({}, mockUI);
    });

    it('should create tooltip element on init', () => {
        const tooltip = document.querySelector('.game-tooltip');
        expect(tooltip).toBeTruthy();
        expect(tooltip.style.display).toBe('none');
    });

    it('should generate correct HTML for ability tooltip', () => {
        const html = tooltipManager.createAbilityTooltipHTML('vampiric');
        expect(html).toContain('Vampiric');
        expect(html).toContain('Vampirismus'); // Assuming german or english fallback works, here we test content existence
        expect(html).toContain('tooltip-ability-desc');
    });

    it('should attach tooltips to capability icons in renderEnemy', () => {
        const enemy = {
            id: 'vamp1',
            name: 'Vampire',
            armor: 5,
            attack: 6,
            fame: 4,
            vampiric: true,
            poison: true,
            attackType: 'physical', // Added defaults to avoid errors
            getEffectiveAttack: () => 6,
            getBlockRequirement: () => 6,
            getCurrentArmor: () => 5, // Added mock method
            getResistanceMultiplier: () => 1
        };

        const attachSpy = createSpy(tooltipManager.attachToElement);
        tooltipManager.attachToElement = attachSpy;

        const el = combatUIManager.renderEnemy(enemy, 'ranged', null);

        // Check if icons exist
        const icons = el.querySelectorAll('.ability-icon');
        expect(icons.length).toBe(2); // Vampiric and Poison

        // Check if tooltip attached (spy called)
        expect(attachSpy.callCount).toBe(2);

        // Verify data attributes
        expect(icons[0].dataset.tooltipType).toBe('ability');
        expect(icons[0].dataset.tooltipKey).toBe('poison'); // Order depends on template, poison is before vampiric in list
    });

    it('should auto-detect capability tooltip from data attribute', () => {
        // Create a mock element
        const element = document.createElement('span');
        element.dataset.tooltipType = 'ability';
        element.dataset.tooltipKey = 'swift';
        document.body.appendChild(element);

        // We spy on showTooltip instead of actually showing it visually
        const showSpy = createSpy();
        tooltipManager.showTooltip = showSpy;

        // Attach logic (restores original method for this test)
        // We need to re-create manager or manually call attach for THIS element
        tooltipManager.attachToElement(element);

        // Simulate mouseenter with a plain object to avoid Event constructor issues in test env
        element.dispatchEvent({ type: 'mouseenter' });

        expect(showSpy.callCount).toBe(1);
        const content = showSpy.calls[0][1];
        expect(content).toContain('Swift');
        expect(content).toContain('Flink');
    });
});
