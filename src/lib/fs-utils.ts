import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { format } from 'date-fns';

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
