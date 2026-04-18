import { basename } from 'node:path';

import { createBrowser, createPage } from './lib/browser.js';
import { prepareOutputDir } from './lib/fs-utils.js';
import { waitForMermaid } from './lib/mermaid-handler.js';
import { normalizeArticle } from './stages/normalize.js';
import { computePageBreaks, measureBlocks } from './stages/paginate.js';
import { parseArticle } from './stages/parse.js';
import { renderHtml } from './stages/render-html.js';
import { renderCoverPage, screenshotPages } from './stages/screenshot.js';
import { validateArticle } from './stages/validate.js';
import type { PipelineOptions } from './types.js';

export interface PipelineResult {
  readonly outputMode: 'timestamped' | 'fixed';
  readonly outputDir: string;
  readonly files: readonly string[];
  readonly pageCount: number;
  readonly renderedCover: boolean;
  readonly renderedBody: boolean;
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

export async function runPipeline(inputPath: string, options: PipelineOptions = {}): Promise<PipelineResult> {
  const log = options.log ?? ((line: string) => console.log(line));

  const parsed = await parseArticle(inputPath);
  log(`✓ Parsed: ${basename(parsed.sourcePath)}`);

  const validated = await validateArticle(parsed, options.metaOverrides);
  const blocks = await normalizeArticle(validated);
  log(`✓ Validated: author_name=${validated.meta.author_name}, blocks=${blocks.length}`);

  const preparedOutput = await prepareOutputDir({
    inputPath,
    outputBase: options.outputBase,
    outputDir: options.outputDir,
    overwrite: options.overwrite,
  });

  const browser = await createBrowser();
  const page = await createPage(browser);

  try {
    const files: string[] = [];

    files.push(await renderCoverPage(page, validated.meta, preparedOutput.outputDir, 1));

    if (!options.coverOnly) {
      const html = await renderHtml(validated.meta, blocks);
      await loadArticlePage(page, html);

      const measurements = await measureBlocks(page);
      const plan = computePageBreaks(measurements);
      files.push(...(await screenshotPages(page, plan, validated.meta, preparedOutput.outputDir, 1)));
    }

    log(`✓ Rendered: ${files.length} page(s)`);
    log(`✓ Output: ${preparedOutput.outputDir}`);
    for (const file of files) {
      log(`  ${basename(file)}`);
    }

    return {
      outputMode: preparedOutput.mode,
      outputDir: preparedOutput.outputDir,
      files,
      pageCount: files.length,
      renderedCover: true,
      renderedBody: !options.coverOnly,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close();
  }
}
