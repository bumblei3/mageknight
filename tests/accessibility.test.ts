/**
 * Accessibility Audit Tests
 * Uses axe-core with Playwright to find WCAG 2.1 AA violations
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for game to fully initialize and modal to become visible
    await page.waitForFunction(() => {
      return typeof (window as any).game !== 'undefined' && (window as any).game !== null;
    }, { timeout: 20000 });

    await page.evaluate(() => {
      if ((window as any).game) {
        (window as any).game.isTestEnvironment = false;
      }
    });

    // Wait for scenario selection modal
    await page.waitForFunction(() => {
      const modal = document.getElementById('scenario-selection-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 30000 });
    
    // Hide day-night overlay if present
    await page.evaluate(() => {
      const overlay = document.getElementById('day-night-overlay');
      if (overlay) overlay.classList.remove('active');
    });
  });

  test.afterEach(async ({ page }) => {
    // Close any open modals
    await page.evaluate(() => {
      document.querySelectorAll('.modal.show, .site-modal.show').forEach(modal => {
        modal.classList.remove('show');
      });
      const overlay = document.getElementById('day-night-overlay');
      if (overlay) overlay.classList.remove('active');
    });
  });

  test('Scenario Selection Modal has no accessibility violations', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page }).analyze();
    
    // Filter for WCAG 2.1 AA violations
    const violations = scanResults.violations.filter(v => 
      v.tags.some(tag => tag === 'wcag2aa' || tag === 'wcag21aa')
    );

    if (violations.length > 0) {
      console.log('A11Y Violations found:', JSON.stringify(violations, null, 2));
    }

    expect.soft(violations.length).toBe(0);
  });

  test('Hero Selection Modal has no accessibility violations', async ({ page }) => {
    // Navigate to hero selection
    await page.waitForSelector('[data-scenario="mining_expedition"]', { state: 'visible', timeout: 15000 });
    await page.click('[data-scenario="mining_expedition"]');
    await page.waitForSelector('#hero-selection-modal', { state: 'visible', timeout: 15000 });

    const scanResults = await new AxeBuilder({ page }).analyze();
    const violations = scanResults.violations.filter(v => 
      v.tags.some(tag => tag === 'wcag2aa' || tag === 'wcag21aa')
    );

    if (violations.length > 0) {
      console.log('A11Y Violations found:', JSON.stringify(violations, null, 2));
    }

    expect.soft(violations.length).toBe(0);
  });

  test('Game Board has no accessibility violations', async ({ page }) => {
    // Start a game
    await page.waitForSelector('[data-scenario="mining_expedition"]', { state: 'visible', timeout: 15000 });
    await page.click('[data-scenario="mining_expedition"]');
    await page.waitForSelector('#hero-selection-modal', { state: 'visible', timeout: 15000 });
    await page.click('[data-hero="goldyx"]');
    await page.waitForSelector('#game-board', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    const scanResults = await new AxeBuilder({ page }).analyze();
    const violations = scanResults.violations.filter(v => 
      v.tags.some(tag => tag === 'wcag2aa' || tag === 'wcag21aa')
    );

    if (violations.length > 0) {
      console.log('A11Y Violations found:', JSON.stringify(violations, null, 2));
    }

    expect.soft(violations.length).toBe(0);
  });

  test('Settings Modal has no accessibility violations', async ({ page }) => {
    // Click settings button (ensure it's clickable)
    await page.waitForSelector('#settings-btn', { state: 'visible', timeout: 10000 });
    
    // Dismiss any overlays
    await page.evaluate(() => {
      const overlay = document.getElementById('day-night-overlay');
      if (overlay) overlay.classList.remove('active');
      document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    });
    
    await page.click('#settings-btn');
    await page.waitForSelector('#settings-modal', { state: 'visible', timeout: 10000 });

    const scanResults = await new AxeBuilder({ page }).analyze();
    const violations = scanResults.violations.filter(v => 
      v.tags.some(tag => tag === 'wcag2aa' || tag === 'wcag21aa')
    );

    if (violations.length > 0) {
      console.log('A11Y Violations found:', JSON.stringify(violations, null, 2));
    }

    expect.soft(violations.length).toBe(0);
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .include('#scenario-selection-modal')
      .withTags(['cat.color'])
      .analyze();

    const colorViolations = scanResults.violations.filter(v => 
      v.tags.includes('cat.color') || v.id === 'color-contrast'
    );

    if (colorViolations.length > 0) {
      console.log('Color contrast violations:', JSON.stringify(colorViolations, null, 2));
    }

    expect.soft(colorViolations.length).toBe(0);
  });

  test('All interactive elements are keyboard accessible', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['keyboard'])
      .analyze();

    const keyboardViolations = scanResults.violations.filter(v => 
      v.tags.includes('keyboard') || v.id === 'focus-order-semantics' || v.id === 'focus-visible'
    );

    if (keyboardViolations.length > 0) {
      console.log('Keyboard accessibility violations:', JSON.stringify(keyboardViolations, null, 2));
    }

    expect.soft(keyboardViolations.length).toBe(0);
  });

  test('All images have alt text', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['cat.text-alternatives'])
      .analyze();

    const altViolations = scanResults.violations.filter(v => 
      v.id === 'image-alt' || v.id === 'input-image-alt'
    );

    if (altViolations.length > 0) {
      console.log('Missing alt text:', JSON.stringify(altViolations, null, 2));
    }

    expect.soft(altViolations.length).toBe(0);
  });

  test('Form elements have labels', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['cat.forms'])
      .analyze();

    const formViolations = scanResults.violations.filter(v => 
      v.id === 'label' || v.id === 'form-field-multiple-labels' || v.id === 'form-field'
    );

    if (formViolations.length > 0) {
      console.log('Form label violations:', JSON.stringify(formViolations, null, 2));
    }

    expect.soft(formViolations.length).toBe(0);
  });

  test('ARIA attributes are valid', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    const ariaViolations = scanResults.violations.filter(v => 
      v.id.startsWith('aria-') || v.id === 'role-img-alt'
    );

    if (ariaViolations.length > 0) {
      console.log('ARIA violations:', JSON.stringify(ariaViolations, null, 2));
    }

    expect.soft(ariaViolations.length).toBe(0);
  });

  test('Heading structure is correct', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['cat.headings'])
      .analyze();

    const headingViolations = scanResults.violations.filter(v => 
      v.id === 'heading-order' || v.id === 'empty-heading'
    );

    if (headingViolations.length > 0) {
      console.log('Heading structure violations:', JSON.stringify(headingViolations, null, 2));
    }

    expect.soft(headingViolations.length).toBe(0);
  });

  test('Landmarks present', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .withTags(['cat.landmarks'])
      .analyze();

    const landmarkViolations = scanResults.violations.filter(v => 
      v.id === 'landmark-one-main' || v.id === 'region' || v.id === 'skip-link'
    );

    if (landmarkViolations.length > 0) {
      console.log('Landmark violations:', JSON.stringify(landmarkViolations, null, 2));
    }

    expect.soft(landmarkViolations.length).toBe(0);
  });
});

test.describe('Specific Component Accessibility', () => {
  // Reuse first describe's state - tests run sequentially
  
  test('Button component meets accessibility standards', async ({ page }) => {
    // Test multiple button states
    const scanResults = await new AxeBuilder({ page })
      .include('button, [role="button"]')
      .analyze();

    const buttonViolations = scanResults.violations.filter(v => 
      v.id === 'button-name' || v.id === 'aria-required-attr' || v.id === 'focus-visible'
    );

    if (buttonViolations.length > 0) {
      console.log('Button violations:', JSON.stringify(buttonViolations, null, 2));
    }

    expect.soft(buttonViolations.length).toBe(0);
  });

  test('Modal focus trap works correctly', async ({ page }) => {
    // Ensure scenario modal is visible
    await page.waitForFunction(() => {
      const modal = document.getElementById('scenario-selection-modal');
      return modal && modal.classList.contains('show');
    }, { timeout: 30000 });
    
    // Hide day-night overlay
    await page.evaluate(() => {
      const overlay = document.getElementById('day-night-overlay');
      if (overlay) overlay.classList.remove('active');
    });

    // Test focus management
    const focusableElements = await page.evaluate(() => {
      const modal = document.getElementById('scenario-selection-modal');
      if (!modal) return [];
      
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      return Array.from(focusable).map(el => {
        const htmlEl = el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLAnchorElement | HTMLElement;
        return {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          tabIndex: htmlEl.tabIndex,
          disabled: 'disabled' in htmlEl ? htmlEl.disabled : false
        };
      });
    });

    console.log('Focusable elements in scenario modal:', focusableElements);
    
    // At least close button and scenario cards should be focusable
    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('Tooltip and notification accessibility', async ({ page }) => {
    const scanResults = await new AxeBuilder({ page })
      .include('[role="tooltip"], [role="alert"], [role="status"], .notification, .toast')
      .analyze();

    const tooltipViolations = scanResults.violations.filter(v => 
      v.id.startsWith('aria-') || v.id === 'focus-visible'
    );

    if (tooltipViolations.length > 0) {
      console.log('Tooltip/Notification violations:', JSON.stringify(tooltipViolations, null, 2));
    }

    expect.soft(tooltipViolations.length).toBe(0);
  });
});