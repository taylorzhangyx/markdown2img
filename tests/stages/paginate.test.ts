import { describe, expect, it } from 'vitest';

import { LAYOUT, type BlockMeasurement } from '../../src/types.js';
import { computePageBreaks } from '../../src/stages/paginate.js';

function buildMeasurements(items: Array<{ type: string; height: number }>): BlockMeasurement[] {
  let top = 0;

  return items.map((item, index) => {
    const measurement: BlockMeasurement = {
      index,
      type: item.type,
      top,
      height: item.height,
      canSplit: !['heading', 'image', 'mermaid', 'table'].includes(item.type),
    };
    top += item.height;
    return measurement;
  });
}

describe('computePageBreaks', () => {
  it('returns a single page with an END marker for a short article', () => {
    const measurements = buildMeasurements([
      { type: 'paragraph', height: 200 },
      { type: 'paragraph', height: 250 },
      { type: 'list', height: 300 },
    ]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(1);
    expect(plan.pages[0]).toMatchObject({
      pageIndex: 0,
      blockRange: { start: 0, end: 2 },
      clipY: 0,
      contentHeight: 750,
      bodyPageNumber: 1,
      bodyPageCount: 1,
      isFirstPage: true,
      isLastPage: true,
      hasEndMarker: true,
    });
    expect(plan.totalContentHeight).toBe(750);
  });

  it('creates multiple pages and advances clipY to the first block on each page', () => {
    const measurements = buildMeasurements(
      Array.from({ length: 20 }, () => ({ type: 'paragraph', height: 180 })),
    );

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(3);
    expect(plan.pages.map((page) => page.blockRange)).toEqual([
      { start: 0, end: 7 },
      { start: 8, end: 16 },
      { start: 17, end: 19 },
    ]);
    expect(plan.pages.map((page) => page.bodyPageNumber)).toEqual([1, 2, 3]);
    expect(plan.pages.map((page) => page.bodyPageCount)).toEqual([3, 3, 3]);
    expect(plan.pages.map((page) => page.clipY)).toEqual([0, 1360, 2980]);
    expect(plan.pages.at(-1)).toMatchObject({
      bodyPageNumber: 3,
      bodyPageCount: 3,
      isLastPage: true,
      hasEndMarker: true,
      contentHeight: 540,
    });
  });

  it('moves an orphan heading to the next page', () => {
    const measurements = buildMeasurements([
      { type: 'paragraph', height: 1150 },
      { type: 'heading', height: 200 },
      { type: 'paragraph', height: 200 },
    ]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0]).toMatchObject({
      blockRange: { start: 0, end: 0 },
      contentHeight: 1150,
      bodyPageNumber: 1,
      bodyPageCount: 2,
      hasEndMarker: false,
    });
    expect(plan.pages[1]).toMatchObject({
      blockRange: { start: 1, end: 2 },
      clipY: 1070,
      bodyPageNumber: 2,
      bodyPageCount: 2,
      isLastPage: true,
      hasEndMarker: true,
    });
  });

  it('lets a single oversized block occupy its own page', () => {
    const oversizedHeight = LAYOUT.USABLE_HEIGHT + 200;
    const measurements = buildMeasurements([{ type: 'image', height: oversizedHeight }]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages[0]).toMatchObject({
      blockRange: { start: 0, end: 0 },
      clipY: 0,
      contentHeight: oversizedHeight,
      bodyPageNumber: 1,
      bodyPageCount: 2,
    });
    expect(plan.pages.at(-1)).toMatchObject({
      bodyPageNumber: 2,
      bodyPageCount: 2,
      isLastPage: true,
      hasEndMarker: true,
    });
  });

  it('creates a dedicated END-marker page when the final page has no room left', () => {
    const measurements = buildMeasurements([{ type: 'paragraph', height: 1450 }]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0]).toMatchObject({
      blockRange: { start: 0, end: 0 },
      bodyPageNumber: 1,
      bodyPageCount: 2,
      isLastPage: false,
      hasEndMarker: false,
    });
    expect(plan.pages[1]).toMatchObject({
      blockRange: { start: -1, end: -1 },
      clipY: 1450,
      contentHeight: 0,
      bodyPageNumber: 2,
      bodyPageCount: 2,
      isLastPage: true,
      hasEndMarker: true,
    });
  });

  it('returns no pages for empty input', () => {
    const plan = computePageBreaks([]);

    expect(plan).toEqual({
      pages: [],
      totalContentHeight: 0,
    });
  });
});
