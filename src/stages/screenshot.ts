import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from 'playwright';

import { Markdown2ImgError } from '../lib/error.js';
import { avatarToBase64, toFileUrl } from '../lib/image-handler.js';
import { LAYOUT, type ArticleMeta, type PageBreakPlan, type PageSpec } from '../types.js';

interface OverlayMetaPayload {
  authorName: string;
  date?: string;
  avatarDataUri?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getPageFileName(pageNumber: number): string {
  return `${String(pageNumber).padStart(3, '0')}.png`;
}

async function ensureScreenshotSurface(page: Page, plan: PageBreakPlan): Promise<void> {
  const requiredHeight = Math.max(
    LAYOUT.PAGE_HEIGHT,
    ...plan.pages.map((pageSpec) => Math.ceil(pageSpec.clipY + LAYOUT.PAGE_HEIGHT)),
  );

  await page.evaluate((height) => {
    const exactHeight = `${height}px`;
    document.documentElement.style.height = exactHeight;
    document.documentElement.style.minHeight = exactHeight;
    document.body.style.height = exactHeight;
    document.body.style.minHeight = exactHeight;
    document.body.style.position = 'relative';

    let spacer = document.getElementById('page-screenshot-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.id = 'page-screenshot-spacer';
      document.body.appendChild(spacer);
    }

    spacer.setAttribute(
      'style',
      `position:absolute;left:0;top:${Math.max(height - 1, 0)}px;width:1px;height:1px;pointer-events:none;opacity:0;`,
    );
  }, requiredHeight);
}

async function clearOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById('page-overlay')?.remove();
  });
}

async function injectOverlay(page: Page, pageSpec: PageSpec, meta: OverlayMetaPayload): Promise<void> {
  await clearOverlay(page);
  await page.evaluate(
    ({ spec, overlayMeta, layout }) => {
      const overlay = document.createElement('div');
      overlay.id = 'page-overlay';
      overlay.style.cssText = [
        'position:absolute',
        'left:0',
        `top:${spec.clipY}px`,
        `width:${layout.pageWidth}px`,
        `height:${layout.pageHeight}px`,
        'pointer-events:none',
        'z-index:9999',
      ].join(';');

      const makeMask = (style: string): HTMLDivElement => {
        const mask = document.createElement('div');
        mask.style.cssText = style;
        return mask;
      };

      overlay.appendChild(
        makeMask(
          `position:absolute;top:0;left:0;width:${layout.pageWidth}px;height:${layout.pagePadding}px;background:#fff;`,
        ),
      );
      overlay.appendChild(
        makeMask(
          `position:absolute;bottom:0;left:0;width:${layout.pageWidth}px;height:${layout.pagePadding}px;background:#fff;`,
        ),
      );

      if (spec.isFirstPage) {
        const identity = document.createElement('div');
        identity.style.cssText = [
          'position:absolute',
          `top:${layout.pagePadding}px`,
          `left:${layout.pagePadding}px`,
          'display:flex',
          'align-items:center',
          'gap:20px',
          'height:80px',
          'max-width:920px',
          'color:#1A1A1A',
        ].join(';');

        if (overlayMeta.avatarDataUri) {
          const avatar = document.createElement('img');
          avatar.src = overlayMeta.avatarDataUri;
          avatar.alt = '';
          avatar.style.cssText =
            'width:80px;height:80px;border-radius:999px;object-fit:cover;flex:0 0 auto;background:#f2f2f2;';
          identity.appendChild(avatar);
        }

        const text = document.createElement('div');
        text.style.cssText = 'display:flex;align-items:baseline;gap:16px;min-width:0;';

        const author = document.createElement('span');
        author.textContent = overlayMeta.authorName;
        author.style.cssText =
          'font-size:36px;font-weight:600;color:#1A1A1A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        text.appendChild(author);

        if (overlayMeta.date) {
          const date = document.createElement('span');
          date.textContent = overlayMeta.date;
          date.style.cssText = 'font-size:30px;color:#666;white-space:nowrap;';
          text.appendChild(date);
        }

        identity.appendChild(text);
        overlay.appendChild(identity);
      }

      if (spec.hasEndMarker) {
        const endMarker = document.createElement('div');
        endMarker.style.cssText = [
          'position:absolute',
          'left:0',
          'right:0',
          'bottom:120px',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'gap:24px',
          'color:#666',
          'font-size:32px',
          'letter-spacing:4px',
        ].join(';');

        const leftLine = document.createElement('div');
        leftLine.style.cssText = 'width:120px;height:1px;background:#E5E7EB;';
        const rightLine = document.createElement('div');
        rightLine.style.cssText = 'width:120px;height:1px;background:#E5E7EB;';
        const text = document.createElement('span');
        text.textContent = 'END';

        endMarker.append(leftLine, text, rightLine);
        overlay.appendChild(endMarker);
      }

      document.body.appendChild(overlay);
    },
    {
      spec: pageSpec,
      overlayMeta: meta,
      layout: {
        pageWidth: LAYOUT.PAGE_WIDTH,
        pageHeight: LAYOUT.PAGE_HEIGHT,
        pagePadding: LAYOUT.PAGE_PADDING,
      },
    },
  );
}

