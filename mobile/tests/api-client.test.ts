import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createApiClient, normalizeApiUrl, type Tokens } from '../src/lib/api-client.ts';

const initial: Tokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
function storage(value: Tokens | null = initial) {
  let current = value;
  return { read: async () => current, write: async (next: Tokens | null) => { current = next; }, value: () => current };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test('uses the configured API and bearer token; supports plain and envelope responses', async () => {
  const store = storage();
  const client = createApiClient({ baseUrl: 'http://192.168.1.10:3000/api/', storage: store, fetcher: async (input, options) => {
    assert.equal(input, 'http://192.168.1.10:3000/api/bookings');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer old-access');
    assert.deepEqual(JSON.parse(String(options?.body)), { scheduleId: 'schedule' });
    return json({ success: true, data: { id: 'booking' } });
  } });
  assert.deepEqual(await client.request('/bookings', { method: 'POST', body: { scheduleId: 'schedule' } }), { id: 'booking' });
});

test('coalesces concurrent 401s into one refresh and retries with the rotated tokens', async () => {
  const store = storage(); let refreshes = 0;
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: store, fetcher: async (input, options) => {
    if (String(input).endsWith('/auth/refresh')) {
      refreshes += 1;
      assert.equal((options?.headers as Record<string, string>).Authorization, undefined);
      await new Promise(resolve => setTimeout(resolve, 5));
      return json({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    }
    return (options?.headers as Record<string, string>).Authorization === 'Bearer new-access' ? json({ ok: true }) : json({ message: 'Expired' }, 401);
  } });
  const results = await Promise.all([client.request('/auth/me'), client.request('/bookings/me')]);
  assert.deepEqual(results, [{ ok: true }, { ok: true }]); assert.equal(refreshes, 1);
  assert.equal(store.value()?.refreshToken, 'new-refresh');
});

test('does not resurrect the session when a refresh finishes after logout', async () => {
  const store = storage();
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: store, fetcher: async input => {
    if (String(input).endsWith('/auth/refresh')) { started(); await gate; return json({ accessToken: 'new-access', refreshToken: 'new-refresh' }); }
    return json({ message: 'Expired' }, 401);
  } });
  const pending = client.request('/bookings/me');
  await ready; await client.setSession(null); release();
  await assert.rejects(pending, (error: ApiError) => error.status === 401);
  assert.equal(await client.session(), null); assert.equal(store.value(), null);
});

test('clears rejected refresh tokens while preserving tokens on temporary network failures', async () => {
  const store = storage();
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: store, fetcher: async () => json({ message: 'Invalid session' }, 401) });
  await assert.rejects(client.request('/bookings/me'), (error: ApiError) => error.status === 401);
  assert.equal(store.value(), null);
  const retryStore = storage();
  const retryClient = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: retryStore, fetcher: async input => {
    if (String(input).endsWith('/auth/refresh')) throw new Error('Network offline');
    return json({ message: 'Expired' }, 401);
  } });
  await assert.rejects(retryClient.request('/bookings/me'), /Không kết nối/);
  assert.deepEqual(retryStore.value(), initial);
});

test('never leaks bearer tokens through absolute request URLs or public login calls', async () => {
  let calls = 0;
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: storage(), fetcher: async (_, options) => { calls++; assert.equal((options?.headers as Record<string, string>).Authorization, undefined); return json({ ok: true }); } });
  await assert.rejects(client.request('https://other.example.test/path'), /Đường dẫn/);
  await assert.rejects(client.request('//other.example.test/path'), /Đường dẫn/);
  await client.request('/auth/login', { method: 'POST', body: { email: 'customer@example.test', password: 'test' }, authenticated: false });
  assert.equal(calls, 1);
});

test('preserves multipart uploads without adding a JSON content type', async () => {
  const body = new FormData(); body.append('file', new Blob(['image']), 'receipt.jpg');
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: storage(), fetcher: async (_, options) => { assert.equal(options?.body, body); assert.equal((options?.headers as Record<string, string>)['Content-Type'], undefined); return json({ path: '/uploads/receipts/test.jpg' }); } });
  assert.deepEqual(await client.request('/uploads?folder=receipts', { method: 'POST', body }), { path: '/uploads/receipts/test.jpg' });
});

test('fixes localhost upload URLs for physical devices and rejects unsafe image schemes', () => {
  const client = createApiClient({ baseUrl: 'http://192.168.1.10:3000/api', storage: storage(null) });
  assert.equal(client.assetUrl('/uploads/tours/test.jpg'), 'http://192.168.1.10:3000/uploads/tours/test.jpg');
  assert.equal(client.assetUrl('http://localhost:3000/uploads/tours/test.jpg'), 'http://192.168.1.10:3000/uploads/tours/test.jpg');
  assert.equal(client.assetUrl('javascript:alert(1)'), undefined);
  assert.equal(client.assetUrl('https://user:password@example.test/private'), undefined);
  assert.throws(() => normalizeApiUrl('https://user:password@example.test/api'));
});

test('keeps validation details and reports timeouts clearly', async () => {
  const client = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: storage(null), fetcher: async () => json({ message: 'Validation failed', details: [{ field: 'passengers.0.dob', message: 'Invalid date' }] }, 400) });
  await assert.rejects(client.request('/bookings'), /passengers\.0\.dob: Invalid date/);
  const slow = createApiClient({ baseUrl: 'https://tour.example.test/api', storage: storage(null), timeoutMs: 5, fetcher: async (_, options) => new Promise((_, reject) => { options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))); }) });
  await assert.rejects(slow.request('/tours'), /quá thời gian/);
});
