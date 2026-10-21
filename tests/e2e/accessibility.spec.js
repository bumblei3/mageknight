import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { GameFlow } from './utils/GameFlow.js';

test.describe('Accessibility (WCAG 2.1 AA)', () => {
    test('Scenario Selection Modal has no WCAG 2.1 AA violations', async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    test('Settings Modal has no WCAG 2.1 AA violations', async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();

        await page.waitForSelector('#settings-btn', { state: 'visible', timeout: 10000 });
        await page.evaluate(() => {
            const overlay = document.getElementById('day-night-overlay');
            if (overlay) overlay.classList.remove('active');
            const btn = document.getElementById('settings-btn');
            if (btn) btn.click();
        });
        await page.waitForSelector('#settings-modal', { state: 'visible', timeout: 10000 });

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
