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

// Tracks the latest queryFn registered for each key so the foreground
// revalidation below can refetch a key even though it only has the key, not
// a component to ask for its queryFn.
const queryFnByKey = new Map();

// ---------------------------------------------------------------------------
// Refetch everything that's currently on screen whenever the app comes back
// to the foreground (tab refocused, or a mobile/PWA app switched back to).
//
// invalidateQueries() already makes a change made *within* a live session
// show up everywhere immediately. But it only fires for the specific keys a
// mutation names — it can't know about a change made while the app was
// backgrounded, another tab, or a previous session that hadn't reconciled
// yet. Without this, a stale screen would only ever refresh itself on a full
// reload (closing and reopening the app), which is confusing since the data
// on the server is already correct. Revalidating every mounted query on
// focus/visibility closes that gap so what you see always matches the
// server, not just "whatever happened to change in this tab".
if (typeof document !== "undefined") {
  const revalidateMountedQueries = () => {
    if (document.visibilityState !== "visible") return;
    subscribers.forEach((subs, key) => {
      const queryFn = queryFnByKey.get(key);
      if (subs.size > 0 && queryFn) runFetch(key, queryFn);
    });
  };
  document.addEventListener("visibilitychange", revalidateMountedQueries);
  window.addEventListener("focus", revalidateMountedQueries);
  window.addEventListener("pageshow", revalidateMountedQueries);
}

/** useQuery-like hook backed by the shared cache above. */
export function useDataQuery(key, queryFn) {
  const [, setTick] = useState(0);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  queryFnByKey.set(key, queryFn);

  useEffect(() => {
    // `emit(key)` fires this for every mounted subscriber of `key` — both
    // when a fetch finishes AND when invalidateQueries() clears the cache
    // entry. Without re-fetching here, an invalidated key would just sit
    // empty until the component unmounts/remounts (e.g. navigating away and
    // back, or a full page refresh), which is why adding/removing data
    // anywhere in the app previously required a manual refresh to show up
    // elsewhere. Re-running the fetch whenever we notice the entry is gone
    // makes every screen sharing this key update itself immediately.
    const rerender = () => {
      if (!store.has(key)) {
        runFetch(key, queryFnRef.current);
      }
      setTick((t) => t + 1);
    };
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
