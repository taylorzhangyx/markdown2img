import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createBrowser, createPage } from '../../src/lib/browser.js';
import { waitForMermaid } from '../../src/lib/mermaid-handler.js';
import { formatCliError } from '../../src/cli.js';
import { normalizeArticle } from '../../src/stages/normalize.js';
import { parseArticle } from '../../src/stages/parse.js';
import { renderHtml } from '../../src/stages/render-html.js';
import { screenshotPages } from '../../src/stages/screenshot.js';
import { validateArticle } from '../../src/stages/validate.js';

describe('error paths', () => {
  it('throws parse_error for missing input', async () => {
    await expect(parseArticle('tests/fixtures/does-not-exist.md')).rejects.toMatchObject({
      code: 'parse_error',
      message: expect.stringContaining('Unable to read markdown file'),
    });
  });

  it('fills in the default author profile when author_name is empty', async () => {
    const parsed = await parseArticle('tests/fixtures/empty-author.md');
    const validated = await validateArticle(parsed);

    expect(validated.meta.author_name).toBe('AI 工程 Tay');
    expect(validated.meta.avatar_path).toContain('default-avatar.png');
  });

  it('throws asset_resolution_error for missing avatar', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/missing-avatar.md');

    await expect(validateArticle(parsed)).rejects.toMatchObject({
      code: 'asset_resolution_error',
      message: expect.stringContaining('Avatar asset not found'),
    });
  });

  it('throws asset_resolution_error for missing cover image', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/missing-cover.md');

    await expect(validateArticle(parsed)).rejects.toMatchObject({
      code: 'asset_resolution_error',
      message: expect.stringContaining('Cover image not found'),
    });
  });

  it('throws mermaid_render_error for bad mermaid syntax', async () => {
    const parsed = await parseArticle('tests/fixtures/bad-mermaid.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);
    const html = await renderHtml(validated.meta, blocks);

    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      await page.setContent(html, { waitUntil: 'load' });
      await expect(waitForMermaid(page)).rejects.toMatchObject({
        code: 'mermaid_render_error',
        message: expect.stringContaining('Mermaid rendering failed'),
      });
    } finally {
      await page.close();
      await browser.close();
    }
  }, 30_000);

  it('throws mermaid_render_error on render timeout when no SVG is generated', async () => {
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      await page.setContent('<!DOCTYPE html><div class="page-content"><div class="block block-mermaid"><pre class="mermaid">graph TD\n  A-->B</pre></div></div>');
      await expect(waitForMermaid(page, 250)).rejects.toMatchObject({
        code: 'mermaid_render_error',
        message: expect.stringContaining('Timed out waiting for Mermaid rendering'),
      });
    } finally {
      await page.close();
      await browser.close();
    }
  }, 30_000);

  it('throws layout_render_error when screenshot writing fails', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'markdown2img-layout-error-'));
    const fakePage = {
      evaluate: async () => undefined,
      screenshot: async () => {
        throw new Error('disk full');
      },
    } as any;

    try {
      await expect(
        screenshotPages(
          fakePage,
          {
            pages: [
              {
                pageIndex: 0,
                blockRange: { start: 0, end: 0 },
                clipY: 0,
                contentHeight: 100,
                contentBottom: 200,
                isFirstPage: true,
                isLastPage: true,
                hasEndMarker: true,
              },
            ],
            totalContentHeight: 100,
          },
          { title: 'Test', author_name: 'Taylor Zhang' },
          outputDir,
        ),
      ).rejects.toMatchObject({
        code: 'layout_render_error',
        message: expect.stringContaining('Failed to capture page 1'),
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('formats uncaught exceptions as internal_exception at the CLI boundary', async () => {
    expect(formatCliError(new Error('boom'))).toBe('[ERROR] internal_exception: boom');
  });
});
