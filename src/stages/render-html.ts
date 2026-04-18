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

function renderBlock(block: ContentBlock, index: number): string {
  const open = `<div class="block block-${block.type}" data-block-index="${index}" data-block-type="${block.type}">`;

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
  const content = blocks.map((block, index) => renderBlock(block, index)).join('\n');

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
          background: '#111318',
          primaryColor: '#1d222a',
          primaryTextColor: '#f2ede4',
          primaryBorderColor: '#d6b37a',
          lineColor: '#d6b37a',
          tertiaryColor: '#191d24',
          fontFamily: 'Songti SC, STSong, Noto Serif CJK SC, Noto Serif SC, Source Han Serif SC, Source Han Serif CN, serif',
          fontSize: '18px',
        },
      });
    </script>`,
    '</head>',
    '<body style="margin:0;padding:0;background:#111318;">',
    '  <div class="page-content">',
    content,
    '  </div>',
    '</body>',
    '</html>',
  ].join('\n');
}
