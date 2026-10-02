/** Provider boundary. Providers receive a detached mount, never the live fallback. */
export function createAdController({ provider, timeoutMs = 2500 } = {}) {
  const requests = new Map();
  return {
    async load({ id, consent = false, visible = false, mount, signal } = {}) {
      if (!provider || !consent || !visible) return 'house';
      if (signal?.aborted) return 'fallback';
      if (requests.has(id)) return requests.get(id);
      const request = Promise.resolve().then(async () => {
        let timer;
        const abort = new AbortController();
        try {
          const result = await Promise.race([
            provider.render({ id, mount, signal: signal ? AbortSignal.any([signal, abort.signal]) : abort.signal }),
            new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('Ad timeout')); }, timeoutMs); })
          ]);
          return signal?.aborted || result?.filled === false ? 'fallback' : 'filled';
        } catch { return 'fallback'; } finally { clearTimeout(timer); }
      });
      requests.set(id, request);
      return request;
    }
  };
}
