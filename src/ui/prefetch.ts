/** One background result at a time, valid only for the key it was requested under. */
export interface Prefetch<T> {
  /** Starts generating for `key`, aborting whatever was running for another key. Same key: no-op. */
  request(
    key: string,
    generate: (signal: AbortSignal) => Promise<T | undefined>,
  ): void;
  /** The ready result for `key`, handed out once; undefined means not ready or another key. */
  take(key: string): T | undefined;
  /** Drops the result and aborts the request in flight. */
  cancel(): void;
}

export function createPrefetch<T>(): Prefetch<T> {
  let current: string | undefined;
  let ready: T | undefined;
  let controller: AbortController | undefined;

  const cancel = (): void => {
    controller?.abort();
    controller = undefined;
    current = undefined;
    ready = undefined;
  };

  return {
    request(key, generate) {
      if (key === current) return;
      cancel();
      current = key;
      const mine = new AbortController();
      controller = mine;
      // A rejection is a failed prefetch like any other: the learner gets offline text.
      generate(mine.signal).then(
        (value) => {
          if (controller === mine) ready = value;
        },
        () => {},
      );
    },
    take(key) {
      if (key !== current || ready === undefined) return undefined;
      const value = ready;
      cancel();
      return value;
    },
    cancel,
  };
}
