import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// A minimal in-memory query cache + pub/sub layer.
//
// TanStack Query was removed per the migration requirements ("do not install
// another data-fetching/caching framework unless absolutely necessary").
// This file replaces it with plain React state/effects, while still letting
// multiple components (e.g. Dashboard + Transactions) share and refresh the
// same data after a mutation, which is why a tiny shared cache is used
// instead of duplicating fetches with isolated useState/useEffect everywhere.
// ---------------------------------------------------------------------------

const store = new Map(); // key -> { data, error, isLoading }
const inFlight = new Map(); // key -> Promise
const subscribers = new Map(); // key -> Set<() => void>

function getSubscribers(key) {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  return subscribers.get(key);
}

function emit(key) {
  getSubscribers(key).forEach((fn) => fn());
}

function getEntry(key) {
  return store.get(key) ?? { data: undefined, error: null, isLoading: true };
}

async function runFetch(key, queryFn) {
  const existing = inFlight.get(key);
  if (existing) return existing;

  store.set(key, { ...getEntry(key), isLoading: true });
  emit(key);

  const promise = (async () => {
    try {
      const data = await queryFn();
      store.set(key, { data, error: null, isLoading: false });
    } catch (error) {
      store.set(key, { data: undefined, error, isLoading: false });
    } finally {
      inFlight.delete(key);
      emit(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/** Drops cached data for the given keys and notifies subscribers to refetch. */
export function invalidateQueries(keys) {
  keys.forEach((key) => {
    store.delete(key);
    emit(key);
  });
}

/** useQuery-like hook backed by the shared cache above. */
export function useDataQuery(key, queryFn) {
  const [, setTick] = useState(0);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    getSubscribers(key).add(rerender);
    if (!store.has(key)) {
      runFetch(key, queryFnRef.current);
    }
    return () => getSubscribers(key).delete(rerender);
  }, [key]);

  const entry = getEntry(key);
  const refetch = useCallback(() => runFetch(key, queryFnRef.current), [key]);

  return { data: entry.data, isLoading: entry.isLoading, error: entry.error, refetch };
}

/** useMutation-like hook with the same mutate/mutateAsync/isPending shape used across this app. */
export function useDataMutation(mutationFn, { onSuccess } = {}) {
  const [isPending, setIsPending] = useState(false);
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const mutateAsync = useCallback(async (variables) => {
    setIsPending(true);
    try {
      const result = await mutationFnRef.current(variables);
      onSuccessRef.current?.(result, variables);
      return result;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback(
    (variables, opts) => {
      mutateAsync(variables)
        .then((result) => opts?.onSuccess?.(result))
        .catch(() => {
          // Errors are surfaced to callers via mutateAsync/toast in each call site;
          // swallow here so an unhandled rejection doesn't crash the app.
        });
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending };
}
