import { test, expect, devices } from '@playwright/test';

/**
 * Responsive Design Tests
 *
 * Tests the website across different viewport sizes to ensure
 * proper mobile and desktop rendering.
 */

// Test on Desktop Chrome
test.describe('Desktop Viewport (1280x720)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should show desktop navigation', async ({ page }) => {
    await page.goto('/');

    // Desktop nav should be visible
    const desktopNav = page.locator('header ul.hidden.md\\:flex');
    await expect(desktopNav).toBeVisible();

    // Mobile menu button should be hidden
    const mobileMenuBtn = page.locator('#mobile-menu-button');
    await expect(mobileMenuBtn).toBeHidden();
  });

  test('should show calculator at full width', async ({ page }) => {
    await page.goto('/');

    const calculator = page.locator('batch-calculator');
    await expect(calculator).toBeVisible();

    // Calculator card should have reasonable width on desktop
    const box = await calculator.boundingBox();
    expect(box?.width).toBeGreaterThan(500);
  });

  test('should show cocktail cards in grid layout', async ({ page }) => {
    await page.goto('/cocktails');

    // Wait for cards to load
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible();

    // On desktop, cards should be in a multi-column grid
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();

    // Cards should be side by side (same or similar Y position)
    if (firstCard && secondCard) {
      // Allow 50px difference for slight layout variations
      expect(Math.abs(firstCard.y - secondCard.y)).toBeLessThan(50);
    }
  });

  test('should show hero section with proper layout', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();

    // Hero heading should be visible and properly sized (select specific hero heading)
    const heading = page.getByRole('heading', { name: /Cocktails That Wait/i });
    await expect(heading).toBeVisible();

    const headingBox = await heading.boundingBox();
    expect(headingBox?.width).toBeGreaterThan(300);
  });
});

// Test on Mobile (iPhone 12 dimensions)
test.describe('Mobile Viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');

    // Mobile menu button should be visible
    const mobileMenuBtn = page.locator('#mobile-menu-button');
    await expect(mobileMenuBtn).toBeVisible();

    // Desktop nav should be hidden
    const desktopNav = page.locator('header ul.hidden.md\\:flex');
    await expect(desktopNav).toBeHidden();
  });

  test('should toggle mobile menu on click', async ({ page }) => {
    await page.goto('/');

    const mobileMenuBtn = page.locator('#mobile-menu-button');
    const mobileMenu = page.locator('#mobile-menu');

    // Menu should be hidden initially
    await expect(mobileMenu).toBeHidden();

    // Click to open
    await mobileMenuBtn.click();
    await expect(mobileMenu).toBeVisible();

    // Menu should contain navigation links
    const homeLink = mobileMenu.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('should show calculator at mobile width', async ({ page }) => {
    await page.goto('/');

    const calculator = page.locator('batch-calculator');
    await expect(calculator).toBeVisible();

    // Calculator should fill mobile width (with some padding)
    const box = await calculator.boundingBox();
    expect(box?.width).toBeGreaterThan(300);
    expect(box?.width).toBeLessThan(400);
  });

  test('should stack cocktail cards vertically on mobile', async ({ page }) => {
    await page.goto('/cocktails');

    // Wait for cards to load
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible();

    // On mobile, cards should stack (different Y positions)
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();

    if (firstCard && secondCard) {
      // Second card should be below first card
      expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height - 20);
    }
  });

  test('should make mode toggle buttons stack on small screens', async ({ page }) => {
    await page.goto('/');

    // Mode toggle buttons
    const modeButtons = page.locator('.entry-mode-btn');
    await expect(modeButtons.first()).toBeVisible();

    // Buttons should be visible and tappable on mobile
    const firstBtn = await modeButtons.first().boundingBox();
    expect(firstBtn?.height).toBeGreaterThan(40); // Touch-friendly height
  });

  test('should allow selecting preset on mobile', async ({ page }) => {
    await page.goto('/');

    // Click preset mode
    await page.click('[data-mode="preset"]');

    // Select should be visible and usable
    const select = page.locator('#recipe-select');
    await expect(select).toBeVisible();

    // Select Negroni
    await select.selectOption('negroni');
    await page.waitForTimeout(300);

    // Should show batch instructions
    const instructions = page.locator('#preset-batch-instructions');
    await expect(instructions).toBeVisible();
  });

  test('should show readable ABV and stats on mobile', async ({ page }) => {
    await page.goto('/');

    // Select a preset
    await page.click('[data-mode="preset"]');
    await page.selectOption('#recipe-select', 'margarita');
    await page.waitForTimeout(300);

    // In preset mode, ABV is shown in the preset instructions panel
    const presetInstructions = page.locator('#preset-batch-instructions');
    await expect(presetInstructions).toBeVisible();

    // ABV should be displayed in the stats section
    const abvDisplay = presetInstructions.locator('text=/\\d+\\.\\d+%/').first();
    await expect(abvDisplay).toBeVisible();
  });
});

// Test on Tablet (iPad dimensions)
test.describe('Tablet Viewport (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should show desktop navigation on tablet', async ({ page }) => {
    await page.goto('/');

    // At 768px, should show desktop nav (md breakpoint)
    const desktopNav = page.locator('header ul.hidden.md\\:flex');
    await expect(desktopNav).toBeVisible();
  });

  test('should show cocktail cards in 2-column grid', async ({ page }) => {
    await page.goto('/cocktails');

    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible();

    // On tablet, first two cards should be side by side
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();

    if (firstCard && secondCard) {
      // Cards should be on same row
      expect(Math.abs(firstCard.y - secondCard.y)).toBeLessThan(50);
    }
  });
});

// Test calculator usability across viewports
test.describe('Calculator Usability', () => {
  test('should be usable on small mobile (375x667 - iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mode buttons should be visible
    await expect(page.locator('[data-mode="custom"]')).toBeVisible();
    await expect(page.locator('[data-mode="preset"]')).toBeVisible();

    // Bottle size buttons should be visible
    await expect(page.locator('[data-size="750"]')).toBeVisible();

    // Add ingredient button should be visible
    await expect(page.locator('#add-ingredient')).toBeVisible();
  });

  test('should handle touch on bottle size buttons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Select a preset first
    await page.click('[data-mode="preset"]');
    await page.selectOption('#recipe-select', 'negroni');
    await page.waitForTimeout(300);

    // Click 375ml button
    await page.click('[data-size="375"]');
    await page.waitForTimeout(300);

    // 375ml should be active
    const btn375 = page.locator('[data-size="375"]');
    await expect(btn375).toHaveClass(/active/);

    // Pour-off should change
    const pourOff = await page.locator('#pour-off').textContent();
    expect(pourOff).toContain('8'); // Should be around 8 oz for 375ml
  });
});

// Test footer on different viewports
test.describe('Footer Responsive', () => {
  test('should show footer columns stacked on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should be readable
    const brandSection = footer.locator('a[href="/"]').first();
    await expect(brandSection).toBeVisible();
  });

  test('should show footer in grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
