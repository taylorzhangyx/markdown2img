import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { beforeAll, describe, expect, it } from 'vitest';

import { LAYOUT } from '../../src/types.js';
import { readPngDimensions } from '../helpers/png.js';

const execFileAsync = promisify(execFile);
const REPO_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
      expect(await readPngDimensions(join(outputDir!, pngs[0]!))).toEqual({ width: LAYOUT.PAGE_WIDTH, height: LAYOUT.PAGE_HEIGHT });
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

  it('fills in the default author profile when author_name is missing', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'markdown2img-cli-default-author-'));

    try {
      const { stdout, stderr } = await runCli(['tests/fixtures/missing-author.md', '-o', baseDir]);
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Parsed: missing-author.md');
      expect(stdout).toContain('✓ Validated: author_name=AI工程Tay');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('prints JSON output and writes directly into a fixed output directory', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'markdown2img-cli-json-fixed-'));

    try {
      const { stdout, stderr } = await runCli([
        'tests/fixtures/basic-article.md',
        '--output-dir',
        outputDir,
        '--overwrite',
        '--json',
      ]);

      const payload = JSON.parse(stdout);
      expect(payload.outputMode).toBe('fixed');
      expect(payload.outputDir).toBe(outputDir);
      expect(payload.renderedCover).toBe(true);
      expect(payload.renderedBody).toBe(true);
      expect(payload.files.map((file: string) => basename(file))).toEqual(['001.png', '002.png']);
      expect(stderr).toContain('✓ Parsed: basic-article.md');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('lets CLI metadata overrides replace author and cover summary for rendering', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'markdown2img-cli-overrides-'));

    try {
      const { stdout, stderr } = await runCli([
        'tests/fixtures/basic-article.md',
        '--output-dir',
        outputDir,
        '--overwrite',
        '--author-name',
        'Override Author',
        '--cover-summary',
        'Override summary',
      ]);

      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Validated: author_name=Override Author');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }, 120_000);
});
