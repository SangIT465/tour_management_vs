import net from 'node:net';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { devConfig, readEnv, root } from './config.mjs';
import { startNpm, stopChild } from './process.mjs';

const mode = process.argv[2];
const args = process.argv.slice(3);
const children = [];
const controller = new AbortController();
let stopping = false;

async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  controller.abort();
  await Promise.allSettled(children.map(stopChild));
  process.exitCode = code;
}

function start(directory, args, env, interactive = false) {
  const child = startNpm(directory, args, env, interactive);
  children.push(child);
  child.once('error', (error) => {
    console.error(`[${directory}] ${error.message}`);
    void shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${directory}] đã dừng (${signal || code}). Dừng các dịch vụ cùng phiên.`);
      void shutdown(code || 1);
    }
  });
}

async function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}

async function healthy(url) {
  try {
    const result = await fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]) });
    const body = await result.json();
    return result.ok && (body.status === 'ok' || body.data?.status === 'ok');
  } catch { return false; }
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));

try {
  if (!['all', 'web', 'mobile'].includes(mode) || args.some((arg) => arg !== '--reuse-api')) {
    throw new Error('Dùng npm run dev[:web|:mobile] [-- --reuse-api].');
  }
  const config = devConfig(await readEnv('backend'));
  const services = ['backend', ...(mode !== 'mobile' ? ['frontend'] : []), ...(mode !== 'web' ? ['mobile'] : [])];
  for (const directory of services) {
    try { await access(join(root, directory, 'node_modules')); }
    catch { throw new Error(`Thiếu dependencies của ${directory}. Chạy npm run setup trước.`); }
  }
  try { await access(join(root, 'backend', '.env')); }
  catch { throw new Error('Thiếu backend/.env. Chạy npm run setup rồi điền cấu hình MySQL.'); }

  const apiRunning = await portIsOpen(config.port);
  if (apiRunning && !args.includes('--reuse-api')) {
    throw new Error(`Cổng API ${config.port} đang được dùng. Dừng backend cũ hoặc thêm -- --reuse-api để dùng API có sẵn.`);
  }
  for (const [enabled, port] of [[mode !== 'mobile', 5173], [mode !== 'web', 8081]]) {
    if (enabled && await portIsOpen(port)) {
      throw new Error(`Cổng ${port} đang được dùng. Dừng phiên web/Metro cũ trước khi chạy lại.`);
    }
  }
  if (apiRunning && !await healthy(config.healthUrl)) {
    throw new Error('Dịch vụ ở cổng API không trả health hợp lệ; không tái sử dụng.');
  }
  console.log(`\nTourGo · ${mode}\nAPI: ${config.origin}${config.apiPath}`);
  if (mode !== 'mobile') console.log('Website: http://localhost:5173');
  if (mode !== 'web') console.log(`Mobile API: ${config.mobileApi}\nExpo: http://localhost:8081 (quét QR trong Expo Go)`);
  console.log('Ctrl+C để dừng các dịch vụ do lệnh này khởi động.\n');
  if (!apiRunning) {
    start('backend', ['run', 'dev'], {
      NODE_ENV: 'development', PORT: String(config.port), API_PREFIX: config.prefix,
      CORS_ORIGIN: config.corsOrigins,
    });
    const deadline = Date.now() + 90000;
    while (!stopping && !await healthy(config.healthUrl)) {
      if (Date.now() > deadline) throw new Error('Backend chưa sẵn sàng sau 90 giây. Kiểm tra MySQL và log backend.');
      await delay(750, undefined, { signal: controller.signal });
    }
  } else {
    console.log('Dùng backend đang chạy; cấu hình CORS của backend đó phải cho phép origin web/Expo.');
  }
  if (!stopping && mode !== 'mobile') {
    start('frontend', ['run', 'dev', '--', '--host', '0.0.0.0'], {
      API_PROXY_TARGET: config.origin, API_PROXY_PREFIX: config.apiPath, VITE_API_BASE_URL: '/api',
    });
  }
  if (!stopping && mode !== 'web') {
    start('mobile', ['start', '--', '--port', '8081'], {
      EXPO_PUBLIC_API_URL: config.mobileApi,
      REACT_NATIVE_PACKAGER_HOSTNAME: config.lanHost,
    }, true);
  }
} catch (error) {
  if (!stopping) console.error(`\n${error.message}`);
  await shutdown(stopping ? (process.exitCode ?? 1) : 1);
}
