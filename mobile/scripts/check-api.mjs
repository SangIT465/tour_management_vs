const configured = process.env.EXPO_PUBLIC_API_URL;
if (!configured) {
  console.error('Set EXPO_PUBLIC_API_URL in mobile/.env before checking the API.');
  process.exitCode = 1;
} else {
  try {
    const base = new URL(configured);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid API URL');
    const response = await fetch(`${configured.replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if ((body.data ?? body).status !== 'ok') throw new Error('Unexpected health response');
    console.log('TourGo API connection: OK');
  } catch (error) {
    console.error(`Cannot reach the TourGo API: ${error.message}. Check the backend, Wi-Fi IP and port.`);
    process.exitCode = 1;
  }
}
