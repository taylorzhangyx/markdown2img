import type { Code, Heading, Image, Paragraph, Root, RootContent } from 'mdast';
import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

import { toBase64DataUri } from '../lib/image-handler.js';
import type { ContentBlock, ValidatedArticle } from '../types.js';

function nodeToHtml(node: RootContent): string {
  const processor = unified().use(remarkRehype).use(rehypeStringify);
  const root: Root = {
    type: 'root',
    children: [node],
  };

  const hast = processor.runSync(root);
  return String(processor.stringify(hast)).trim();
}

function normalizeHeading(node: Heading): ContentBlock | null {
  if (node.depth < 1 || node.depth > 3) {
    return null;
  }

  return {
    type: 'heading',
    level: node.depth as 1 | 2 | 3,
    html: nodeToHtml(node),
  };
}

function normalizeCode(node: Code): ContentBlock {
  if (node.lang === 'mermaid') {
    return {
      type: 'mermaid',
      code: node.value,
    };
  }

  return {
    type: 'code',
    lang: node.lang ?? undefined,
    html: nodeToHtml(node),
  };
}

function normalizeImage(node: Image): ContentBlock {
  return {
    type: 'image',
    src: node.url,
    alt: node.alt ?? undefined,
    fileUrl: toBase64DataUri(node.url),
  };
}

function normalizeParagraph(node: Paragraph): ContentBlock {
  if (node.children.length === 1 && node.children[0]?.type === 'image') {
    return normalizeImage(node.children[0]);
  }

  return {
    type: 'paragraph',
    html: nodeToHtml(node),
  };
}

function normalizeNode(node: RootContent): ContentBlock | null {
  switch (node.type) {
    case 'heading':
      return normalizeHeading(node);
    case 'paragraph':
      return normalizeParagraph(node);
    case 'list':
      return {
        type: 'list',
        ordered: Boolean(node.ordered),
        html: nodeToHtml(node),
      };
    case 'blockquote':
      return {
        type: 'blockquote',
        html: nodeToHtml(node),
      };
    case 'code':
      return normalizeCode(node);
    case 'table':
      return {
        type: 'table',
        html: nodeToHtml(node),
      };
    case 'image':
      return normalizeImage(node);
    default:
      return null;
  }
}

export async function normalizeArticle(article: ValidatedArticle): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];

  for (const node of article.mdast.children) {
    const block = normalizeNode(node as RootContent);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}
