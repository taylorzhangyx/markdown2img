import { readFile, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runPipeline } from '../../src/pipeline.js';

describe('pipeline determinism', () => {
  it('produces byte-identical PNGs across two runs of the same article', async () => {
    const baseDirA = await mkdtemp(join(tmpdir(), 'markdown2img-determinism-a-'));
    const baseDirB = await mkdtemp(join(tmpdir(), 'markdown2img-determinism-b-'));

    try {
      const resultA = await runPipeline('tests/fixtures/full-article.md', baseDirA);
      const resultB = await runPipeline('tests/fixtures/full-article.md', baseDirB);

      expect(resultA.files.map((file) => basename(file))).toEqual(resultB.files.map((file) => basename(file)));

      for (let index = 0; index < resultA.files.length; index += 1) {
        const [bufferA, bufferB] = await Promise.all([readFile(resultA.files[index]!), readFile(resultB.files[index]!)]);
        expect(bufferA.equals(bufferB)).toBe(true);
      }
    } finally {
      await rm(baseDirA, { recursive: true, force: true });
      await rm(baseDirB, { recursive: true, force: true });
    }
  }, 120_000);
});
