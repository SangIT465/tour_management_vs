import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { root } from './config.mjs';

export function startNpm(directory, args, env = {}, interactive = false) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Chạy từ thư mục gốc bằng npm run (Windows: npm.cmd run).');
  return spawn(process.execPath, [cli, ...args], {
    cwd: join(root, directory),
    env: { ...process.env, ...env },
    stdio: [interactive ? 'inherit' : 'ignore', 'inherit', 'inherit'],
    detached: process.platform !== 'win32',
    windowsHide: true,
  });
}

export function finished(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Tiến trình ${child.pid ?? ''} kết thúc (${signal || code}).`));
    });
  });
}

// Stop only process trees created by this launcher, including Nest/Metro children.
export function stopChild(child) {
  if (!child.pid) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore', windowsHide: true,
      });
      killer.once('error', resolve);
      killer.once('exit', resolve);
    });
  }
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  return Promise.resolve();
}
