import { test, expect, Page } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/test/');
  await expect(true).toBe(true);
});

export class TestPage {
  
  constructor(private page: Page) { }

  async goto() {
    await this.page.goto('http://localhost:3000/test/');
  }
}