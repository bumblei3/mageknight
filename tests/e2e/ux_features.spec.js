
import { test, expect } from '@playwright/test';

test.describe('UX Features', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for loading screen to disappear
        await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 15000 });

        // Dismiss "Willkommen, Held!" Tutorial if present
        const skipTutorialBtn = page.getByRole('button', { name: 'Überspringen' });
        if (await skipTutorialBtn.isVisible()) {
            await skipTutorialBtn.click();
        }

        // Dismiss "Szenario wählen" if present
        const cancelScenarioBtn = page.getByRole('button', { name: 'Abbrechen' });
        if (await cancelScenarioBtn.isVisible()) {
            await cancelScenarioBtn.click();
        }
    });

    test('should allow selecting a hero and starting the game', async ({ page }) => {
        // Define button locator
        const newGameBtn = page.locator('#start-game-btn, #new-game-btn').first();

        // Handle tutorial overlay if present
        const tutorialOverlay = page.locator('#tutorial-overlay-custom');
        if (await tutorialOverlay.isVisible()) {
            // Force click through overlay to start game
            await newGameBtn.click({ force: true });
        } else {
            // Standard Click or force if glass pane exists
            if (await newGameBtn.isVisible()) {
                await newGameBtn.click({ force: true });
            }
        }

        // Check for Hero Selection Modal
        const heroModal = page.locator('#hero-selection-modal');
        // If modal appears, select a hero
        if (await heroModal.isVisible()) {
            await page.locator('.hero-card').first().click();
        }

        // Verify Game Board is visible
        await expect(page.locator('#game-board')).toBeVisible();
        await expect(page.locator('.hud-top-bar')).toBeVisible();
    });

    test('should open and close Shortcuts modal via Settings', async ({ page }) => {
        // 1. Open Settings - force click to bypass any initial tutorial overlays
        await page.locator('#settings-btn').click({ force: true });

        // Wait and retry if needed
        try {
            await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 2000 });
        } catch (e) {
            // Retry click
            await page.locator('#settings-btn').click({ force: true });
            await expect(page.locator('#settings-modal')).toBeVisible();
        }

        // 2. Click Shortcuts Button
        await page.locator('#settings-shortcuts-btn').click();

        // 3. Verify Shortcuts Modal is visible
        const shortcutsModal = page.locator('#shortcuts-modal');
        await expect(shortcutsModal).toBeVisible();

        // 4. Verify content
        await expect(shortcutsModal).toContainText(/Shortcuts|Tastaturkürzel/);
        // "Zug beenden" might be key-dependent, check for "Space" or "Escape" which are universal
        await expect(shortcutsModal).toContainText('Space');

        // 5. Close Shortcuts Modal
        // 5. Close Shortcuts Modal
        await page.locator('#shortcuts-close').click({ force: true });
        await expect(shortcutsModal).toBeHidden();
    });
});
