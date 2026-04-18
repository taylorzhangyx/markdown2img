import type { Page } from 'playwright';

import { LAYOUT, type BlockMeasurement, type PageBreakPlan, type PageSpec } from '../types.js';

const NON_SPLITTABLE_TYPES = new Set(['heading', 'image', 'mermaid', 'table']);

export async function measureBlocks(page: Page): Promise<BlockMeasurement[]> {
  return page.evaluate(() => {
    const contentElement = document.querySelector('.page-content');
    if (!contentElement) {
      return [];
    }

    const contentTop = contentElement.getBoundingClientRect().top;

    return Array.from(document.querySelectorAll<HTMLElement>('.block')).map((block) => {
      const rect = block.getBoundingClientRect();
      const style = window.getComputedStyle(block);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      const type = block.dataset.blockType ?? block.className.replace('block block-', '');

      return {
        index: Number.parseInt(block.dataset.blockIndex ?? '0', 10),
        type,
        top: rect.top - contentTop,
        height: rect.height + marginTop + marginBottom,
        canSplit: !['heading', 'image', 'mermaid', 'table'].includes(type),
      };
    });
  });
}

export function computePageBreaks(measurements: readonly BlockMeasurement[]): PageBreakPlan {
  if (measurements.length === 0) {
    return {
      pages: [],
      totalContentHeight: 0,
    };
  }

  const pages: PageSpec[] = [];
  let pageUsable: number = LAYOUT.FIRST_PAGE_USABLE;
  let currentBlocks: BlockMeasurement[] = [];
  let currentUsed = 0;
  let pageIndex = 0;

  const resetForNextPage = (): void => {
    currentBlocks = [];
    currentUsed = 0;
    pageUsable = LAYOUT.USABLE_HEIGHT;
  };

  const saveCurrentPage = (options: { isLastPage: boolean; hasEndMarker: boolean }): void => {
    if (currentBlocks.length === 0) {
      return;
    }

    const isFirstPage = pageIndex === 0;
    const topPaddingReserve = isFirstPage
      ? LAYOUT.PAGE_PADDING + LAYOUT.FIRST_PAGE_IDENTITY
      : LAYOUT.PAGE_PADDING;

    const firstBlock = currentBlocks[0]!;
    const lastBlock = currentBlocks[currentBlocks.length - 1]!;
    const clipY = Math.max(firstBlock.top - topPaddingReserve, 0);
    const contentBottom = Math.max(lastBlock.top + lastBlock.height - clipY, topPaddingReserve);

    pages.push({
      pageIndex,
      blockRange: {
        start: firstBlock.index,
        end: lastBlock.index,
      },
      clipY,
      contentHeight: currentUsed,
      contentBottom,
      isFirstPage,
      isLastPage: options.isLastPage,
      hasEndMarker: options.hasEndMarker,
    });
    pageIndex += 1;
  };

  let cursor = 0;
  while (cursor < measurements.length) {
    const block = measurements[cursor]!;

    if (currentUsed + block.height <= pageUsable || currentBlocks.length === 0) {
      currentBlocks.push(block);
      currentUsed += block.height;
      cursor += 1;
      continue;
    }

    const lastBlock = currentBlocks[currentBlocks.length - 1];
    if (lastBlock?.type === 'heading' && currentBlocks.length > 1) {
      currentBlocks.pop();
      currentUsed -= lastBlock.height;
      saveCurrentPage({ isLastPage: false, hasEndMarker: false });
      resetForNextPage();
      currentBlocks.push(lastBlock);
      currentUsed = lastBlock.height;
      continue;
    }

    saveCurrentPage({ isLastPage: false, hasEndMarker: false });
    resetForNextPage();
  }

  if (currentBlocks.length > 0) {
    if (currentUsed + LAYOUT.END_MARKER_HEIGHT <= pageUsable) {
      saveCurrentPage({ isLastPage: true, hasEndMarker: true });
    } else {
      saveCurrentPage({ isLastPage: false, hasEndMarker: false });
      pages.push({
        pageIndex,
        blockRange: { start: -1, end: -1 },
        clipY: currentBlocks[currentBlocks.length - 1]!.top + currentBlocks[currentBlocks.length - 1]!.height,
        contentHeight: 0,
        contentBottom: LAYOUT.PAGE_PADDING,
        isFirstPage: false,
        isLastPage: true,
        hasEndMarker: true,
      });
    }
  }

  const lastMeasurement = measurements[measurements.length - 1]!;
  return {
    pages,
    totalContentHeight: lastMeasurement.top + lastMeasurement.height,
  };
}

export { NON_SPLITTABLE_TYPES };
