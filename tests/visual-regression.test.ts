import { test, expect } from '@playwright/test';
import { visualRegression, VisualStates, updateVisualBaseline } from './visual-regression';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for game to initialize
    await page.waitForSelector('#game-board', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Let animations settle
  });

  test.describe('Core Game States', () => {
    test('Scenario Selection Modal', async ({ page }) => {
      const result = await VisualStates.scenarioSelection(page);
      expect(result.passed).toBe(true);
    });

    test('Hero Selection Modal', async ({ page }) => {
      // First wait for scenario selection modal (same as VisualStates.scenarioSelection)
      await page.waitForFunction(() => {
        return typeof (window as any).game !== 'undefined' && (window as any).game !== null;
      }, { timeout: 20000 });
    
      await page.evaluate(() => {
        if ((window as any).game) {
          (window as any).game.isTestEnvironment = false;
        }
      });
    
      await page.waitForFunction(() => {
        const modal = document.getElementById('scenario-selection-modal');
        return modal && modal.classList.contains('show');
      }, { timeout: 30000 });
    
      // Now click on a scenario
      await page.waitForSelector('[data-scenario="mining_expedition"]', { state: 'visible', timeout: 15000 });
      await page.click('[data-scenario="mining_expedition"]');
      await page.waitForSelector('#hero-selection-modal', { state: 'visible', timeout: 15000 });
    
      const result = await VisualStates.heroSelection(page);
      expect(result.passed).toBe(true);
    });

    test('Game Board - Exploration Phase', async ({ page }) => {
      // Start a game
      await page.click('[data-scenario="mining_expedition"]');
      await page.waitForSelector('#hero-selection-modal', { state: 'visible' });
      await page.click('[data-hero="goldyx"]');
      await page.waitForSelector('#game-board', { state: 'visible' });
      await page.waitForTimeout(500);

      const result = await VisualStates.gameBoard(page);
      expect(result.passed).toBe(true);
    });
  });

  test.describe('Combat Phases', () => {
    test.beforeEach(async ({ page }) => {
      // Start a game and get into combat
      await page.click('[data-scenario="mining_expedition"]');
      await page.waitForSelector('#hero-selection-modal', { state: 'visible' });
      await page.click('[data-hero="goldyx"]');
      await page.waitForSelector('#game-board', { state: 'visible' });
      await page.waitForTimeout(500);

      // Move adjacent to an enemy to trigger combat
      // This is simplified - in reality you'd need to click a hex adjacent to enemy
      // For now we just test the combat UI states if they appear
    });

    test('Combat - Ranged Phase', async ({ page }) => {
      // Mock combat state for visual test
      await page.evaluate(() => {
        const game = (window as any).game;
        if (game && game.combatOrchestrator) {
          game.combatOrchestrator.initiateCombat({
            id: 'test-enemy',
            name: 'Test Orc',
            type: 'orc',
            armor: 5,
            attack: 3,
            position: { q: 1, r: 0 },
            isDefeated: () => false,
            getState: () => ({})
          } as any);
        }
      });
      await page.waitForSelector('#combat-panel', { state: 'visible' });
      await page.waitForTimeout(300);

      const result = await VisualStates.combatRanged(page);
      expect(result.passed).toBe(true);
    });

    test('Combat - Block Phase', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        if (game && game.combat) {
          game.combat.phase = 'block';
          game.combatOrchestrator?.updateCombatInfo?.();
        }
      });
      await page.waitForTimeout(300);

      const result = await VisualStates.combatBlock(page);
      expect(result.passed).toBe(true);
    });

    test('Combat - Attack Phase', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        if (game && game.combat) {
          game.combat.phase = 'attack';
          game.combatOrchestrator?.updateCombatInfo?.();
        }
      });
      await page.waitForTimeout(300);

      const result = await VisualStates.combatAttack(page);
      expect(result.passed).toBe(true);
    });
  });

  test.describe('Modals', () => {
    test('Settings Modal', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForSelector('#settings-modal', { state: 'visible' });

      const result = await VisualStates.settingsModal(page);
      expect(result.passed).toBe(true);
    });
  });

  test.describe('Responsive Viewports', () => {
    test('Desktop Viewport (1280x720)', async ({ page }) => {
      const result = await VisualStates.desktop(page);
      expect(result.passed).toBe(true);
    });

    test('Tablet Viewport (768x1024)', async ({ page }) => {
      const result = await VisualStates.tablet(page);
      expect(result.passed).toBe(true);
    });

    test('Mobile Viewport (375x667)', async ({ page }) => {
      const result = await VisualStates.mobile(page);
      expect(result.passed).toBe(true);
    });
  });

  test.describe('Baseline Update Mode', () => {
    test('Update all baselines', async ({ page }) => {
      // Only runs when UPDATE_BASELINE=1
      if (process.env.UPDATE_BASELINE !== '1') {
        test.skip();
        return;
      }

      // Scenario Selection
      await VisualStates.scenarioSelection(page);
      await updateVisualBaseline(page, 'scenario-selection');

      // Hero Selection
      await page.click('[data-scenario="mining_expedition"]');
      await page.waitForSelector('#hero-selection-modal', { state: 'visible' });
      await VisualStates.heroSelection(page);
      await updateVisualBaseline(page, 'hero-selection');

      // Game Board
      await page.click('[data-hero="goldyx"]');
      await page.waitForSelector('#game-board', { state: 'visible' });
      await page.waitForTimeout(500);
      await VisualStates.gameBoard(page);
      await updateVisualBaseline(page, 'game-board-exploration');

      // Settings
      await page.click('#settings-btn');
      await page.waitForSelector('#settings-modal', { state: 'visible' });
      await VisualStates.settingsModal(page);
      await updateVisualBaseline(page, 'settings-modal');

      // Viewports
      await VisualStates.desktop(page);
      await updateVisualBaseline(page, 'desktop-viewport');
      await VisualStates.tablet(page);
      await updateVisualBaseline(page, 'tablet-viewport');
      await VisualStates.mobile(page);
      await updateVisualBaseline(page, 'mobile-viewport');
    });
  });
});

test.describe('Component Snapshots', () => {
  test('Button Variants', async ({ page }) => {
    // This would render a test page with all button variants
    // For now, skip as we don't have a component test page
    test.skip();
  });
});