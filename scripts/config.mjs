import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));

export async function readEnv(directory) {
  try {
    return parseEnv(await readFile(join(root, directory, '.env'), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

export function chooseHost(interfaces = networkInterfaces()) {
  const addresses = Object.values(interfaces).flat().filter((item) =>
    item && item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'));
  // Prefer a private LAN over a public/VPN address. Override on multi-adapter PCs.
  return addresses.find(({ address }) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address))?.address
    ?? addresses[0]?.address ?? '127.0.0.1';
}

export function devConfig(saved, env = process.env, host = chooseHost()) {
  const port = Number(env.PORT || saved.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT trong backend/.env phải là số từ 1 đến 65535.');
  }
  const prefix = (env.API_PREFIX ?? saved.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '');
  if (!/^[\w/-]*$/.test(prefix) || prefix.split('/').includes('..')) {
    throw new Error('API_PREFIX không hợp lệ.');
  }
  const lanHost = env.TOURGO_HOST || host;
  if (!/^[a-z\d.-]+$/i.test(lanHost)) {
    throw new Error('TOURGO_HOST phải là địa chỉ IPv4 hoặc tên máy, không chứa giao thức/cổng.');
  }
  const origin = `http://127.0.0.1:${port}`;
  const apiPath = prefix ? `/${prefix}` : '';
  const mobileApi = env.TOURGO_API_URL || `http://${lanHost}:${port}${apiPath}`;
  let parsed;
  try { parsed = new URL(mobileApi); } catch { throw new Error('TOURGO_API_URL không hợp lệ.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('TOURGO_API_URL phải là URL HTTP/HTTPS không chứa thông tin đăng nhập, query hoặc hash.');
  }
  const origins = (env.CORS_ORIGIN ?? saved.CORS_ORIGIN ?? '').split(',').filter(Boolean);
  for (const hostname of ['localhost', '127.0.0.1', lanHost]) {
    for (const uiPort of [5173, 8081]) origins.push(`http://${hostname}:${uiPort}`);
  }
  return {
    port, prefix, origin, lanHost, apiPath,
    mobileApi: parsed.href.replace(/\/$/, ''),
    healthUrl: `${origin}${apiPath}/health`,
    corsOrigins: [...new Set(origins.map((item) => item.trim()).filter(Boolean))].join(','),
  };
}
