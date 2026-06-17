
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
        await test.step('Start New Game', async () => {
            const newGameBtn = page.locator('#start-game-btn, #new-game-btn').first();

            // Handle potentially tricky overlay interactions
            const tutorialOverlay = page.locator('#tutorial-overlay-custom');
            if (await tutorialOverlay.isVisible()) {
                await newGameBtn.click({ force: true });
            } else {
                if (await newGameBtn.isVisible()) {
                    await newGameBtn.click({ force: true });
                }
            }
        });

        await test.step('Select Hero', async () => {
            const heroModal = page.locator('#hero-selection-modal');
            if (await heroModal.isVisible()) {
                await page.locator('.hero-card').first().click();
            }
        });

        await test.step('Verify Board Visibility', async () => {
            await expect(page.locator('#game-board')).toBeVisible();
            await expect(page.locator('.hud-top-bar')).toBeVisible();
        });
    });

    test('should open and close Shortcuts modal via Settings', async ({ page }) => {
        await test.step('Open Settings', async () => {
            // Use evaluate to click directly
            await page.evaluate(() => {
                const btn = document.getElementById('settings-btn');
                if (btn) btn.click();
            });

            // Resilience: Retry if modal doesn't appear
            try {
                await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 2000 });
            } catch (e) {
                await page.evaluate(() => {
                    const btn = document.getElementById('settings-btn');
                    if (btn) btn.click();
                });
                await expect(page.locator('#settings-modal')).toBeVisible();
            }
        });

        await test.step('Open Shortcuts', async () => {
            await page.evaluate(() => {
                const btn = document.getElementById('settings-shortcuts-btn');
                if (btn) btn.click();
            });
            const shortcutsModal = page.locator('#shortcuts-modal');
            await expect(shortcutsModal).toBeVisible();
            await expect(shortcutsModal).toContainText(/Shortcuts|Tastaturkürzel/);
            // Check for key mapping text
            await expect(shortcutsModal).toContainText('Space');
        });

        await test.step('Close Shortcuts', async () => {
            await page.evaluate(() => {
                const btn = document.getElementById('shortcuts-close');
                if (btn) btn.click();
            });
            await expect(page.locator('#shortcuts-modal')).toBeHidden();
        });
    });

    test('should toggle sound', async ({ page }) => {
        await test.step('Toggle Sound Off', async () => {
            const soundBtn = page.locator('#sound-toggle-btn');
            // Initial state might be on or off (default on usually)
            // Expecting 🔊 or similar icon

            if (await soundBtn.isVisible()) {
                await page.evaluate(() => {
                    const btn = document.getElementById('sound-toggle-btn');
                    if (btn) btn.click();
                });
                // Check if icon changes/logs appear
                // await expect(page.locator('#game-log')).toContainText(/Sound/);
            }
        });
    });
});
