import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from 'playwright';

import { Markdown2ImgError } from '../lib/error.js';
import { avatarToBase64 } from '../lib/image-handler.js';
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

      const bodyStyle = getComputedStyle(document.body);
      const pageBackground = bodyStyle.background || bodyStyle.backgroundColor || '#F5F2EC';
      const maskOverscan = 6;
      const makeMask = (style: string): HTMLDivElement => {
        const mask = document.createElement('div');
        mask.style.cssText = style;
        return mask;
      };

      const topContentInset = spec.isFirstPage
        ? layout.pagePadding + layout.firstPageIdentityReserve
        : layout.pagePadding;
      const bottomMaskTop = Math.max(Math.min(Math.floor(spec.contentBottom - maskOverscan), layout.pageHeight), 0);

      overlay.appendChild(
        makeMask(
          `position:absolute;top:0;left:0;width:${layout.pageWidth}px;height:${topContentInset}px;background:${pageBackground};`,
        ),
      );
      overlay.appendChild(
        makeMask(
          `position:absolute;top:${bottomMaskTop}px;left:0;width:${layout.pageWidth}px;height:${Math.max(layout.pageHeight - bottomMaskTop, 0)}px;background:${pageBackground};`,
        ),
      );

      if (spec.isFirstPage) {
        const identity = document.createElement('div');
        identity.style.cssText = [
          'position:absolute',
          `top:${layout.pagePadding}px`,
          `left:${layout.pagePadding}px`,
          `right:${layout.pagePadding}px`,
          'display:flex',
          'align-items:center',
          'justify-content:space-between',
          'gap:24px',
          'height:88px',
          'max-width:936px',
          'color:#1F2328',
        ].join(';');

        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:18px;min-width:0;';

        if (overlayMeta.avatarDataUri) {
          const avatar = document.createElement('img');
          avatar.src = overlayMeta.avatarDataUri;
          avatar.alt = '';
          avatar.style.cssText =
            'width:64px;height:64px;border-radius:999px;object-fit:cover;flex:0 0 auto;background:#F1ECE4;border:1px solid rgba(95,86,76,0.12);box-shadow:none;';
          leftGroup.appendChild(avatar);
        }

        const text = document.createElement('div');
        text.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0;';

        const author = document.createElement('span');
        author.textContent = overlayMeta.authorName;
        author.style.cssText = [
          'font-family:Songti SC, STSong, Noto Serif CJK SC, Noto Serif SC, Source Han Serif SC, Source Han Serif CN, serif',
          'font-size:28px',
          'font-weight:600',
          'line-height:1.2',
          'color:#1F2328',
          'white-space:nowrap',
          'overflow:hidden',
          'text-overflow:ellipsis',
        ].join(';');
        text.appendChild(author);

        if (overlayMeta.date) {
          const date = document.createElement('span');
          date.textContent = overlayMeta.date;
          date.style.cssText = [
            'font-family:Songti SC, STSong, Noto Serif CJK SC, Noto Serif SC, Source Han Serif SC, Source Han Serif CN, serif',
            'font-size:20px',
            'line-height:1.2',
            'letter-spacing:0.04em',
            'color:#6E6A64',
            'white-space:nowrap',
          ].join(';');
          text.appendChild(date);
        }

        leftGroup.appendChild(text);
        identity.appendChild(leftGroup);

        const rule = document.createElement('div');
        rule.style.cssText = 'flex:1 1 auto;height:1px;max-width:320px;background:linear-gradient(90deg, rgba(95,86,76,0.18), rgba(95,86,76,0.02));';
        identity.appendChild(rule);

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
          'color:#6E6A64',
          'font-size:32px',
          'letter-spacing:4px',
        ].join(';');

        const leftLine = document.createElement('div');
        leftLine.style.cssText = 'width:120px;height:1px;background:rgba(95,86,76,0.16);';
        const rightLine = document.createElement('div');
        rightLine.style.cssText = 'width:120px;height:1px;background:rgba(95,86,76,0.16);';
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
        firstPageIdentityReserve: LAYOUT.FIRST_PAGE_IDENTITY,
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
  await mkdir(outputDir, { recursive: true });

  const avatarDataUri = meta.avatar_path ? avatarToBase64(meta.avatar_path) : undefined;
  const summary = meta.cover_summary?.trim() || meta.title.trim() || 'Untitled Article';

  const coverHtml = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <style>',
    '    :root { color-scheme: light; }',
    `    html, body { margin: 0; padding: 0; width: ${LAYOUT.PAGE_WIDTH}px; height: ${LAYOUT.PAGE_HEIGHT}px; overflow: hidden; background: #F5F2EC; }`,
    '    body { font-family: "Songti SC", "STSong", "Noto Serif CJK SC", "Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN", serif; color: #1F2328; }',
    '    * { box-sizing: border-box; }',
    `    .cover { position: relative; width: ${LAYOUT.PAGE_WIDTH}px; height: ${LAYOUT.PAGE_HEIGHT}px; padding: 84px 76px 88px; background: linear-gradient(180deg, #F7F4EF 0%, #F4F1EA 100%); }`,
    '    .cover::before { content: ""; position: absolute; inset: 34px; border: 1px solid rgba(95, 86, 76, 0.12); border-radius: 32px; pointer-events: none; }',
    '    .content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }',
    '    .summary-stage { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; padding: 0 0 76px; }',
    '    .summary-frame { position: relative; width: min(904px, calc(100% - 8px)); max-height: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }',
    '    .summary { --summary-font-size: 50px; position: relative; margin: 0; width: 100%; padding-left: 42px; color: #4C3E2F; font-family: "Iowan Old Style", "Source Han Serif CN SemiBold", "Source Han Serif CN", "Source Han Serif SC", "Songti SC", "STSong", "Noto Serif CJK SC", serif; font-size: var(--summary-font-size); font-weight: 600; line-height: 1.54; letter-spacing: 0; text-align: justify; text-justify: inter-ideograph; }',
    '    .summary::before { content: "“"; position: absolute; left: -14px; top: -30px; color: rgba(184, 132, 71, 0.9); font-size: clamp(78px, calc(var(--summary-font-size) * 1.9), 118px); line-height: 0.8; }',
    '    .identity { position: absolute; left: 0; bottom: 0; display: flex; align-items: center; gap: 16px; color: #5C4C3C; }',
    '    .avatar { width: 60px; height: 60px; border-radius: 999px; object-fit: cover; background: #ECE5DA; border: 1px solid rgba(95, 86, 76, 0.12); }',
    '    .identity-copy { display: flex; flex-direction: column; gap: 4px; min-width: 0; }',
    '    .author { font-size: 24px; line-height: 1.2; font-weight: 600; color: #584633; }',
    '    .date { font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif; font-size: 18px; line-height: 1.2; color: #90725A; letter-spacing: 0.03em; }',
    '  </style>',
    '  <script>',
    '    function fitSummary() {',
    '      const frame = document.querySelector(".summary-frame");',
    '      const summary = document.querySelector(".summary");',
    '      if (!(frame instanceof HTMLElement) || !(summary instanceof HTMLElement)) return;',
    '      const minSize = 28;',
    '      const maxSize = 64;',
    '      let low = minSize;',
    '      let high = maxSize;',
    '      let best = minSize;',
    '      while (low <= high) {',
    '        const mid = Math.floor((low + high) / 2);',
    '        summary.style.setProperty("--summary-font-size", `${mid}px`);',
    '        const fits = summary.scrollHeight <= frame.clientHeight && summary.scrollWidth <= frame.clientWidth;',
    '        if (fits) {',
    '          best = mid;',
    '          low = mid + 1;',
    '        } else {',
    '          high = mid - 1;',
    '        }',
    '      }',
    '      summary.style.setProperty("--summary-font-size", `${best}px`);',
    '      document.body.dataset.coverReady = "true";',
    '    }',
    '    window.addEventListener("load", fitSummary);',
    '  </script>',
    '</head>',
    '<body>',
    '  <div class="cover">',
    '    <div class="content">',
    '      <div class="summary-stage">',
    '        <div class="summary-frame">',
    `          <div class="summary">${escapeHtml(summary)}</div>`,
    '        </div>',
    '      </div>',
    '      <div class="identity">',
    (avatarDataUri ? `        <img class="avatar" src="${escapeHtml(avatarDataUri)}" alt="">` : '        <div class="avatar"></div>'),
    '        <div class="identity-copy">',
    `          <div class="author">${escapeHtml(meta.author_name)}</div>`,
    (meta.date ? `          <div class="date">${escapeHtml(meta.date)}</div>` : '          <div class="date"></div>'),
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>',
  ].join('\n');

  const filePath = join(outputDir, getPageFileName(pageNumber));

  try {
    await page.setContent(coverHtml, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body?.dataset.coverReady === 'true', undefined, { timeout: 15_000 });
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
