async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return data;
}

export const api = {
  // 港口
  listPorts: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.kw) qs.set('kw', params.kw);
    if (params.type) qs.set('type', params.type);
    const s = qs.toString();
    return request(`/api/ports${s ? '?' + s : ''}`);
  },
  createPort: (body) => request('/api/ports', { method: 'POST', body: JSON.stringify(body) }),
  updatePort: (id, body) => request(`/api/ports/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePort: (id) => request(`/api/ports/${id}`, { method: 'DELETE' }),
  resetPorts: () => request('/api/ports/reset', { method: 'POST' }),
  // 航线
  listItineraries: () => request('/api/itineraries'),
  createItinerary: (body) => request('/api/itineraries', { method: 'POST', body: JSON.stringify(body) }),
  deleteItinerary: (id) => request(`/api/itineraries/${id}`, { method: 'DELETE' }),
};
