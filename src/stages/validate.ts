import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Image, Root } from 'mdast';
import { visit } from 'unist-util-visit';

import { Markdown2ImgError } from '../lib/error.js';
import type { ArticleMeta, ParsedArticle, ValidatedArticle } from '../types.js';

const DEFAULT_AUTHOR_NAME = 'AI 工程 Tay';
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

export async function validateArticle(article: ParsedArticle): Promise<ValidatedArticle> {
  const authorName = readOptionalString(article.frontmatter, 'author_name') ?? DEFAULT_AUTHOR_NAME;
  const avatarPath = readOptionalString(article.frontmatter, 'avatar_path');
  const coverImage = readOptionalString(article.frontmatter, 'cover_image');
  const resolvedAvatarPath = avatarPath
    ? resolveExistingAsset(article.sourceDir, avatarPath, 'Avatar asset')
    : resolveDefaultAvatarPath();

  const meta: ArticleMeta = {
    title: readOptionalString(article.frontmatter, 'title') ?? '',
    author_name: authorName,
    avatar_path: resolvedAvatarPath,
    date: readOptionalString(article.frontmatter, 'date'),
    theme: readOptionalString(article.frontmatter, 'theme'),
    ...(coverImage
      ? { cover_image: resolveExistingAsset(article.sourceDir, coverImage, 'Cover image') }
      : {}),
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
