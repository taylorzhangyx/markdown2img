import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ArticleMeta, ContentBlock } from '../types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function resolveAssetPath(...relativeCandidates: string[]): string {
  for (const candidate of relativeCandidates) {
    const absolutePath = resolve(MODULE_DIR, candidate);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  throw new Error(`Unable to resolve bundled asset from candidates: ${relativeCandidates.join(', ')}`);
}

const THEME_CSS_PATH = resolveAssetPath('../templates/theme-default.css', './templates/theme-default.css');
const MERMAID_SCRIPT_PATH = resolveAssetPath('../assets/mermaid.min.js', './assets/mermaid.min.js');

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getBlockText(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'list':
    case 'blockquote':
    case 'code':
    case 'table':
      return stripHtml(block.html);
    case 'image':
      return block.alt?.trim() ?? '';
    case 'mermaid':
      return block.code.trim();
    default:
      return '';
  }
}

function isHeading(block: ContentBlock | undefined, level?: 1 | 2 | 3): block is Extract<ContentBlock, { type: 'heading' }> {
  return block?.type === 'heading' && (level === undefined || block.level === level);
}

function isStructuralBreak(block: ContentBlock | undefined): boolean {
  return !block || block.type === 'heading' || block.type === 'image' || block.type === 'table' || block.type === 'mermaid' || block.type === 'code';
}

function getBlockRole(blocks: readonly ContentBlock[], index: number): string | undefined {
  const block = blocks[index];
  if (!block) {
    return undefined;
  }

  const previous = index > 0 ? blocks[index - 1] : undefined;
  const next = index + 1 < blocks.length ? blocks[index + 1] : undefined;

  if (block.type === 'paragraph') {
    const text = getBlockText(block);

    if (isHeading(previous, 2)) {
      return 'section-opening';
    }

    if (isHeading(previous, 3)) {
      return 'subsection-opening';
    }

    if (next?.type === 'list' && /[：:]$/.test(text)) {
      return 'list-intro';
    }

    if (previous?.type === 'blockquote') {
      return 'takeaway';
    }

    if (previous?.type === 'list') {
      return 'takeaway';
    }

    return undefined;
  }

  if (block.type === 'list') {
    if (previous?.type === 'paragraph' && getBlockRole(blocks, index - 1) === 'list-intro') {
      return 'list-cluster';
    }

    return undefined;
  }

  if (block.type === 'blockquote') {
    return 'takeaway-callout';
  }

  return undefined;
}

function renderBlock(blocks: readonly ContentBlock[], index: number): string {
  const block = blocks[index]!;
  const role = getBlockRole(blocks, index);
  const extraClasses = [
    block.type === 'heading' ? `block-heading-level-${block.level}` : '',
    role ? `block-role-${role}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const roleAttribute = role ? ` data-block-role="${role}"` : '';
  const classSuffix = extraClasses ? ` ${extraClasses}` : '';
  const open = `<div class="block block-${block.type}${classSuffix}" data-block-index="${index}" data-block-type="${block.type}"${roleAttribute}>`;

  switch (block.type) {
    case 'image': {
      const alt = block.alt ? ` alt="${escapeHtml(block.alt)}"` : ' alt=""';
      return `${open}<img src="${escapeHtml(block.fileUrl)}"${alt} style="max-width:100%;height:auto;">` + '</div>';
    }
    case 'mermaid':
      return `${open}<pre class="mermaid">${escapeHtml(block.code)}</pre></div>`;
    default:
      return `${open}${block.html}</div>`;
  }
}

export async function renderHtml(meta: ArticleMeta, blocks: readonly ContentBlock[]): Promise<string> {
  const [themeCss, mermaidScript] = await Promise.all([
    readFile(THEME_CSS_PATH, 'utf8'),
    readFile(MERMAID_SCRIPT_PATH, 'utf8'),
  ]);

  const title = meta.title.trim() || 'Untitled Article';
  const content = blocks.map((_, index) => renderBlock(blocks, index)).join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
    `  <style>${themeCss}</style>`,
    `  <script>${mermaidScript}</script>`,
    `  <script>
      mermaid.initialize({
        startOnLoad: true,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: {
          htmlLabels: false,
          useMaxWidth: true,
          nodeSpacing: 24,
          rankSpacing: 36,
        },
        themeVariables: {
          background: '#F5F2EC',
          primaryColor: '#FAF7F2',
          primaryTextColor: '#1F2328',
          primaryBorderColor: '#B88447',
          lineColor: '#9C8A75',
          tertiaryColor: '#F1ECE4',
          fontFamily: 'Songti SC, STSong, Noto Serif CJK SC, Noto Serif SC, Source Han Serif SC, Source Han Serif CN, serif',
          fontSize: '18px',
        },
      });
    </script>`,
    '</head>',
    '<body style="margin:0;padding:0;background:#F5F2EC;">',
    '  <div class="page-content">',
    content,
    '  </div>',
    '</body>',
    '</html>',
  ].join('\n');
}
