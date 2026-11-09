export interface Tokens { accessToken: string; refreshToken: string; expiresIn?: number; tokenType?: string }
export interface TokenStorage { read(): Promise<Tokens | null>; write(value: Tokens | null): Promise<void> }
export interface RequestOptions { method?: string; body?: unknown; signal?: AbortSignal; authenticated?: boolean }
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export function normalizeApiUrl(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Địa chỉ API phải là HTTP/HTTPS, không chứa thông tin đăng nhập hoặc tham số.');
  return url.toString().replace(/\/+$/, '');
}

export function createApiClient(options: { baseUrl: string; storage: TokenStorage; fetcher?: typeof fetch; timeoutMs?: number }) {
  const baseUrl = normalizeApiUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const listeners = new Set<(tokens: Tokens | null) => void>();
  let tokens: Tokens | null = null;
  let loaded = false;
  let generation = 0;
  let loading: Promise<Tokens | null> | null = null;
  let refreshing: Promise<Tokens | null> | null = null;
  let persistence: Promise<void> = Promise.resolve();

  async function session(): Promise<Tokens | null> {
    if (loaded) return tokens;
    if (!loading) {
      const revision = generation;
      loading = options.storage.read().then(value => {
        if (generation === revision) { tokens = value; loaded = true; }
        return tokens;
      }).finally(() => { loading = null; });
    }
    return loading;
  }

  async function setSession(value: Tokens | null): Promise<void> {
    const saved = value ? { accessToken: value.accessToken, refreshToken: value.refreshToken, ...(value.expiresIn !== undefined ? { expiresIn: value.expiresIn } : {}), ...(value.tokenType ? { tokenType: value.tokenType } : {}) } : null;
    generation += 1; loaded = true; tokens = saved;
    listeners.forEach(listener => listener(saved));
    // Preserve write order when logout races a refresh or a login.
    persistence = persistence.catch(() => {}).then(() => options.storage.write(saved));
    await persistence;
  }

  async function perform<T>(path: string, request: RequestOptions, accessToken?: string): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new ApiError('Đường dẫn API không hợp lệ.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (request.signal?.aborted) controller.abort();
    request.signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, options.timeoutMs ?? 15_000);
    const multipart = typeof FormData !== 'undefined' && request.body instanceof FormData;
    try {
      const response = await fetcher(`${baseUrl}${path}`, {
        method: request.method ?? 'GET', signal: controller.signal, credentials: 'omit',
        headers: { Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(request.body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}) },
        ...(request.body !== undefined ? { body: multipart ? request.body as FormData : JSON.stringify(request.body) } : {}),
      });
      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : null; }
      catch { throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ. Kiểm tra địa chỉ API.', response.status); }
      if (!response.ok) {
        const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message ?? `Yêu cầu thất bại (${response.status})`;
        const details = Array.isArray(body?.details) ? body.details.map((detail: { field?: string; message?: string }) => [detail.field, detail.message].filter(Boolean).join(': ')).filter(Boolean) : [];
        throw new ApiError([message, ...details].join('. '), response.status);
      }
      return body?.success === true && 'data' in body ? body.data : body;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (request.signal?.aborted) throw error;
      if (controller.signal.aborted) throw new ApiError('Kết nối quá thời gian chờ. Vui lòng thử lại.');
      throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.');
    } finally {
      clearTimeout(timeout); request.signal?.removeEventListener('abort', abort);
    }
  }

  async function rotate(failedToken: string): Promise<Tokens | null> {
    const current = await session();
    if (!current) return null;
    if (current.accessToken !== failedToken) return current;
    if (refreshing) return refreshing;
    const revision = generation;
    refreshing = (async () => {
      try {
        const next = await perform<Tokens>('/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } });
        if (!next?.accessToken || !next.refreshToken) throw new ApiError('Phiên đăng nhập trả về không hợp lệ.');
        if (generation !== revision) return tokens;
        await setSession(next);
        return next;
      } catch (error) {
        if (generation === revision && error instanceof ApiError && [400, 401, 403].includes(error.status)) await setSession(null);
        throw error;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function request<T>(path: string, input: RequestOptions = {}): Promise<T> {
    const current = input.authenticated === false ? null : await session();
    try { return await perform<T>(path, input, current?.accessToken); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !current || ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'].includes(path)) throw error;
      const next = await rotate(current.accessToken);
      if (!next) throw new ApiError('Vui lòng đăng nhập để tiếp tục.', 401);
      return perform<T>(path, input, next.accessToken);
    }
  }

  function assetUrl(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const origin = new URL(baseUrl).origin;
    try {
      const url = new URL(value, origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
      // Uploaded URLs created on the server may still contain localhost during LAN development.
      if (url.pathname.startsWith('/uploads/') && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) return `${origin}${url.pathname}`;
      return url.toString();
    } catch { return undefined; }
  }

  return { request, session, setSession, assetUrl, baseUrl, subscribe(listener: (value: Tokens | null) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
