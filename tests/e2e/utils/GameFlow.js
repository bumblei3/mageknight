import { expect } from '@playwright/test';

export class GameFlow {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    async loadGame() {
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
            // Short timeout because it usually appears quickly or not at all
            if (await scenarioModal.isVisible({ timeout: 3000 })) {
                console.log('GameFlow: Selecting scenario...');
                await this.page.locator('.scenario-card').first().click();
                await expect(scenarioModal).toBeHidden();
            }
        } catch (e) { }

        // Hero Selection
        const heroModal = this.page.locator('#hero-selection-modal');
        try {
            if (await heroModal.isVisible({ timeout: 3000 })) {
                console.log('GameFlow: Selecting hero...');
                await this.page.locator('.hero-select-btn').first().click();
                await expect(heroModal).toBeHidden();
            }
        } catch (e) { }
    }

    /**
     * Full startup sequence: Load -> Skip Tutorial -> Handle Modals -> Verify Board
     */
    async ensureGameStarted() {
        await this.loadGame();
        await this.skipTutorial();
        await this.handleModals();

        // Final verification that we are in-game
        const board = this.page.locator('#game-board-wrapper');
        await expect(board).toBeVisible();
    }
}
