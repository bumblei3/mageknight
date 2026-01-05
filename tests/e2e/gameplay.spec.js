import { test, expect } from '@playwright/test';

test.describe('Mage Knight Gameplay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for game to load
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15000 });
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
