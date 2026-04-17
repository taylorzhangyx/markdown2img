export type ErrorCode =
  | 'parse_error'
  | 'validation_error'
  | 'asset_resolution_error'
  | 'mermaid_render_error'
  | 'layout_render_error'
  | 'internal_exception';

export class Markdown2ImgError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'Markdown2ImgError';
  }

  format(): string {
    const lines = [`[ERROR] ${this.code}: ${this.message}`];
    if (this.detail) {
      lines.push(`Detail: ${this.detail}`);
    }
    return lines.join('\n');
  }
}
