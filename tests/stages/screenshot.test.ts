import { describe, expect, it } from 'vitest';

import { LAYOUT } from '../../src/types.js';
import { computeEndMarkerTop, getBodyFolioLabel } from '../../src/stages/screenshot.js';

describe('screenshot overlay helpers', () => {
  it('returns the body page number as a quiet folio label', () => {
    expect(getBodyFolioLabel(1)).toBe('1');
    expect(getBodyFolioLabel(12)).toBe('12');
  });

  it('positions END at a fixed offset after content when there is room', () => {
    expect(
      computeEndMarkerTop({
        contentBottom: 980,
        topInset: LAYOUT.PAGE_PADDING,
        pageHeight: LAYOUT.PAGE_HEIGHT,
        endMarkerOffset: 72,
        maxEndMarkerBlockHeight: 220,
      }),
    ).toBe(1052);
  });

  it('clamps END so it never falls below the safe lower bound', () => {
    expect(
      computeEndMarkerTop({
        contentBottom: 1700,
        topInset: LAYOUT.PAGE_PADDING,
        pageHeight: LAYOUT.PAGE_HEIGHT,
        endMarkerOffset: 72,
        maxEndMarkerBlockHeight: 220,
      }),
    ).toBe(1580);
  });

  it('clamps END to the top inset when content is extremely shallow', () => {
    expect(
      computeEndMarkerTop({
        contentBottom: 0,
        topInset: 220,
        pageHeight: LAYOUT.PAGE_HEIGHT,
        endMarkerOffset: 72,
        maxEndMarkerBlockHeight: 220,
      }),
    ).toBe(220);
  });
});
