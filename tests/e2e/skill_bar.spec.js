// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Skill Bar Smoke', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mageKnightTutorialCompleted', 'true');
        });

        await page.goto('/');
        await page.locator('#loading-screen').waitFor({ state: 'hidden', timeout: 30000 });

        try {
            const scenarioModal = page.locator('#scenario-selection-modal');
            await scenarioModal.waitFor({ state: 'visible', timeout: 5000 });
            await page.locator('.scenario-card').first().click();
            await scenarioModal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (e) {
            // Modal might not appear
        }

        try {
            const heroModal = page.locator('#hero-selection-modal');
            await heroModal.waitFor({ state: 'visible', timeout: 5000 });
            await page.locator('.hero-select-card').first().click();
            await heroModal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (e) {
            // Modal might not appear
        }

        try {
            const skipBtn = page.locator('#tutorial-skip-btn');
            if (await skipBtn.isVisible({ timeout: 2000 })) {
                await skipBtn.click();
            }
        } catch (e) {
            // Tutorial might not be active
        }

        await page.waitForTimeout(500);
    });

    test('renders skills when the hero has them', async ({ page }) => {
        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            if (!game || !game.hero) return;
            const skill = { id: 'flight', name: 'Flug', type: 'active', description: 'test', icon: '🦅' };
            game.hero.skills = [skill];
            if (game.ui && game.ui.skillRenderer) game.ui.skillRenderer.render(game.hero);
        });

        const skills = page.locator('.skill-item');
        await expect(skills.first()).toBeVisible({ timeout: 10000 });
        const count = await skills.count();
        expect(count).toBeGreaterThan(0);
    });

    test('clicking an active skill does not crash the game', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.evaluate(() => {
            const game = /** @type {any} */ (window).game;
            if (!game || !game.hero) return;
            const skill = { id: 'flight', name: 'Flug', type: 'active', description: 'test', icon: '🦅' };
            game.hero.skills = [skill];
            game.hero.usedSkills = new Set();
            if (game.ui && game.ui.skillRenderer) game.ui.skillRenderer.render(game.hero);
        });

        const activeSkill = page.locator('.skill-item.active').first();
        await expect(activeSkill).toBeVisible({ timeout: 10000 });
        await activeSkill.click();
        await page.waitForTimeout(500);

        const alive = await page.evaluate(() => !!(/** @type {any} */ (window).game) && !!(/** @type {any} */ (window).game.hero));
        expect(alive).toBe(true);
        expect(errors).toEqual([]);
    });
});
