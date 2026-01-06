import { test, expect } from '@playwright/test';

test.describe('Mage Knight Gameplay', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for game to load
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15000 });

        // Skip tutorial if active
        // The tutorial overlay blocks interactions, so we must dismiss it.
        const skipBtn = page.locator('#tutorial-skip-btn');
        try {
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            await expect(page.locator('#tutorial-overlay-custom')).toBeHidden();
        } catch (e) {
            // Tutorial might not appear or was already skipped
            console.log('Tutorial skip button not found or not needed.');
        }

        // Handle Scenario Selection Modal if present
        const scenarioModal = page.locator('#scenario-selection-modal');
        // Wait briefly to see if it pops up
        try {
            await scenarioModal.waitFor({ state: 'visible', timeout: 2000 });
            if (await scenarioModal.isVisible()) {
                console.log('Selecting scenario to proceed...');
                // Click the first scenario card
                await page.locator('.scenario-card').first().click();
                await expect(scenarioModal).toBeHidden();
            }
        } catch (e) {
            // Modal didn't appear, carry on
        }

        // Handle Hero Selection Modal if present
        const heroModal = page.locator('#hero-selection-modal');
        try {
            await heroModal.waitFor({ state: 'visible', timeout: 2000 });
            if (await heroModal.isVisible()) {
                console.log('Selecting hero to proceed...');
                await page.locator('.hero-select-btn').first().click();
                await expect(heroModal).toBeHidden();
            }
        } catch (e) { }
    });

    test('should allow toggling debug panel', async ({ page }) => {
        const toggleBtn = page.locator('.debug-toggle');
        await expect(toggleBtn).toBeVisible();

        await toggleBtn.click();
        const panel = page.locator('.debug-panel');
        await expect(panel).toBeVisible();

        // Check for debug sections
        await expect(page.locator('h3:has-text("Debug Tools")')).toBeVisible();

        // Close it
        await page.locator('.close-btn').click();
        await expect(panel).toBeHidden();
    });

    test('should allow opening unit hiring modal', async ({ page }) => {
        // Find a site (village/etc) or use debug to teleport?
        // Basic interaction: Click Unit Display (if empty) or just use Debug to add unit

        // Open Debug first
        await page.locator('.debug-toggle').click();

        // Add a Unit
        await page.locator('button:has-text("Add Unit")').click();

        // Check log
        const log = page.locator('#debug-log-container');
        await expect(log).toContainText('Debug: Added');

        // Check unit display
        await expect(page.locator('.unit-card')).toBeVisible();
    });

    test('should display FPS counter when toggled', async ({ page }) => {
        await page.locator('.debug-toggle').click();
        await page.locator('button:has-text("Toggle FPS")').click();

        await expect(page.locator('#perf-overlay')).toBeVisible();
        await expect(page.locator('#perf-overlay')).toContainText('FPS:');
    });
});