async function scrollToPage(page: Page, clipY: number): Promise<void> {
  await page.evaluate((top) => {
    window.scrollTo(0, top);
  }, clipY);
}

export async function screenshotPages(
  page: Page,
  plan: PageBreakPlan,
  meta: ArticleMeta,
  outputDir: string,
  pageOffset = 0,
): Promise<string[]> {
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    throw new Markdown2ImgError(
      'layout_render_error',
      'Unable to create output directory for screenshots',
      error instanceof Error ? error.message : String(error),
    );
  }

  const overlayMeta: OverlayMetaPayload = {
    authorName: meta.author_name,
    ...(meta.date ? { date: meta.date } : {}),
    ...(meta.avatar_path ? { avatarDataUri: avatarToBase64(meta.avatar_path) } : {}),
  };

  try {
    await ensureScreenshotSurface(page, plan);
  } catch (error) {
    throw new Markdown2ImgError(
      'layout_render_error',
      'Unable to prepare screenshot surface',
      error instanceof Error ? error.message : String(error),
    );
  }

  const files: string[] = [];
  for (const pageSpec of plan.pages) {
    const pageNumber = pageSpec.pageIndex + pageOffset + 1;
    const filePath = join(outputDir, getPageFileName(pageNumber));

    try {
      await scrollToPage(page, pageSpec.clipY);
      await injectOverlay(page, pageSpec, overlayMeta);
      await page.screenshot({
        path: filePath,
        clip: {
          x: 0,
          y: 0,
          width: LAYOUT.PAGE_WIDTH,
          height: LAYOUT.PAGE_HEIGHT,
        },
        type: 'png',
      });
      files.push(filePath);
    } catch (error) {
      throw new Markdown2ImgError(
        'layout_render_error',
        `Failed to capture page ${pageNumber}`,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      await clearOverlay(page).catch(() => {});
    }
  }

  return files;
}

export async function renderCoverPage(page: Page, meta: ArticleMeta, outputDir: string, pageNumber = 1): Promise<string> {
  if (!meta.cover_image) {
    throw new Markdown2ImgError('layout_render_error', 'Cannot render cover page without cover_image metadata');
  }

  await mkdir(outputDir, { recursive: true });

  const coverHtml = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <style>',
    '    html, body { margin: 0; padding: 0; width: 1080px; height: 1440px; overflow: hidden; background: #000; }',
    '    body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", -apple-system, sans-serif; }',
    '    .cover { position: relative; width: 1080px; height: 1440px; }',
    '    .cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }',
    '    .cover::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%); }',
    '    .content { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 96px 80px; color: #fff; }',
    '    .title { font-size: 76px; line-height: 1.18; font-weight: 700; margin: 0 0 28px; text-shadow: 0 4px 18px rgba(0,0,0,0.28); }',
    '    .author { font-size: 36px; opacity: 0.92; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="cover">',
    `    <img src="${escapeHtml(toFileUrl(meta.cover_image))}" alt="">`,
    '    <div class="content">',
    `      <h1 class="title">${escapeHtml(meta.title.trim() || 'Untitled Article')}</h1>`,
    `      <div class="author">${escapeHtml(meta.author_name)}</div>`,
    '    </div>',
    '  </div>',
    '</body>',
    '</html>',
  ].join('\n');

  const filePath = join(outputDir, getPageFileName(pageNumber));

  try {
    await page.setContent(coverHtml, { waitUntil: 'load' });
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), undefined, {
      timeout: 15_000,
    });
    await page.screenshot({ path: filePath, clip: { x: 0, y: 0, width: LAYOUT.PAGE_WIDTH, height: LAYOUT.PAGE_HEIGHT }, type: 'png' });
  } catch (error) {
    throw new Markdown2ImgError(
      'layout_render_error',
      'Failed to render cover page',
      error instanceof Error ? error.message : String(error),
    );
  }

  return filePath;
}
