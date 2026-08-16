import { createClient } from "@supabase/supabase-js";

// --- "Remember me" session persistence -------------------------------------
//
// Supabase's client is created once, but whether a session should survive a
// browser restart is a per-sign-in choice ("Remember me"). We can't swap the
// client's storage engine after creation, so instead we hand Supabase a
// storage adapter that decides — on every read/write — whether the active
// preference wants localStorage (persists across restarts) or sessionStorage
// (cleared when the browser/tab closes).
//
// The preference itself is a small, non-sensitive flag stored in
// localStorage so the checkbox can restore its last state even when the
// session itself was only kept in sessionStorage.
const REMEMBER_ME_KEY = "mt-remember-me";

export function getRememberMePreference() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(REMEMBER_ME_KEY);
  return stored === null ? true : stored === "true";
}

export function setRememberMePreference(remember) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
}

function createAuthStorage() {
  return {
    getItem(key) {
      if (typeof window === "undefined") return null;
      // Whichever store the current/last session was written to wins.
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      if (typeof window === "undefined") return;
      if (getRememberMePreference()) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    },
    removeItem(key) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New Supabase API keys are opaque strings, not bearer JWTs, so make sure we
// never accidentally send the key as a Bearer token — only as `apikey`.
function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in your .env file (see .env.example).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? createAuthStorage() : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase;

// Lazily create the client on first use so a missing/invalid env var throws
// a clear error only when Supabase is actually touched, not at import time.
export const supabase = new Proxy(
  {},
  {
    get(_, prop, receiver) {
      if (!_supabase) _supabase = createSupabaseClient();
      return Reflect.get(_supabase, prop, receiver);
    },
  },
);
