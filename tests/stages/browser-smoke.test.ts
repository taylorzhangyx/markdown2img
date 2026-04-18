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

import { LAYOUT } from '../../src/types.js';
import { measureBlocks, computePageBreaks } from '../../src/stages/paginate.js';

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

  it('reserves first-page header space and avoids an END-only blank page for social-style markdown', async () => {
    const parsed = await parseArticle('tests/fixtures/xiaohongshu-tight-lines.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);
    const html = await renderHtml(validated.meta, blocks);

    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), undefined, {
        timeout: 15_000,
      });
      await waitForMermaid(page);

      const measurements = await measureBlocks(page);
      const plan = computePageBreaks(measurements);

      expect(measurements[0]?.top).toBeGreaterThanOrEqual(LAYOUT.PAGE_PADDING + LAYOUT.FIRST_PAGE_IDENTITY);
      expect(plan.pages[0]?.clipY).toBe(0);
      expect(plan.pages.at(-1)?.blockRange.start).not.toBe(-1);
    } finally {
      await page.close();
      await browser.close();
    }
  }, 30_000);
});
