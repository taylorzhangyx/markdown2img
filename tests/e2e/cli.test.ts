import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

import { beforeAll, describe, expect, it } from 'vitest';

import { readPngDimensions } from '../helpers/png.js';

const execFileAsync = promisify(execFile);
const REPO_DIR = '/Users/taylorzyx/workspace/github-taylorzhangyx/markdown2img';

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('node', ['dist/cli.js', ...args], { cwd: REPO_DIR, env: process.env, maxBuffer: 10 * 1024 * 1024 });
}

describe('built CLI', () => {
  beforeAll(async () => {
    await execFileAsync('npm', ['run', 'build'], { cwd: REPO_DIR, env: process.env, maxBuffer: 10 * 1024 * 1024 });
  }, 120_000);

  it('renders the fixture article through node dist/cli.js', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'markdown2img-cli-'));

    try {
      const { stdout, stderr } = await runCli(['tests/fixtures/full-article.md', '-o', baseDir]);
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Parsed: full-article.md');
      expect(stdout).toContain('✓ Output:');

      const outputDirLine = stdout.split('\n').find((line) => line.startsWith('✓ Output: '));
      const outputDir = outputDirLine?.replace('✓ Output: ', '').trim();
      expect(outputDir).toBeTruthy();
      expect(basename(outputDir!)).toMatch(/^\d{8}-\d{6}$/);

      const pngs = (await readdir(outputDir!)).filter((file) => file.endsWith('.png')).sort();
      expect(pngs.length).toBeGreaterThan(0);
      expect(await readPngDimensions(join(outputDir!, pngs[0]!))).toEqual({ width: 1080, height: 1440 });
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('prints parse_error and exits non-zero for a missing file', async () => {
    await expect(runCli(['nonexistent.md'])).rejects.toMatchObject({
      code: expect.any(Number),
      stderr: expect.stringContaining('[ERROR] parse_error:'),
    });
  });

  it('prints validation_error and exits non-zero for invalid frontmatter', async () => {
    await expect(runCli(['tests/fixtures/missing-author.md'])).rejects.toMatchObject({
      code: expect.any(Number),
      stderr: expect.stringContaining('[ERROR] validation_error:'),
    });
  });
});
