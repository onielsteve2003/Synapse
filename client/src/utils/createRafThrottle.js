function getNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

export function createRafThrottle(callback, intervalMs = 16) {
  let frameId = null;
  let timeoutId = null;
  let lastRunAt = 0;
  let pendingArgs = null;

  function flush(timestamp = getNow()) {
    if (!pendingArgs) {
      frameId = null;
      return;
    }

    if (timestamp - lastRunAt < intervalMs) {
      frameId = requestAnimationFrame(flush);
      return;
    }

    const nextArgs = pendingArgs;

    pendingArgs = null;
    frameId = null;
    lastRunAt = timestamp;
    callback(...nextArgs);

    if (pendingArgs) {
      frameId = requestAnimationFrame(flush);
    }
  }

  function flushWithTimeout() {
    timeoutId = null;

    if (!pendingArgs) {
      return;
    }

    const nextArgs = pendingArgs;

    pendingArgs = null;
    lastRunAt = getNow();
    callback(...nextArgs);

    if (pendingArgs) {
      schedule(...pendingArgs);
    }
  }

  function schedule(...args) {
    pendingArgs = args;

    if (typeof requestAnimationFrame === "function") {
      if (frameId === null) {
        frameId = requestAnimationFrame(flush);
      }

      return;
    }

    if (timeoutId !== null) {
      return;
    }

    const now = getNow();
    const delay = Math.max(intervalMs - (now - lastRunAt), 0);

    timeoutId = setTimeout(flushWithTimeout, delay);
  }

  function cancel() {
    if (frameId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(frameId);
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    frameId = null;
    timeoutId = null;
    pendingArgs = null;
  }

  return {
    cancel,
    schedule,
  };
}