/**
 * Visual Regression Testing Configuration
 * Uses Playwright + pixelmatch for pixel-perfect comparison
 */

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASELINE_DIR = join(__dirname, '../visual-baselines');
const DIFF_DIR = join(__dirname, '../visual-diffs');
const THRESHOLD = 0.001; // 0.1% pixel difference allowed

// Ensure directories exist
[mkdirSync(BASELINE_DIR, { recursive: true }), mkdirSync(DIFF_DIR, { recursive: true })];

/**
 * Takes a screenshot and compares with baseline
 * @param page - Playwright page
 * @param name - Test name (used as filename)
 * @param options - Screenshot options
 */
export async function visualRegression(
  page: any,
  name: string,
  options: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    mask?: any[];
    threshold?: number;
    animations?: 'disabled' | 'allow';
  } = {}
) {
  const { fullPage = true, clip, mask = [], threshold = THRESHOLD, animations = 'disabled' } = options;

  const baselinePath = join(BASELINE_DIR, `${name}.png`);
  const diffPath = join(DIFF_DIR, `${name}-diff.png`);
  const currentPath = join(DIFF_DIR, `${name}-current.png`);

  // Take screenshot
  const screenshot = await page.screenshot({
    fullPage,
    clip,
    animations,
    path: currentPath
  });

  // Check if baseline exists
  if (!existsSync(baselinePath)) {
    // First run - create baseline
    writeFileSync(baselinePath, screenshot);
    console.log(`[Visual] Created baseline: ${name}.png`);
    return { passed: true, isNew: true };
  }

  // Compare with baseline
  const baselineImg = PNG.sync.read(readFileSync(baselinePath));
  const currentImg = PNG.sync.read(readFileSync(currentPath));

  const { width, height } = baselineImg;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    baselineImg.data,
    currentImg.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  const diffRatio = numDiffPixels / (width * height);

  if (diffRatio > threshold) {
    // Save diff image
    writeFileSync(diffPath, PNG.sync.write(diff));
    
    console.error(`[Visual] MISMATCH ${name}: ${(diffRatio * 100).toFixed(2)}% different (${numDiffPixels} pixels)`);
    console.error(`[Visual] Baseline: ${baselinePath}`);
    console.error(`[Visual] Current: ${currentPath}`);
    console.error(`[Visual] Diff: ${diffPath}`);

    return { 
      passed: false, 
      diffRatio, 
      numDiffPixels,
      baselinePath,
      currentPath,
      diffPath
    };
  }

  return { passed: true, isNew: false };
}

/**
 * Updates baseline for a test (use when intentional UI changes)
 * Run with: UPDATE_BASELINE=1 npm run test:visual
 */
export async function updateVisualBaseline(page: any, name: string, options?: any): Promise<void> {
  const baselinePath = join(BASELINE_DIR, `${name}.png`);
  const screenshot = await page.screenshot({ fullPage: true, ...options });
  writeFileSync(baselinePath, screenshot);
  console.log(`[Visual] Updated baseline: ${name}.png`);
}

/**
 * Test helper for common UI states
 */
export const VisualStates = {
  /** Main menu / scenario selection */
  async scenarioSelection(page: any) {
    // First wait for the game to be defined and initialized
    await page.waitForFunction(() => {
      return typeof (window as any).game !== 'undefined' && (window as any).game !== null;
    }, { timeout: 20000 });
    
    // Disable test environment flag so the modal shows
    await page.evaluate(() => {
      if ((window as any).game) {
        (window as any).game.isTestEnvironment = false;
      }
    });
    
    // Then wait for the modal to be shown with 'show' class
    await page.waitForFunction(() => {
      const modal = document.getElementById('scenario-selection-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 30000 });
    
    return visualRegression(page, 'scenario-selection');
  },

  /** Hero selection modal */
  async heroSelection(page: any) {
    // Wait for hero selection modal to become visible
    await page.waitForFunction(() => {
      const modal = document.getElementById('hero-selection-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 20000 });
    
    return visualRegression(page, 'hero-selection');
  },

  /** Main game board (exploration phase) */
  async gameBoard(page: any) {
    // Wait for game board to be ready
    await page.waitForFunction(() => {
      const board = document.getElementById('game-board') as HTMLCanvasElement;
      return board && board.width > 0 && board.height > 0;
    }, { timeout: 15000 });
    await page.waitForTimeout(500); // Let animations settle
    return visualRegression(page, 'game-board-exploration');
  },

  /** Combat panel (ranged phase) */
  async combatRanged(page: any) {
    await page.waitForFunction(() => {
      const panel = document.getElementById('combat-panel');
      return panel && panel.style.display !== 'none' && panel.classList.contains('active-combat');
    }, { timeout: 10000 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'combat-ranged');
  },

  /** Combat panel (block phase) */
  async combatBlock(page: any) {
    await page.waitForFunction(() => {
      const panel = document.getElementById('combat-panel');
      return panel && panel.style.display !== 'none' && panel.classList.contains('active-combat');
    }, { timeout: 10000 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'combat-block');
  },

  /** Combat panel (attack phase) */
  async combatAttack(page: any) {
    await page.waitForFunction(() => {
      const panel = document.getElementById('combat-panel');
      return panel && panel.style.display !== 'none' && panel.classList.contains('active-combat');
    }, { timeout: 10000 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'combat-attack');
  },

  /** Site interaction modal */
  async siteModal(page: any, siteType: string) {
    await page.waitForFunction(() => {
      const modal = document.getElementById('site-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 10000 });
    return visualRegression(page, `site-modal-${siteType}`);
  },

  /** Settings modal */
  async settingsModal(page: any) {
    await page.waitForFunction(() => {
      const modal = document.getElementById('settings-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 10000 });
    return visualRegression(page, 'settings-modal');
  },

  /** Mobile viewport */
  async mobile(page: any) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'mobile-viewport');
  },

  /** Tablet viewport */
  async tablet(page: any) {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'tablet-viewport');
  },

  /** Desktop viewport */
  async desktop(page: any) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
    return visualRegression(page, 'desktop-viewport');
  }
};

/**
 * Snapshot testing for component isolation
 */
export async function testComponentSnapshot(
  page: any,
  componentName: string,
  renderFn: () => Promise<void>
) {
  // Navigate to test page or render component
  await renderFn();
  await page.waitForTimeout(200);
  return visualRegression(page, `component-${componentName}`);
}

export default {
  visualRegression,
  updateVisualBaseline,
  VisualStates,
  testComponentSnapshot
};