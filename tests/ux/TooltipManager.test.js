/**
 * Tests for TooltipManager
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TooltipManager } from '../../js/ui/TooltipManager.js';

// Mock translation function
vi.mock('../../js/i18n/index.js', () => {
    const t = vi.fn((key) => {
        if (key === 'enemies.abilities.descriptions.swift') return 'Swift: Requires double block.';
        if (key === 'cards.basicEffect') return 'Basic Effect';
        if (key === 'cards.actions.movement') return 'Movement';
        return key;
    });
    return {
        default: { t },
        t
    };
});

describe('TooltipManager', () => {
    let tooltipManager;

    beforeEach(() => {
        document.body.innerHTML = '';
        tooltipManager = new TooltipManager();
        vi.useFakeTimers();
        // Mock requestAnimationFrame to integrate with fake timers
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('should create tooltip element on initialization', () => {
            const tooltip = document.querySelector('.game-tooltip');
            expect(tooltip).not.toBeNull();
            expect(tooltip.style.display).toBe('none');
        });
    });

    describe('Content Generation', () => {
        it('should generate Ability Tooltip HTML correctly', () => {
            const html = tooltipManager.createAbilityTooltipHTML('swift');
            expect(html).toContain('Swift');
            expect(html).toContain('Requires double block');
            expect(html).toContain('💨'); // Icon check
        });

        it('should generate Enemy Tooltip HTML correctly', () => {
            const enemy = {
                name: 'Orc',
                armor: 3,
                attack: 4,
                fame: 2,
                fortified: true
            };
            const html = tooltipManager.createEnemyTooltipHTML(enemy);
            expect(html).toContain('Orc');
            expect(html).toContain('3'); // Armor
            expect(html).toContain('4'); // Attack
            expect(html).toContain('fortified');
        });

        it('should generate Card Tooltip HTML correctly', () => {
            const card = {
                name: 'March',
                color: 'green',
                canPlaySideways: () => true,
                getEffect: () => ({ movement: 2 }),
                manaCost: ['green']
            };

            const html = tooltipManager.createCardTooltipHTML(card);
            expect(html).toContain('March');
            expect(html).toContain('Basic Effect');
            expect(html).toContain('Movement');
            expect(html).toContain('+2');
        });

        it('should inject glossary terms into description', () => {
            const input = "Dieser Feind ist Flink und hat Gift.";
            const output = tooltipManager.injectKeywords(input);

            expect(output).toContain('data-term="swift"');
            expect(output).toContain('data-term="poison"');
            expect(output).toContain('<span class="glossary-term"');
        });

        it('should support HTML in stat tooltips', () => {
            const htmlDesc = '<span class="warning">Warnung</span>';
            const output = tooltipManager.createStatTooltipHTML('Stats', htmlDesc);

            expect(output).toContain(htmlDesc);
            expect(output).not.toContain(`<div class="tooltip-description">${htmlDesc}</div>`);
        });

        it('should wrap plain text in stat tooltips', () => {
            const textDesc = 'Just text';
            const output = tooltipManager.createStatTooltipHTML('Stats', textDesc);

            expect(output).toContain(`<div class="tooltip-description">${textDesc}</div>`);
        });
    });

    describe('Interaction', () => {
        it('should show tooltip on element', () => {
            const element = document.createElement('div');
            document.body.appendChild(element);

            // Mock getBoundingClientRect for positioning logic
            element.getBoundingClientRect = () => ({
                left: 100, top: 100, width: 50, height: 50, right: 150, bottom: 150
            });

            tooltipManager.showTooltip(element, 'Test Content');

            const tooltip = document.querySelector('.game-tooltip');
            expect(tooltip.innerHTML).toContain('Test Content');
            expect(tooltip.style.display).toBe('block');

            // Fast forward for fade in (flushes nested requestAnimationFrame mocks)
            vi.runAllTimers();
            expect(tooltip.style.opacity).toBe('1');
        });

        it('should hide tooltip with delay', () => {
            const element = document.createElement('div');
            tooltipManager.showTooltip(element, 'Test');

            tooltipManager.hideTooltip(100);

            const tooltip = document.querySelector('.game-tooltip');

            // Should still be visible immediately
            expect(tooltip.style.display).toBe('block');

            // Advance past delay
            vi.advanceTimersByTime(100);
            expect(tooltip.style.opacity).toBe('0');

            // Advance past fade out
            vi.advanceTimersByTime(200);
            expect(tooltip.style.display).toBe('none');
        });
    });
});
