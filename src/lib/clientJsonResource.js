// Shared client resource for deduplicated JSON requests with bounded retries and timeouts.

const DEFAULT_CACHE_MS = 2 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRY_DELAY_MS = 200;

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const toError = (error) => (error instanceof Error ? error : new Error(String(error)));

const shouldRetryStatus = (status) => status === 429 || status >= 500;

export function createClientJsonResource({
  url,
  cacheMs = DEFAULT_CACHE_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = 1,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  sleep = wait,
  transform = (data) => data,
} = {}) {
  if (!url) throw new Error("A resource URL is required");

  let snapshot = {
    status: "idle",
    data: null,
    error: null,
    updatedAt: null,
  };
  let inFlight = null;
  let activeController = null;
  const listeners = new Set();

  const emit = (next) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };

  const request = async () => {
    activeController = new AbortController();
    const timeoutId = setTimeout(() => activeController?.abort("timeout"), timeoutMs);

    try {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          const response = await fetchImpl(url, {
            cache: "no-store",
            signal: activeController.signal,
          });

          if (!response.ok) {
            const error = new Error(`Request failed with status ${response.status}`);
            error.status = response.status;
            error.retryable = shouldRetryStatus(response.status);
            throw error;
          }

          return transform(await response.json());
        } catch (error) {
          if (activeController.signal.aborted) {
            const message = activeController.signal.reason === "timeout" ? "Request timed out" : "Request cancelled";
            throw new Error(message);
          }

          const normalized = toError(error);
          const canRetry = attempt < retries && normalized.retryable !== false;
          if (!canRetry) throw normalized;
          await sleep(retryDelayMs * (attempt + 1));
        }
      }

      throw new Error("Request failed");
    } finally {
      clearTimeout(timeoutId);
      activeController = null;
    }
  };

  const load = ({ force = false } = {}) => {
    const isFresh = snapshot.data !== null
      && snapshot.updatedAt !== null
      && now() - snapshot.updatedAt < cacheMs;

    if (!force && isFresh) return Promise.resolve(snapshot.data);
    if (inFlight) return inFlight;

    emit({ status: "loading", error: null });
    inFlight = request()
      .then((data) => {
        emit({ status: "success", data, error: null, updatedAt: now() });
        return data;
      })
      .catch((error) => {
        const normalized = toError(error);
        emit({ status: "error", error: normalized });
        throw normalized;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    refresh: () => load({ force: true }),
    cancel() {
      activeController?.abort("cancelled");
    },
  };
}
