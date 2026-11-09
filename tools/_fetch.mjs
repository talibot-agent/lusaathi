// Shared injectable fetch for offline tests. Default: globalThis.fetch.
let _fetchImpl = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;

/** @param {typeof fetch | null} fn */
export function setFetchForTests(fn) {
  _fetchImpl = fn;
}

export function getFetch() {
  if (!_fetchImpl) throw new Error('fetch is not available; pass raw JSON for offline use or inject setFetchForTests');
  return _fetchImpl;
}
