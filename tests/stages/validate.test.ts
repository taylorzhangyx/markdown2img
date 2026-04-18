import { describe, expect, it } from 'vitest';
import { visit } from 'unist-util-visit';

import { parseArticle } from '../../src/stages/parse.js';
import { validateArticle } from '../../src/stages/validate.js';

describe('validateArticle', () => {
  it('returns validated metadata for a valid article', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/article.md');
    const validated = await validateArticle(parsed);

    expect(validated.meta).toMatchObject({
      title: 'With Images',
      author_name: 'Taylor Zhang',
      cover_summary: 'With Images',
    });
    expect(validated.meta.avatar_path).toContain('sample.png');
    expect(validated.meta.cover_image).toContain('sample.png');

    const resolvedUrls: string[] = [];
    visit(validated.mdast, 'image', (node) => {
      resolvedUrls.push(node.url);
    });

    expect(resolvedUrls).toHaveLength(1);
    expect(resolvedUrls[0]).toContain('sample.png');
  });

  it('applies default author, avatar, and derived cover summary when author_name is missing', async () => {
    const parsed = await parseArticle('tests/fixtures/missing-author.md');
    const validated = await validateArticle(parsed);

    expect(validated.meta.author_name).toBe('AI工程Tay');
    expect(validated.meta.avatar_path).toContain('default-avatar.png');
    expect(validated.meta.cover_summary).toBe('No Author');
  });

  it('throws asset_resolution_error for a missing referenced image', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/missing-image.md');

    await expect(validateArticle(parsed)).rejects.toMatchObject({
      code: 'asset_resolution_error',
    });
  });

  it('lets runtime overrides replace cover summary, author name, date, and avatar path', async () => {
    const parsed = await parseArticle('tests/fixtures/with-images/article.md');
    const validated = await validateArticle(parsed, {
      authorName: 'Override Author',
      avatarPath: './sample.png',
      date: '2099-01-01',
      coverSummary: 'Override summary',
    });

    expect(validated.meta).toMatchObject({
      author_name: 'Override Author',
      date: '2099-01-01',
      cover_summary: 'Override summary',
    });
    expect(validated.meta.avatar_path).toContain('sample.png');
  });
});
