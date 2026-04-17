import type { Page } from 'playwright';

import { Markdown2ImgError } from './error.js';

const MERMAID_TIMEOUT_MS = 15_000;

export async function checkMermaidErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errors = new Set<string>();

    document.querySelectorAll('.mermaid .error-text').forEach((element) => {
      const text = element.textContent?.trim();
      if (text) {
        errors.add(text);
      }
    });

    document.querySelectorAll('.mermaid svg text').forEach((element) => {
      const text = element.textContent?.trim() ?? '';
      if (/error|syntax/i.test(text)) {
        errors.add(text);
      }
    });

    document.querySelectorAll('.block-mermaid').forEach((block, index) => {
      if (!block.querySelector('svg')) {
        errors.add(`Mermaid block ${index}: no SVG generated`);
      }
    });

    return [...errors];
  });
}

export async function waitForMermaid(page: Page, timeoutMs = MERMAID_TIMEOUT_MS): Promise<void> {
  const mermaidBlockCount = await page.$$eval('.block-mermaid', (elements) => elements.length);
  if (mermaidBlockCount === 0) {
    return;
  }

  try {
    await page.waitForFunction(
      (count: number) => {
        const renderedCount = document.querySelectorAll('.block-mermaid svg').length;
        const hasClassicErrors = document.querySelectorAll('.mermaid .error-text').length > 0;
        const hasSvgTextErrors = Array.from(document.querySelectorAll('.mermaid svg text')).some((element) => {
          const text = element.textContent ?? '';
          return /error|syntax/i.test(text);
        });

        return renderedCount >= count || hasClassicErrors || hasSvgTextErrors;
      },
      mermaidBlockCount,
      { timeout: timeoutMs },
    );
  } catch (error) {
    throw new Markdown2ImgError(
      'mermaid_render_error',
      `Timed out waiting for Mermaid rendering after ${timeoutMs}ms`,
      error instanceof Error ? error.message : String(error),
    );
  }

  const errors = await checkMermaidErrors(page);
  if (errors.length > 0) {
    throw new Markdown2ImgError(
      'mermaid_render_error',
      `Mermaid rendering failed: ${errors.join('; ')}`,
    );
  }
}
