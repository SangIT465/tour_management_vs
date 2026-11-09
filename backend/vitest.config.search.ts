import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/search.integration.ts'], hookTimeout: 60_000, testTimeout: 30_000 },
});
