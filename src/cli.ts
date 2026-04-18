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

interface CliOptions {
  output?: string;
  outputDir?: string;
  overwrite?: boolean;
  json?: boolean;
  coverOnly?: boolean;
  authorName?: string;
  avatarPath?: string;
  date?: string;
  coverSummary?: string;
}

function validateCliOptions(options: CliOptions): void {
  if (options.output && options.outputDir) {
    throw new Markdown2ImgError('validation_error', 'Use either --output or --output-dir, not both');
  }

  if (options.overwrite && !options.outputDir) {
    throw new Markdown2ImgError('validation_error', '--overwrite requires --output-dir');
  }
}

export async function main(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('markdown2img')
    .version('0.1.0')
    .description('Convert Markdown articles to fixed-size PNG image sequences')
    .argument('<input>', 'Markdown file path')
    .option('-o, --output <dir>', 'Output base directory (timestamped child dir mode)')
    .option('--output-dir <dir>', 'Write directly into this exact output directory')
    .option('--overwrite', 'Remove existing numbered PNGs in --output-dir before rendering')
    .option('--json', 'Print machine-readable JSON to stdout')
    .option('--cover-only', 'Render only the cover page')
    .option('--author-name <text>', 'Override author_name metadata at runtime')
    .option('--avatar-path <path>', 'Override avatar_path metadata at runtime')
    .option('--date <text>', 'Override date metadata at runtime')
    .option('--cover-summary <text>', 'Override cover summary metadata at runtime')
    .action(async (input: string, options: CliOptions) => {
      try {
        validateCliOptions(options);

        const result = await runPipeline(input, {
          outputBase: options.output,
          outputDir: options.outputDir,
          overwrite: options.overwrite,
          json: options.json,
          coverOnly: options.coverOnly,
          metaOverrides: {
            authorName: options.authorName,
            avatarPath: options.avatarPath,
            date: options.date,
            coverSummary: options.coverSummary,
          },
          log: options.json ? (line) => console.error(line) : (line) => console.log(line),
        });

        if (options.json) {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        }

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
