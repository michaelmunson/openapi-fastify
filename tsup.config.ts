import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  target: 'node20',
  format: ['cjs', 'esm'],
  bundle: true,
  sourcemap: true,
  clean: true,
  platform: 'node',
  dts: true,
  external: [], // optional: you can exclude some deps if needed
});