import { chromium, type Browser, type Page } from 'playwright';

import { LAYOUT } from '../types.js';

export async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--font-render-hinting=none',
      '--allow-file-access-from-files',
    ],
  });
}

export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewportSize({
    width: LAYOUT.PAGE_WIDTH,
    height: LAYOUT.PAGE_HEIGHT,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return page;
}
