import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

import type { Root } from 'mdast';
import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import YAML from 'yaml';

import { Markdown2ImgError } from '../lib/error.js';
import type { ParsedArticle } from '../types.js';

interface YamlNode {
  type: 'yaml';
  value?: string;
}

export async function parseArticle(inputPath: string): Promise<ParsedArticle> {
  const sourcePath = resolve(inputPath);
  let markdown: string;

  try {
    markdown = await readFile(sourcePath, 'utf8');
  } catch (error) {
    throw new Markdown2ImgError(
      'parse_error',
      `Unable to read markdown file: ${sourcePath}`,
      error instanceof Error ? error.message : String(error),
    );
  }

  let mdast: Root;
  try {
    mdast = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']).parse(markdown) as Root;
  } catch (error) {
    throw new Markdown2ImgError(
      'parse_error',
      `Unable to parse markdown file: ${sourcePath}`,
      error instanceof Error ? error.message : String(error),
    );
  }

  let frontmatter: Record<string, unknown> = {};
  let yamlNode: YamlNode | undefined;
  visit(mdast, 'yaml', (node) => {
    yamlNode = node as YamlNode;
    return false;
  });

  if (yamlNode?.value) {
    try {
      const parsed = YAML.parse(yamlNode.value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        frontmatter = parsed as Record<string, unknown>;
      } else if (parsed != null) {
        throw new Error('Frontmatter must be a YAML mapping object.');
      }
    } catch (error) {
      throw new Markdown2ImgError(
        'parse_error',
        `Unable to parse YAML frontmatter: ${sourcePath}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return {
    frontmatter,
    mdast,
    sourcePath,
    sourceDir: dirname(sourcePath),
  };
}
