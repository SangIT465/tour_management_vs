import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseHost, devConfig } from './config.mjs';

test('đồng bộ API, proxy và CORS khi backend đổi cổng/prefix', () => {
  const config = devConfig({ PORT: '3001', API_PREFIX: '/v1/api/', CORS_ORIGIN: 'https://admin.example.com' }, {}, '192.168.1.8');
  assert.equal(config.mobileApi, 'http://192.168.1.8:3001/v1/api');
  assert.equal(config.healthUrl, 'http://127.0.0.1:3001/v1/api/health');
  assert.ok(config.corsOrigins.includes('https://admin.example.com'));
  assert.ok(config.corsOrigins.includes('http://localhost:8081'));
  assert.ok(config.corsOrigins.includes('http://192.168.1.8:5173'));
});

test('cho phép chọn card mạng hoặc API HTTPS khi phát triển trên nhiều máy', () => {
  const config = devConfig({}, { TOURGO_HOST: '192.168.2.4', TOURGO_API_URL: 'https://api.example.com/api/' }, '127.0.0.1');
  assert.equal(config.lanHost, '192.168.2.4');
  assert.equal(config.mobileApi, 'https://api.example.com/api');
});

test('chặn cấu hình cổng/URL sai và thông tin đăng nhập trong public URL', () => {
  for (const port of ['0', '65536', '3000abc']) assert.throws(() => devConfig({ PORT: port }, {}));
  for (const url of ['file:///etc/passwd', 'https://user:pass@example.com/api', 'https://example.com/api?token=secret', 'bad']) {
    assert.throws(() => devConfig({}, { TOURGO_API_URL: url }));
  }
  assert.throws(() => devConfig({}, { TOURGO_HOST: 'http://localhost:3000' }));
});

test('chọn IP LAN, bỏ loopback/link-local; không có mạng vẫn chạy web cục bộ', () => {
  assert.equal(chooseHost({ a: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }], b: [
    { family: 'IPv4', internal: false, address: '169.254.1.1' },
    { family: 'IPv4', internal: false, address: '192.168.1.8' },
  ] }), '192.168.1.8');
  assert.equal(chooseHost({}), '127.0.0.1');
});
