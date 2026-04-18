import type { Root } from 'mdast';

export interface ParsedArticle {
  readonly frontmatter: Record<string, unknown>;
  readonly mdast: Root;
  readonly sourcePath: string;
  readonly sourceDir: string;
}

export interface ArticleMeta {
  readonly title: string;
  readonly author_name: string;
  readonly avatar_path?: string;
  readonly date?: string;
  readonly theme?: string;
  readonly cover_image?: string;
  readonly cover_summary?: string;
}

export interface ValidatedArticle {
  readonly meta: ArticleMeta;
  readonly mdast: Root;
  readonly sourceDir: string;
}

export interface RuntimeMetaOverrides {
  readonly authorName?: string;
  readonly avatarPath?: string;
  readonly date?: string;
  readonly coverSummary?: string;
}

export interface PipelineOptions {
  readonly outputBase?: string;
  readonly outputDir?: string;
  readonly overwrite?: boolean;
  readonly coverOnly?: boolean;
  readonly json?: boolean;
  readonly metaOverrides?: RuntimeMetaOverrides;
  readonly log?: (line: string) => void;
}

export type ContentBlock =
  | { readonly type: 'heading'; readonly level: 1 | 2 | 3; readonly html: string }
  | { readonly type: 'paragraph'; readonly html: string }
  | { readonly type: 'list'; readonly ordered: boolean; readonly html: string }
  | { readonly type: 'blockquote'; readonly html: string }
  | { readonly type: 'code'; readonly lang?: string; readonly html: string }
  | { readonly type: 'table'; readonly html: string }
  | { readonly type: 'image'; readonly src: string; readonly alt?: string; readonly fileUrl: string }
  | { readonly type: 'mermaid'; readonly code: string };

export interface BlockMeasurement {
  readonly index: number;
  readonly type: string;
  readonly top: number;
  readonly height: number;
  readonly canSplit: boolean;
}

export interface PageSpec {
  readonly pageIndex: number;
  readonly blockRange: { readonly start: number; readonly end: number };
  readonly clipY: number;
  readonly contentHeight: number;
  readonly contentBottom: number;
  readonly isFirstPage: boolean;
  readonly isLastPage: boolean;
  readonly hasEndMarker: boolean;
  readonly bodyPageNumber: number;
  readonly bodyPageCount: number;
}

export interface PageBreakPlan {
  readonly pages: readonly PageSpec[];
  readonly totalContentHeight: number;
}

export const LAYOUT = {
  PAGE_WIDTH: 1080,
  PAGE_HEIGHT: 1800,
  PAGE_PADDING: 80,
  USABLE_HEIGHT: 1640,
  FIRST_PAGE_IDENTITY: 120,
  FIRST_PAGE_USABLE: 1520,
  END_MARKER_HEIGHT: 120,
  END_MARKER_OFFSET: 72,
} as const;
