import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIcon, replaceWithIcon, ICONS } from '../../js/ui/icons.js';

describe('UI Icons - Coverage Boost', () => {
    describe('ICONS constant', () => {
        it('should have all expected icon keys', () => {
            expect(ICONS.settings).toBeDefined();
            expect(ICONS.dice).toBeDefined();
            expect(ICONS.globe).toBeDefined();
            expect(ICONS.refresh).toBeDefined();
            expect(ICONS.save).toBeDefined();
            expect(ICONS.folder).toBeDefined();
            expect(ICONS.undo).toBeDefined();
            expect(ICONS.help).toBeDefined();
            expect(ICONS.trophy).toBeDefined();
            expect(ICONS.chart).toBeDefined();
            expect(ICONS.shield).toBeDefined();
            expect(ICONS.cards).toBeDefined();
            expect(ICONS.heart).toBeDefined();
            expect(ICONS.footprints).toBeDefined();
            expect(ICONS.sword).toBeDefined();
            expect(ICONS.shieldHalf).toBeDefined();
            expect(ICONS.sparkles).toBeDefined();
            expect(ICONS.heartPulse).toBeDefined();
            expect(ICONS.crosshair).toBeDefined();
            expect(ICONS.zap).toBeDefined();
            expect(ICONS.wizard).toBeDefined();
            expect(ICONS.gem).toBeDefined();
            expect(ICONS.crystal).toBeDefined();
            expect(ICONS.heartCrack).toBeDefined();
        });

        it('all icons should be valid SVG strings', () => {
            Object.values(ICONS).forEach(icon => {
                expect(typeof icon).toBe('string');
                expect(icon.startsWith('<svg')).toBe(true);
                expect(icon.includes('viewBox')).toBe(true);
            });
        });
    });

    describe('getIcon', () => {
        it('should return SVG for valid icon name', () => {
            const icon = getIcon('settings');
            expect(icon).toContain('<svg');
            expect(icon).toContain('viewBox');
        });

        it('should add custom className to SVG', () => {
            const icon = getIcon('settings', 'custom-class');
            expect(icon).toContain('class="hud-icon custom-class"');
        });

        it('should return empty string for unknown icon', () => {
            const icon = getIcon('nonexistent');
            expect(icon).toBe('');
        });

        it('should return icon without className when not provided', () => {
            const icon = getIcon('save');
            expect(icon).toContain('class="hud-icon"');
            expect(icon).not.toContain('undefined');
        });
    });

    describe('replaceWithIcon', () => {
        let element;

        beforeEach(() => {
            element = document.createElement('div');
        });

        it('should replace element innerHTML with icon SVG', () => {
            replaceWithIcon(element, 'save');
            expect(element.innerHTML).toContain('<svg');
            expect(element.innerHTML).toContain('class="hud-icon"');
        });

        it('should do nothing for unknown icon', () => {
            const originalHTML = element.innerHTML;
            replaceWithIcon(element, 'nonexistent');
            expect(element.innerHTML).toBe(originalHTML);
        });

        it('should do nothing when element is null', () => {
            // Should not throw
            expect(() => replaceWithIcon(null, 'save')).not.toThrow();
        });
    });
});