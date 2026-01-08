import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

test.describe('3D View Functionality', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('should toggle 3D view on button click', async ({ page }) => {
        const toggleBtn = page.locator('#toggle-3d-btn');
        const container3D = page.locator('#game-container-3d');
        const canvas2D = page.locator('.canvas-layer');

        await test.step('Initial State Check', async () => {
            await expect(container3D).toBeHidden();
            await expect(canvas2D).toBeVisible();
            await expect(toggleBtn).toBeVisible();
        });

        await test.step('Activate 3D Mode', async () => {
            console.log('Clicking 3D Toggle...');
            await toggleBtn.click({ force: true });
            await page.waitForTimeout(1000);
        });

        await test.step('Verify 3D Toggle Attempted', async () => {
            // Basic visibility check
            await expect(container3D).toBeVisible();

            // INTERNAL INSPECTION: Check Three.js Scene State
            await page.waitForFunction(() => window.game3D && window.game3D.scene && window.game3D.scene.children.length > 5);

            const sceneInfo = await page.evaluate(() => {
                const g3d = window.game3D;
                if (!g3d || !g3d.scene) return null;

                return {
                    childrenCount: g3d.scene.children.length,
                    hexCount: g3d.hexMeshes.size,
                    hasHero: !!g3d.scene.getObjectByName('hero-token'),
                    hasVolkare: !!g3d.scene.getObjectByName('volkare-token'),
                    backgroundHex: g3d.scene.background ? g3d.scene.background.getHexString() : null
                };
            });

            console.log('3D Scene Info:', sceneInfo);

            expect(sceneInfo).not.toBeNull();
            expect(sceneInfo.hexCount).toBeGreaterThan(0); // Should have hexes
            expect(sceneInfo.hasHero).toBe(true); // Should have hero token
            expect(sceneInfo.hasVolkare).toBe(true, 'Volkare token should be present');

            // Initial state is DAY (Sky Blue)
            expect(sceneInfo.backgroundHex).toBe('87ceeb');
        });

        await test.step('Verify Day/Night Lighting', async () => {
            // Trigger Night
            await page.evaluate(() => {
                window.game.timeManager.toggleTime(); // Force time toggle
            });

            // Wait for lighting update
            await page.waitForTimeout(500);

            const nightInfo = await page.evaluate(() => {
                return window.game3D.scene.background.getHexString();
            });

            console.log('Night Background:', nightInfo);
            // Night color is 0x050510 -> '050510'
            expect(nightInfo).toBe('050510');
        });

        await test.step('Verify 3D Interaction Setup', async () => {
            // Check if raycaster is initialized
            const isInitialized = await page.evaluate(() => {
                const game3D = window.game3D;
                return !!game3D.raycaster && !!game3D.mouse;
            });
            expect(isInitialized).toBe(true);

            // Trigger a click and safe check (doesn't crash)
            await page.mouse.click(400, 300); // Center screen
        });
    });
});
