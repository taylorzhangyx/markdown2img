import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  banner: { js: '#!/usr/bin/env node' },
  onSuccess: 'mkdir -p dist/templates dist/assets && cp src/templates/theme-default.css dist/templates/theme-default.css && cp src/assets/mermaid.min.js dist/assets/mermaid.min.js && cp src/assets/default-avatar.png dist/assets/default-avatar.png',
});
