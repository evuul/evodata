// Coordinates browser polling so live data refreshes share one scheduler.

const sources = new Map();
let timerId = null;

const isPollingAllowed = () =>
  typeof document === "undefined" ||
  (document.visibilityState === "visible" && (typeof navigator === "undefined" || navigator.onLine !== false));

const clearTimer = () => {
  if (timerId !== null && typeof window !== "undefined") window.clearTimeout(timerId);
  timerId = null;
};

const schedule = () => {
  clearTimer();
  if (!sources.size || typeof window === "undefined") return;
  const nextRunAt = Math.min(...Array.from(sources.values(), (source) => source.nextRunAt));
  timerId = window.setTimeout(async () => {
    timerId = null;
    const now = Date.now();
    const dueSources = Array.from(sources.values()).filter((source) => source.nextRunAt <= now);

    if (isPollingAllowed()) {
      await Promise.allSettled(
        dueSources.map(async (source) => {
          source.nextRunAt = now + source.intervalMs;
          await source.callback();
        })
      );
    } else {
      dueSources.forEach((source) => {
        source.nextRunAt = now + source.intervalMs;
      });
    }
    schedule();
  }, Math.max(0, nextRunAt - Date.now()));
};

export function subscribeLiveDataSource(key, callback, intervalMs) {
  if (typeof window === "undefined" || typeof callback !== "function") return () => {};
  const interval = Number(intervalMs);
  if (!Number.isFinite(interval) || interval <= 0) return () => {};

  const sourceKey = String(key);
  const source = { callback, intervalMs: interval, nextRunAt: Date.now() + interval };
  sources.set(sourceKey, source);
  schedule();

  return () => {
    if (sources.get(sourceKey) === source) sources.delete(sourceKey);
    schedule();
  };
}

export function resetLiveDataCoordinatorForTests() {
  sources.clear();
  clearTimer();
}
