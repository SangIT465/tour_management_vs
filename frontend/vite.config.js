import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:3000';
  const apiPrefix = env.API_PROXY_PREFIX ?? '/api';
  return {
    esbuild: { jsx: 'automatic' },
    server: {
      port: 5173, strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/api(?=\/|$)/, apiPrefix) },
        '/uploads': { target, changeOrigin: true },
      },
    },
  };
});
