import { expect } from '@playwright/test';

export class GameFlow {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    async loadGame() {
        // Disable tutorial via InitScript to avoid reload
        await this.page.addInitScript(() => {
            localStorage.setItem('mageKnightTutorialCompleted', 'true');
        });
        await this.page.goto('/');
        await expect(this.page.locator('#loading-screen')).toBeHidden({ timeout: 15000 });
    }

    async skipTutorial() {
        // Try multiple selectors or strategies if tutorial structure changes
        const skipBtn = this.page.locator('#tutorial-skip-btn');
        const overlay = this.page.locator('#tutorial-overlay-custom');

        try {
            if (await skipBtn.isVisible({ timeout: 5000 })) {
                await skipBtn.click();
                await expect(overlay).toBeHidden();
            }
        } catch (e) {
            // Tutorial might not be active, which is fine
        }
    }

    async handleModals() {
        // Scenario Selection
        const scenarioModal = this.page.locator('#scenario-selection-modal');
        try {
            // Wait up to 5s for the modal to appear
            await scenarioModal.waitFor({ state: 'visible', timeout: 5000 });
            console.log('GameFlow: Selecting scenario...');
            await this.page.locator('.scenario-card').first().click();
            await scenarioModal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (e) {
            console.log('GameFlow: Scenario modal not found or already closed.');
        }

        // Hero Selection
        const heroModal = this.page.locator('#hero-selection-modal');
        try {
            await heroModal.waitFor({ state: 'visible', timeout: 5000 });
            console.log('GameFlow: Selecting hero...');
            // Click the "Wählen" button on first hero card
            await this.page.locator('#hero-selection-modal button:has-text("Wählen")').first().click();
            await heroModal.waitFor({ state: 'hidden', timeout: 10000 });
        } catch (e) {
            console.log('GameFlow: Hero modal not found or already closed.');
        }
    }

    /**
     * Full startup sequence: Load -> Skip Tutorial -> Handle Modals -> Verify Board
     */
    async ensureGameStarted() {
        await this.loadGame();
        await this.skipTutorial();
        await this.handleModals();

        // Wait for game to be initialized and scenario/hero to be set
        await this.page.waitForFunction(() => {
            return window.game &&
                window.game.gameState === 'playing' &&
                window.game.hero !== null;
        }, { timeout: 20000 });

        // Final verification that we are in-game and UI is ready
        const canvas = this.page.locator('canvas#game-board');
        await expect(canvas).toBeVisible({ timeout: 15000 });

        // Ensure UI elements like hand or mana are clickable
        await this.page.locator('#hand-cards').waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * Get the screen position of a hex as DOM viewport coordinates,
     * correctly accounting for canvas vs display size scaling.
     * @param {number} q Axial Q
     * @param {number} r Axial R
     */
    async getHexScreenPos(q, r) {
        return await this.page.evaluate(({ q, r }) => {
            const canvas = window.game.canvas;
            const rect = canvas.getBoundingClientRect();
            const hexPixel = window.game.hexGrid.axialToPixel(q, r);

            // Important: Handle CSS scaling!
            // axialToPixel returns results in "canvas pixels" (usually 1600x1200)
            // rect.width/height is the "display size" in the browser (e.g. 1280x720)
            const scaleX = rect.width / canvas.width;
            const scaleY = rect.height / canvas.height;

            return {
                x: rect.left + (hexPixel.x * scaleX),
                y: rect.top + (hexPixel.y * scaleY)
            };
        }, { q, r });
    }
}
