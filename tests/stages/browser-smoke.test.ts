import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createBrowser, createPage } from '../../src/lib/browser.js';
import { waitForMermaid } from '../../src/lib/mermaid-handler.js';
import { parseArticle } from '../../src/stages/parse.js';
import { normalizeArticle } from '../../src/stages/normalize.js';
import { renderHtml } from '../../src/stages/render-html.js';
import { validateArticle } from '../../src/stages/validate.js';

describe('playwright smoke', () => {
  it('renders the generated HTML and writes a non-empty full-page screenshot', async () => {
    const parsed = await parseArticle('tests/fixtures/full-article.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);
    const html = await renderHtml(validated.meta, blocks);

    const browser = await createBrowser();
    const page = await createPage(browser);
    const tempDir = await mkdtemp(join(tmpdir(), 'markdown2img-smoke-'));
    const screenshotPath = join(tempDir, 'full-page.png');

    try {
      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), undefined, {
        timeout: 15_000,
      });
      await waitForMermaid(page);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png',
      });

      const screenshotStat = await stat(screenshotPath);
      expect(screenshotStat.isFile()).toBe(true);
      expect(screenshotStat.size).toBeGreaterThan(0);
    } finally {
      await page.close();
      await browser.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 30_000);
});
