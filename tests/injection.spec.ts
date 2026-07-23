import { expect, test } from '@playwright/test';

test.describe('custom ingredient DOM safety', () => {
  test('renders hostile ingredient names as inert visible text', async ({ page }) => {
    const imagePayload = '<img src=x onerror="window.__pwned=1">';
    const attributePayload = 'nasty" onmouseover="window.__pwned=1';

    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();

    const rows = page.locator('.ingredient-row');
    await rows.nth(0).getByPlaceholder('Ingredient name').fill(imagePayload);
    await rows.nth(0).getByPlaceholder('2').fill('1');
    await rows.nth(0).getByPlaceholder('40').fill('40');
    await rows.nth(1).getByPlaceholder('Ingredient name').fill(attributePayload);
    await rows.nth(1).getByPlaceholder('2').fill('1');
    await rows.nth(1).getByPlaceholder('40').fill('10');

    const composition = page.locator('#composition-bar');
    await expect(composition).toBeVisible();
    await expect(composition.getByText(imagePayload, { exact: true })).toBeVisible();
    await expect(composition.getByText(attributePayload, { exact: true })).toBeVisible();
    await expect(composition.locator('img')).toHaveCount(0);

    // Exercise the location that used to become an injected mouseover handler.
    await composition.locator('.composition-seg').nth(1).hover();
    await expect.poll(
      () => page.evaluate(() => (window as Window & { __pwned?: number }).__pwned)
    ).toBeUndefined();
  });

  test('enforces C2 input hints and the eight-row limit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();

    const firstRow = page.locator('.ingredient-row').first();
    await expect(firstRow.getByPlaceholder('Ingredient name')).toHaveAttribute('maxlength', '60');
    await expect(firstRow.getByPlaceholder('2')).toHaveAttribute('min', '0.01');
    await expect(firstRow.getByPlaceholder('2')).toHaveAttribute('max', '100');
    await expect(firstRow.getByPlaceholder('40')).toHaveAttribute('min', '0');
    await expect(firstRow.getByPlaceholder('40')).toHaveAttribute('max', '100');

    const addButton = page.getByRole('button', { name: 'Add Ingredient' });
    for (let rowCount = 2; rowCount < 8; rowCount += 1) {
      await addButton.click();
    }

    await expect(page.locator('.ingredient-row')).toHaveCount(8);
    await expect(addButton).toBeDisabled();

    await page.locator('.ingredient-row').last().getByRole('button', { name: 'Remove ingredient' }).click();
    await expect(page.locator('.ingredient-row')).toHaveCount(7);
    await expect(addButton).toBeEnabled();
  });

  test('rejects out-of-range field values when reading the form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Custom' }).click();

    const rows = page.locator('.ingredient-row');
    await rows.nth(0).getByPlaceholder('Ingredient name').fill('Gin');
    await rows.nth(0).getByPlaceholder('2').fill('1');
    await rows.nth(0).getByPlaceholder('40').fill('40');

    const rejectedName = 'Out of range';
    const rejectedRow = rows.nth(1);
    await rejectedRow.getByPlaceholder('Ingredient name').fill(rejectedName);
    await rejectedRow.getByPlaceholder('40').fill('10');
    await rejectedRow.getByPlaceholder('2').fill('101');
    await expect(page.locator('#composition-bar').getByText(rejectedName, { exact: true })).toHaveCount(0);

    await rejectedRow.getByPlaceholder('2').fill('1');
    await rejectedRow.getByPlaceholder('40').fill('101');
    await expect(page.locator('#composition-bar').getByText(rejectedName, { exact: true })).toHaveCount(0);

    await rejectedRow.getByPlaceholder('40').fill('10');
    await rejectedRow.getByPlaceholder('Ingredient name').evaluate((input, value) => {
      const field = input as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }, 'x'.repeat(61));
    await expect(page.locator('#composition-bar').getByText('x'.repeat(61), { exact: true })).toHaveCount(0);
  });
});
