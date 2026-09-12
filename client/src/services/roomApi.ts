export const fetchHealth = async () => {
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
  let baseUrl = '';
  if (envApiUrl) {
    baseUrl = envApiUrl.replace(/\/$/, '');
  } else if (envWsUrl) {
    baseUrl = envWsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://').replace(/\/$/, '');
  }
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
};
