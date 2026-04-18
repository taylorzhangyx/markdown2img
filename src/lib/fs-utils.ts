import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { format } from 'date-fns';

export interface PreparedOutputDir {
  readonly mode: 'timestamped' | 'fixed';
  readonly outputDir: string;
}

export function resolveOutputBase(inputPath: string, outputOption?: string): string {
  const baseDir = outputOption ? resolve(outputOption) : dirname(resolve(inputPath));
  mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

export function createOutputDir(baseDir: string): string {
  const outputDir = resolve(baseDir, format(new Date(), 'yyyyMMdd-HHmmss'));
  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

function cleanupNumberedPngs(outputDir: string): void {
  for (const entry of readdirSync(outputDir)) {
    if (/^\d{3}\.png$/.test(entry)) {
      rmSync(resolve(outputDir, entry), { force: true });
    }
  }
}

export async function prepareOutputDir(options: {
  inputPath: string;
  outputBase?: string;
  outputDir?: string;
  overwrite?: boolean;
}): Promise<PreparedOutputDir> {
  if (options.outputDir) {
    const fixedDir = resolve(options.outputDir);
    await mkdir(fixedDir, { recursive: true });

    if (options.overwrite) {
      cleanupNumberedPngs(fixedDir);
    }

    return {
      mode: 'fixed',
      outputDir: fixedDir,
    };
  }

  const baseDir = resolveOutputBase(options.inputPath, options.outputBase);
  return {
    mode: 'timestamped',
    outputDir: createOutputDir(baseDir),
  };
}
