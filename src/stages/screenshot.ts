import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from 'playwright';

import { Markdown2ImgError } from '../lib/error.js';
import { avatarToBase64, toBase64DataUri } from '../lib/image-handler.js';
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

      const pageBackground = getComputedStyle(document.body).backgroundColor || '#111318';
      const makeMask = (style: string): HTMLDivElement => {
        const mask = document.createElement('div');
        mask.style.cssText = style;
        return mask;
      };

      const topContentInset = spec.isFirstPage
        ? layout.pagePadding + layout.firstPageIdentityReserve
        : layout.pagePadding;
      const bottomMaskTop = Math.max(Math.min(spec.contentBottom, layout.pageHeight), 0);

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
          'color:#f2ede4',
        ].join(';');

        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:18px;min-width:0;';

        if (overlayMeta.avatarDataUri) {
          const avatar = document.createElement('img');
          avatar.src = overlayMeta.avatarDataUri;
          avatar.alt = '';
          avatar.style.cssText =
            'width:64px;height:64px;border-radius:999px;object-fit:cover;flex:0 0 auto;background:#1d222a;border:1px solid rgba(214,179,122,0.18);box-shadow:0 8px 24px rgba(0,0,0,0.24);';
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
          'color:#f2ede4',
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
            'color:#b6afa3',
            'white-space:nowrap',
          ].join(';');
          text.appendChild(date);
        }

        leftGroup.appendChild(text);
        identity.appendChild(leftGroup);

        const rule = document.createElement('div');
        rule.style.cssText = 'flex:1 1 auto;height:1px;max-width:320px;background:linear-gradient(90deg, rgba(214,179,122,0.28), rgba(214,179,122,0.04));';
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
          'color:#b6afa3',
          'font-size:32px',
          'letter-spacing:4px',
        ].join(';');

        const leftLine = document.createElement('div');
        leftLine.style.cssText = 'width:120px;height:1px;background:rgba(214,179,122,0.22);';
        const rightLine = document.createElement('div');
        rightLine.style.cssText = 'width:120px;height:1px;background:rgba(214,179,122,0.22);';
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
  if (!meta.cover_image) {
    throw new Markdown2ImgError('layout_render_error', 'Cannot render cover page without cover_image metadata');
  }

  await mkdir(outputDir, { recursive: true });

  const coverImageDataUri = toBase64DataUri(meta.cover_image);
  const avatarDataUri = meta.avatar_path ? avatarToBase64(meta.avatar_path) : undefined;

  const coverHtml = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <style>',
    '    :root { color-scheme: dark; }',
    '    html, body { margin: 0; padding: 0; width: 1080px; height: 1440px; overflow: hidden; background: #111318; }',
    '    body { font-family: "Songti SC", "STSong", "Noto Serif CJK SC", "Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN", serif; color: #f2ede4; }',
    '    .cover { position: relative; width: 1080px; height: 1440px; padding: 92px 72px 88px; background: radial-gradient(circle at top center, rgba(214, 179, 122, 0.08), transparent 34%), linear-gradient(180deg, #161a22 0%, #101318 100%); }',
    '    .cover::before { content: ""; position: absolute; inset: 36px; border: 1px solid rgba(214, 179, 122, 0.12); border-radius: 40px; pointer-events: none; }',
    '    .eyebrow { position: relative; z-index: 1; display: flex; align-items: center; gap: 18px; color: #b6afa3; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; }',
    '    .eyebrow::after { content: ""; flex: 1 1 auto; height: 1px; background: linear-gradient(90deg, rgba(214, 179, 122, 0.28), rgba(214, 179, 122, 0.04)); }',
    '    .hero { position: relative; z-index: 1; margin-top: 44px; display: flex; flex-direction: column; gap: 40px; }',
    '    .cover-card { position: relative; width: 100%; height: 420px; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, #232933 0%, #151920 100%); border: 1px solid rgba(214, 179, 122, 0.12); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 26px 60px rgba(0,0,0,0.28); }',
    '    .cover-card img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(0.82) contrast(0.92) brightness(0.72); }',
    '    .cover-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17,19,24,0.12) 0%, rgba(17,19,24,0.48) 100%); }',
    '    .title { margin: 0; font-size: 74px; line-height: 1.18; font-weight: 600; letter-spacing: -0.01em; color: #f2ede4; }',
    '    .meta { display: flex; align-items: center; gap: 18px; margin-top: 20px; }',
    '    .avatar { width: 64px; height: 64px; border-radius: 999px; object-fit: cover; background: #1d222a; border: 1px solid rgba(214, 179, 122, 0.18); box-shadow: 0 8px 24px rgba(0,0,0,0.24); }',
    '    .author-wrap { display: flex; flex-direction: column; gap: 6px; min-width: 0; }',
    '    .author { font-size: 28px; line-height: 1.2; font-weight: 600; color: #f2ede4; }',
    '    .date { font-size: 20px; line-height: 1.2; letter-spacing: 0.04em; color: #b6afa3; }',
    '    .dek { margin: 28px 0 0; font-size: 24px; line-height: 1.8; color: #cec5b6; max-width: 860px; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="cover">',
    '    <div class="eyebrow">Memory / AI Agent Design</div>',
    '    <div class="hero">',
    '      <div class="cover-card">',
    `        <img src="${escapeHtml(coverImageDataUri)}" alt="">`,
    '      </div>',
    `      <h1 class="title">${escapeHtml(meta.title.trim() || 'Untitled Article')}</h1>`,
    '      <div class="meta">',
    avatarDataUri
      ? `        <img class="avatar" src="${escapeHtml(avatarDataUri)}" alt="">`
      : '        <div class="avatar"></div>',
    '        <div class="author-wrap">',
    `          <div class="author">${escapeHtml(meta.author_name)}</div>`,
    meta.date ? `          <div class="date">${escapeHtml(meta.date)}</div>` : '          <div class="date"></div>',
    '        </div>',
    '      </div>',
    '      <p class="dek">A warm editorial cover designed for long-form markdown rendering tests, prioritizing readable hierarchy, restrained serif typography, and social-post-friendly composition.</p>',
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
