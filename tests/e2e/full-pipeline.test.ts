import { readdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runPipeline } from '../../src/pipeline.js';
import { LAYOUT } from '../../src/types.js';
import { readPngDimensions } from '../helpers/png.js';

describe('full pipeline e2e', () => {
  it('writes sequential 1080x1440 PNGs into a timestamped output directory', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'markdown2img-e2e-'));

    try {
      const result = await runPipeline('tests/fixtures/full-article.md', baseDir);
      expect(basename(result.outputDir)).toMatch(/^\d{8}-\d{6}$/);
      expect(result.files.length).toBeGreaterThan(0);

      const dirEntries = (await readdir(result.outputDir)).filter((file) => file.endsWith('.png')).sort();
      expect(dirEntries).toEqual(result.files.map((file) => basename(file)).sort());
      expect(dirEntries[0]).toBe('001.png');
      expect(dirEntries).toEqual(dirEntries.map((_, index) => `${String(index + 1).padStart(3, '0')}.png`));

      for (const file of result.files) {
        const dimensions = await readPngDimensions(file);
        expect(dimensions).toEqual({ width: LAYOUT.PAGE_WIDTH, height: LAYOUT.PAGE_HEIGHT });
      }
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('prepends a dedicated cover page when cover_image is present', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'markdown2img-cover-'));

    try {
      const result = await runPipeline('tests/fixtures/with-images/article.md', baseDir);
      expect(result.files.map((file) => basename(file))).toEqual(['001.png', '002.png']);

      for (const file of result.files) {
        const dimensions = await readPngDimensions(file);
        expect(dimensions).toEqual({ width: LAYOUT.PAGE_WIDTH, height: LAYOUT.PAGE_HEIGHT });
      }
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  }, 60_000);
});
