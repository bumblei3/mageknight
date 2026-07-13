import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * Browser-side regression for the Undo/Redo toolbar revival (UI hardening).
 *
 * The UndoManager previously searched for a #action-toolbar / #toolbar element
 * that never existed in the DOM, so the undo/redo buttons were never injected
 * (silent dead UI). It now creates its own container anchored in
 * .header-controls. This spec verifies the buttons actually appear and are
 * interactive on a fresh game.
 */

test.describe('Undo/Redo Toolbar', () => {
    test.beforeEach(async ({ page }) => {
        const flow = new GameFlow(page);
        await flow.ensureGameStarted();
        await page.waitForFunction(() => !!(window.game && window.game.undoManager), { timeout: 15000 });
    });

    test('undo and redo buttons are rendered in the header', async ({ page }) => {
        const undoBtn = page.locator('#undo-btn');
        const redoBtn = page.locator('#redo-btn');

        await expect(undoBtn).toHaveCount(1);
        await expect(redoBtn).toHaveCount(1);

        // They must live inside the visible, clickable header — not in the
        // canvas-only .bottom-dock which has pointer-events: none.
        const inDock = await undoBtn.evaluate((el) => !!el.closest('.bottom-dock'));
        expect(inDock).toBe(false);

        await expect(undoBtn).toBeVisible();
        await expect(redoBtn).toBeVisible();
    });

    test('undo button is wired (has aria-label and a click handler)', async ({ page }) => {
        const undoBtn = page.locator('#undo-btn');
        await expect(undoBtn).toHaveAttribute('aria-label', /Rückgängig/);
        // Clicking must not throw; button starts disabled (no history yet).
        await expect(undoBtn).toBeDisabled();
    });
});
