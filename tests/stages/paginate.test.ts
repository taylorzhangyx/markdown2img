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

    expect(plan.pages).toHaveLength(4);
    expect(plan.pages.map((page) => page.blockRange)).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 12 },
      { start: 13, end: 19 },
      { start: -1, end: -1 },
    ]);
    expect(plan.pages.map((page) => page.clipY)).toEqual([0, 1080, 2340, 3600]);
    expect(plan.pages.at(-1)).toMatchObject({
      isLastPage: true,
      hasEndMarker: true,
      contentHeight: 0,
    });
  });

  it('moves an orphan heading to the next page', () => {
    const measurements = buildMeasurements([
      { type: 'paragraph', height: 900 },
      { type: 'heading', height: 200 },
      { type: 'paragraph', height: 200 },
    ]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0]).toMatchObject({
      blockRange: { start: 0, end: 0 },
      contentHeight: 900,
      hasEndMarker: false,
    });
    expect(plan.pages[1]).toMatchObject({
      blockRange: { start: 1, end: 2 },
      clipY: 900,
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
    });
    expect(plan.pages.at(-1)).toMatchObject({
      isLastPage: true,
      hasEndMarker: true,
    });
  });

  it('creates a dedicated END-marker page when the final page has no room left', () => {
    const measurements = buildMeasurements([{ type: 'paragraph', height: 1100 }]);

    const plan = computePageBreaks(measurements);

    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0]).toMatchObject({
      blockRange: { start: 0, end: 0 },
      isLastPage: false,
      hasEndMarker: false,
    });
    expect(plan.pages[1]).toMatchObject({
      blockRange: { start: -1, end: -1 },
      clipY: 1100,
      contentHeight: 0,
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
