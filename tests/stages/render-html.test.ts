import { describe, expect, it } from 'vitest';

import { parseArticle } from '../../src/stages/parse.js';
import { normalizeArticle } from '../../src/stages/normalize.js';
import { renderHtml } from '../../src/stages/render-html.js';
import { validateArticle } from '../../src/stages/validate.js';

describe('renderHtml', () => {
  it('renders a full article HTML document with inline theme and block metadata', async () => {
    const parsed = await parseArticle('tests/fixtures/full-article.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'heading',
      'list',
      'list',
      'blockquote',
      'image',
      'heading',
      'code',
      'heading',
      'table',
      'mermaid',
    ]);

    const html = await renderHtml(validated.meta, blocks);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('--page-width: 1080px;');
    expect(html).toContain("mermaid.initialize({");
    expect(html).toContain("theme: 'base'");
    expect(html).toContain("htmlLabels: false");
    expect(html).toContain('data-block-index="0"');
    expect(html).toContain(`data-block-index="${blocks.length - 1}"`);
    expect(html).toContain('data-block-type="table"');
    expect(html).toContain('data-block-type="mermaid"');
    expect(html).toContain('<pre class="mermaid">');
    expect(html).toContain('<table>');
    expect(html).toContain('<img src="data:image/png;base64,');
    expect(html).toContain('Fixture image');
  });

  it('adds structural roles that support stronger body grouping and hierarchy', async () => {
    const parsed = await parseArticle('tests/fixtures/agent-memory-design-comprehensive.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);
    const html = await renderHtml(validated.meta, blocks);

    expect(html).toContain('data-block-role="section-opening"');
    expect(html).toContain('data-block-role="subsection-opening"');
    expect(html).toContain('data-block-role="list-intro"');
    expect(html).toContain('data-block-role="list-cluster"');
    expect(html).toContain('data-block-role="takeaway"');
    expect(html).toContain('data-block-role="takeaway-callout"');
    expect(html).toContain('block-heading-level-2');
    expect(html).toContain('block-heading-level-3');
  });
});
