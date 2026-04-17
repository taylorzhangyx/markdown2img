import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Image, Root } from 'mdast';
import { visit } from 'unist-util-visit';

import { Markdown2ImgError } from '../lib/error.js';
import type { ArticleMeta, ParsedArticle, ValidatedArticle } from '../types.js';

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
  const authorName = readOptionalString(article.frontmatter, 'author_name');
  if (!authorName) {
    throw new Markdown2ImgError(
      'validation_error',
      'Missing required frontmatter field: author_name',
    );
  }

  const avatarPath = readOptionalString(article.frontmatter, 'avatar_path');
  const coverImage = readOptionalString(article.frontmatter, 'cover_image');

  const meta: ArticleMeta = {
    title: readOptionalString(article.frontmatter, 'title') ?? '',
    author_name: authorName,
    date: readOptionalString(article.frontmatter, 'date'),
    theme: readOptionalString(article.frontmatter, 'theme'),
    ...(avatarPath
      ? { avatar_path: resolveExistingAsset(article.sourceDir, avatarPath, 'Avatar asset') }
      : {}),
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
