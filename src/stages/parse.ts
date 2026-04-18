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

function isParagraphLikeLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '') {
    return false;
  }

  if (
    trimmed === '---'
    || trimmed === '***'
    || trimmed === '___'
    || trimmed.startsWith('```')
    || trimmed.startsWith('~~~')
    || trimmed.startsWith('#')
    || trimmed.startsWith('>')
    || trimmed.startsWith('- ')
    || trimmed.startsWith('* ')
    || trimmed.startsWith('+ ')
    || trimmed.startsWith('|')
    || /^\d+\.\s/.test(trimmed)
  ) {
    return false;
  }

  if (
    trimmed.includes('**')
    || trimmed.includes('`')
    || trimmed.includes('![')
    || /^\[[^\]]+\]\([^)]+\)$/.test(trimmed)
  ) {
    return false;
  }

  return true;
}

function splitLongProseLine(line: string): string[] {
  const trimmed = line.trim();
  if (trimmed.length <= 120) {
    return [line];
  }

  const sentences = trimmed.match(/[^。！？!?]+[。！？!?]?/gu);
  if (!sentences || sentences.length <= 1) {
    return [line];
  }

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const next = `${current}${sentence}`.trim();
    if (current !== '' && next.length > 110) {
      chunks.push(current.trim());
      current = sentence;
      continue;
    }

    current = next;
  }

  if (current.trim() !== '') {
    chunks.push(current.trim());
  }

  return chunks.length > 1 ? chunks : [line];
}

function expandTightProseParagraphs(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let inFence = false;
  let bodyStartIndex = 0;

  if (lines[0]?.trim() === '---') {
    output.push(lines[0]);
    let frontmatterClosed = false;
    for (let index = 1; index < lines.length; index += 1) {
      output.push(lines[index]);
      if (lines[index]?.trim() === '---') {
        bodyStartIndex = index + 1;
        frontmatterClosed = true;
        break;
      }
    }

    if (!frontmatterClosed) {
      return markdown;
    }
  }

  for (let index = bodyStartIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    const expandedLines = !inFence && isParagraphLikeLine(line) ? splitLongProseLine(line) : [line];
    for (const expandedLine of expandedLines) {
      const previousOutputLine = output.length > 0 ? output[output.length - 1] ?? '' : '';
      if (
        !inFence
        && isParagraphLikeLine(expandedLine)
        && isParagraphLikeLine(previousOutputLine)
        && previousOutputLine.trim() !== ''
      ) {
        output.push('');
      }

      output.push(expandedLine);
    }
  }

  return output.join('\n');
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

  const normalizedMarkdown = expandTightProseParagraphs(markdown);

  let mdast: Root;
  try {
    mdast = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']).parse(normalizedMarkdown) as Root;
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
