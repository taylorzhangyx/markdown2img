import { describe, expect, it } from 'vitest';

import { parseArticle } from '../../src/stages/parse.js';
import { normalizeArticle } from '../../src/stages/normalize.js';
import { validateArticle } from '../../src/stages/validate.js';

describe('normalizeArticle', () => {
  it('produces heading, paragraph, list, and blockquote blocks in order', async () => {
    const parsed = await parseArticle('tests/fixtures/basic-article.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'heading',
      'list',
      'blockquote',
    ]);
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[0]?.type === 'heading' ? blocks[0].html : '').toContain('<h1>');
    expect(blocks[3]?.type === 'list' ? blocks[3].html : '').toContain('<ul>');
    expect(blocks[4]?.type === 'blockquote' ? blocks[4].html : '').toContain('<blockquote>');
  });

  it('converts mermaid code blocks into mermaid blocks and other code blocks into code blocks', async () => {
    const parsed = await parseArticle('tests/fixtures/with-mermaid.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);

    expect(blocks.map((block) => block.type)).toEqual(['heading', 'mermaid', 'code']);
    expect(blocks[1]).toMatchObject({ type: 'mermaid' });
    expect(blocks[2]).toMatchObject({ type: 'code', lang: 'ts' });
    expect(blocks[2]?.type === 'code' ? blocks[2].html : '').toContain('<pre><code class="language-ts">');
  });

  it('converts image nodes into image blocks with file URLs', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/article.md');
    const validated = await validateArticle(parsed);
    const blocks = await normalizeArticle(validated);
    const imageBlock = blocks.find((block) => block.type === 'image');

    expect(imageBlock).toMatchObject({
      type: 'image',
      alt: 'Sample alt',
    });
    expect(imageBlock?.type === 'image' ? imageBlock.fileUrl : '').toMatch(/^file:\/\//);
    expect(imageBlock?.type === 'image' ? imageBlock.src : '').toContain('sample.png');
  });
});
