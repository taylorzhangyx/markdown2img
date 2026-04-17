import { describe, expect, it } from 'vitest';

import { Markdown2ImgError } from '../../src/lib/error.js';
import { parseArticle } from '../../src/stages/parse.js';

const BASIC_ARTICLE = 'tests/fixtures/basic-article.md';

describe('parseArticle', () => {
  it('parses frontmatter and mdast from a basic article', async () => {
    const article = await parseArticle(BASIC_ARTICLE);

    expect(article.frontmatter).toMatchObject({
      title: 'Test Article',
      author_name: 'Taylor Zhang',
      date: '2026-04-17',
    });
    expect(article.mdast.children.length).toBeGreaterThan(0);
    expect(article.sourcePath).toContain('basic-article.md');
  });

  it('throws parse_error for a missing file', async () => {
    await expect(parseArticle('tests/fixtures/does-not-exist.md')).rejects.toMatchObject({
      code: 'parse_error',
    } satisfies Partial<Markdown2ImgError>);
  });
});
