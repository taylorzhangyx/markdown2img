import { pathToFileURL } from 'node:url';

import { Command } from 'commander';

import { Markdown2ImgError } from './lib/error.js';
import { runPipeline } from './pipeline.js';

export function formatCliError(error: unknown): string {
  if (error instanceof Markdown2ImgError) {
    return error.format();
  }

  return `[ERROR] internal_exception: ${error instanceof Error ? error.message : String(error)}`;
}

export async function main(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('markdown2img')
    .version('0.1.0')
    .description('Convert Markdown articles to fixed-size PNG image sequences')
    .argument('<input>', 'Markdown file path')
    .option('-o, --output <dir>', 'Output base directory')
    .action(async (input: string, options: { output?: string }) => {
      try {
        await runPipeline(input, options.output);
        process.exit(0);
      } catch (error) {
        console.error(formatCliError(error));
        process.exit(1);
      }
    });

  await program.parseAsync(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
