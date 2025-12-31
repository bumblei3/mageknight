import { describe, it, expect, beforeEach } from './testRunner.js';
import { TooltipManager } from '../js/tooltip.js';
import { createMockUI } from './test-mocks.js';

describe('TooltipManager Helpers', () => {
    let tooltipManager;
    let mockGame;

    beforeEach(() => {
        mockGame = { ui: createMockUI() };
        tooltipManager = new TooltipManager(mockGame);
    });

    it('should get correct action icons', () => {
        const actions = ['heal', 'recruit', 'attack', 'train', 'learn', 'explore', 'unknown'];
        const expected = ['❤️', '👥', '⚔️', '📚', '✨', '🔍', '•'];

        actions.forEach((action, i) => {
            expect(tooltipManager.getActionIcon(action)).toBe(expected[i]);
        });
    });

    it('should get correct action names', () => {
        const actions = ['heal', 'recruit', 'attack', 'train', 'learn', 'explore', 'unknown'];
        const expected = ['Heilen', 'Rekrutieren', 'Angreifen', 'Trainieren', 'Lernen', 'Erkunden', 'unknown'];

        actions.forEach((action, i) => {
            expect(tooltipManager.getActionName(action)).toBe(expected[i]);
        });
    });
    it('should create site tooltip HTML with actions', () => {
        const mockSite = {
            getInfo: () => ({
                name: 'Village',
                icon: '🏘️',
                description: 'A peaceful village',
                color: 'green',
                actions: ['heal', 'recruit']
            }),
            conquered: false,
            visited: true
        };
        const html = tooltipManager.createSiteTooltipHTML(mockSite);
        expect(html).toContain('Besucht');
        expect(html).toContain('tooltip-actions');
        expect(html).toContain('❤️ Heilen');
    });
});
