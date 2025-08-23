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
  external: [],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    }
  }
});