import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Markdown2ImgError } from './error.js';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function getImageMimeType(absolutePath: string): string {
  const extension = extname(absolutePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    throw new Markdown2ImgError(
      'asset_resolution_error',
      `Unsupported image extension: ${extension || '(none)'}`,
      `Path: ${absolutePath}`,
    );
  }
  return mimeType;
}

export function toFileUrl(absolutePath: string): string {
  return pathToFileURL(resolve(absolutePath)).toString();
}

export function toBase64DataUri(absolutePath: string): string {
  const normalizedPath = resolve(absolutePath);
  const mimeType = getImageMimeType(normalizedPath);
  const file = readFileSync(normalizedPath);
  return `data:${mimeType};base64,${file.toString('base64')}`;
}

export const avatarToBase64 = toBase64DataUri;
