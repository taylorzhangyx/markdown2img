import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { prepareOutputDir } from '../../src/lib/fs-utils.js';

describe('prepareOutputDir', () => {
  it('creates a timestamped directory in base-output mode', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'markdown2img-fs-base-'));

    try {
      const result = await prepareOutputDir({
        inputPath: 'tests/fixtures/full-article.md',
        outputBase: baseDir,
      });

      expect(result.mode).toBe('timestamped');
      expect(result.outputDir).toMatch(new RegExp(`${baseDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d{8}-\\d{6}$`));
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('writes directly into a fixed output directory when outputDir is provided', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'markdown2img-fs-fixed-'));

    try {
      const result = await prepareOutputDir({
        inputPath: 'tests/fixtures/full-article.md',
        outputDir,
      });

      expect(result.mode).toBe('fixed');
      expect(result.outputDir).toBe(outputDir);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('removes stale numbered png files when overwrite is enabled for a fixed output directory', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'markdown2img-fs-overwrite-'));

    try {
      await writeFile(join(outputDir, '001.png'), 'old');
      await writeFile(join(outputDir, '002.png'), 'old');
      await writeFile(join(outputDir, 'notes.txt'), 'keep');

      await prepareOutputDir({
        inputPath: 'tests/fixtures/full-article.md',
        outputDir,
        overwrite: true,
      });

      const entries = (await readdir(outputDir)).sort();
      expect(entries).toEqual(['notes.txt']);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
