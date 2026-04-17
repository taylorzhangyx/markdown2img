import { readFile } from 'node:fs/promises';

const PNG_SIGNATURE = '89504e470d0a1a0a';

export async function readPngDimensions(path: string): Promise<{ width: number; height: number }> {
  const buffer = await readFile(path);
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error(`Not a PNG file: ${path}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
