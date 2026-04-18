import { basename } from 'node:path';

import { createBrowser, createPage } from './lib/browser.js';
import { createOutputDir, resolveOutputBase } from './lib/fs-utils.js';
import { waitForMermaid } from './lib/mermaid-handler.js';
import { normalizeArticle } from './stages/normalize.js';
import { computePageBreaks, measureBlocks } from './stages/paginate.js';
import { parseArticle } from './stages/parse.js';
import { renderHtml } from './stages/render-html.js';
import { renderCoverPage, screenshotPages } from './stages/screenshot.js';
import { validateArticle } from './stages/validate.js';

export interface PipelineResult {
  readonly outputDir: string;
  readonly files: readonly string[];
}

async function loadArticlePage(page: Awaited<ReturnType<typeof createPage>>, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(
    async () => {
      await document.fonts.ready;
      return Array.from(document.images).every((image) => image.complete);
    },
    undefined,
    { timeout: 15_000 },
  );
  await waitForMermaid(page);
}

export async function runPipeline(inputPath: string, outputBase?: string): Promise<PipelineResult> {
  const parsed = await parseArticle(inputPath);
  console.log(`✓ Parsed: ${basename(parsed.sourcePath)}`);

  const validated = await validateArticle(parsed);
  const blocks = await normalizeArticle(validated);
  console.log(`✓ Validated: author_name=${validated.meta.author_name}, blocks=${blocks.length}`);

  const html = await renderHtml(validated.meta, blocks);
  const baseDir = resolveOutputBase(inputPath, outputBase);
  const outputDir = createOutputDir(baseDir);

  const browser = await createBrowser();
  const page = await createPage(browser);

  try {
    await loadArticlePage(page, html);

    const measurements = await measureBlocks(page);
    const plan = computePageBreaks(measurements);

    const files: string[] = [];
    let pageOffset = 0;

    files.push(await renderCoverPage(page, validated.meta, outputDir, 1));
    pageOffset = 1;
    await loadArticlePage(page, html);

    files.push(...(await screenshotPages(page, plan, validated.meta, outputDir, pageOffset)));

    console.log(`✓ Rendered: ${files.length} page(s)`);
    console.log(`✓ Output: ${outputDir}`);
    for (const file of files) {
      console.log(`  ${basename(file)}`);
    }

    return { outputDir, files };
  } finally {
    await page.close().catch(() => {});
    await browser.close();
  }
}
