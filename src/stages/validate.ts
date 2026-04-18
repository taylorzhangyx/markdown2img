import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Image, Paragraph, PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';

import { Markdown2ImgError } from '../lib/error.js';
import type { ArticleMeta, ParsedArticle, RuntimeMetaOverrides, ValidatedArticle } from '../types.js';

const DEFAULT_AUTHOR_NAME = 'AI工程Tay';
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function resolveDefaultAvatarPath(): string {
  const candidates = [
    resolve(MODULE_DIR, '../assets/default-avatar.png'),
    resolve(MODULE_DIR, './assets/default-avatar.png'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Markdown2ImgError(
    'asset_resolution_error',
    'Default avatar asset not found',
    `Checked: ${candidates.join(', ')}`,
  );
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function resolveExistingAsset(sourceDir: string, assetPath: string, label: string): string {
  const absolutePath = resolve(sourceDir, assetPath);
  if (!existsSync(absolutePath)) {
    throw new Markdown2ImgError(
      'asset_resolution_error',
      `${label} not found: ${assetPath}`,
      `Resolved path: ${absolutePath}`,
    );
  }
  return absolutePath;
}

function extractInlineText(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'strong':
    case 'emphasis':
    case 'delete':
    case 'link':
      return node.children.map((child) => extractInlineText(child as PhrasingContent)).join('');
    case 'inlineCode':
      return node.value;
    case 'break':
      return ' ';
    case 'image':
      return node.alt ?? '';
    default:
      return '';
  }
}

function normalizeSummaryText(value: string, maxLength = 220): string | undefined {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxLength);
  const sentenceBreak = Math.max(truncated.lastIndexOf('。'), truncated.lastIndexOf('！'), truncated.lastIndexOf('？'));
  if (sentenceBreak >= 60) {
    return truncated.slice(0, sentenceBreak + 1).trim();
  }

  const wordBreak = truncated.lastIndexOf(' ');
  const safeCut = wordBreak >= 80 ? wordBreak : maxLength;
  return `${truncated.slice(0, safeCut).trim()}…`;
}

function deriveCoverSummary(article: ParsedArticle): string | undefined {
  const explicit = readOptionalString(article.frontmatter, 'cover_summary') ?? readOptionalString(article.frontmatter, 'summary');
  if (explicit) {
    return normalizeSummaryText(explicit, 300);
  }

  for (const child of article.mdast.children) {
    if (child.type !== 'paragraph') {
      continue;
    }

    const paragraph = child as Paragraph;
    if (paragraph.children.every((node) => node.type === 'image')) {
      continue;
    }

    const text = normalizeSummaryText(paragraph.children.map((node) => extractInlineText(node as PhrasingContent)).join(''));
    if (text) {
      return text;
    }
  }

  return normalizeSummaryText(readOptionalString(article.frontmatter, 'title') ?? '', 120);
}

export async function validateArticle(article: ParsedArticle, overrides: RuntimeMetaOverrides = {}): Promise<ValidatedArticle> {
  const authorName = overrides.authorName?.trim() || readOptionalString(article.frontmatter, 'author_name') || DEFAULT_AUTHOR_NAME;
  const avatarPath = overrides.avatarPath?.trim() || readOptionalString(article.frontmatter, 'avatar_path');
  const coverImage = readOptionalString(article.frontmatter, 'cover_image');
  const coverSummary = overrides.coverSummary?.trim() || deriveCoverSummary(article);
  const resolvedAvatarPath = avatarPath
    ? resolveExistingAsset(article.sourceDir, avatarPath, 'Avatar asset')
    : resolveDefaultAvatarPath();

  const meta: ArticleMeta = {
    title: readOptionalString(article.frontmatter, 'title') ?? '',
    author_name: authorName,
    avatar_path: resolvedAvatarPath,
    date: overrides.date?.trim() || readOptionalString(article.frontmatter, 'date'),
    theme: readOptionalString(article.frontmatter, 'theme'),
    ...(coverImage
      ? { cover_image: resolveExistingAsset(article.sourceDir, coverImage, 'Cover image') }
      : {}),
    ...(coverSummary ? { cover_summary: coverSummary } : {}),
  };

  visit(article.mdast as Root, 'image', (node) => {
    const imageNode = node as Image;
    const absolutePath = resolveExistingAsset(article.sourceDir, imageNode.url, 'Referenced image');
    imageNode.url = absolutePath;
  });

  return {
    meta,
    mdast: article.mdast,
    sourceDir: article.sourceDir,
  };
}
