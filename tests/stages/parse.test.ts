import { describe, expect, it } from 'vitest';
import { visit } from 'unist-util-visit';

import { Markdown2ImgError } from '../../src/lib/error.js';
import { parseArticle } from '../../src/stages/parse.js';

const BASIC_ARTICLE = 'tests/fixtures/basic-article.md';
const COMPREHENSIVE_ARTICLE = 'tests/fixtures/agent-memory-design-comprehensive.md';

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

  it('does not split long prose lines that contain markdown emphasis or image syntax', async () => {
    const article = await parseArticle(COMPREHENSIVE_ARTICLE);

    let foundStrongParagraph = false;
    let foundImageNode = false;

    visit(article.mdast, 'paragraph', (node: any) => {
      const text = node.children
        .map((child: any) => ('value' in child ? child.value : ''))
        .join('');

      if (text.includes('如果你正在做一个真正要长期运行的 Agent')) {
        expect(node.children.some((child: any) => child.type === 'strong')).toBe(true);
        expect(text).toContain('当 Agent 开始面对真实项目');
        foundStrongParagraph = true;
      }
    });

    visit(article.mdast, 'image', (node: any) => {
      if (String(node.url).includes('Pasted image 20260324181632.png')) {
        foundImageNode = true;
      }
    });

    expect(foundStrongParagraph).toBe(true);
    expect(foundImageNode).toBe(true);
  });
});
