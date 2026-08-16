import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const AuthContext = createContext({ user: null, session: null, loading: true });
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, session: null, loading: true });
  // Tracks which user id we've already run ensure_user_setup for in this tab,
  // so repeat auth events (token refresh, tab refocus, etc.) don't re-call it.
  const setupDoneForUid = useRef(null);

  useEffect(() => {
    // Runs default-category/item/payment-method setup for a freshly
    // signed-in user and only THEN reveals the app (loading: false).
    // Previously `loading` was cleared immediately on sign-in while
    // ensure_user_setup() ran separately inside useProfile(), which raced
    // against the categories/items queries firing at the same time on
    // Dashboard — a new user could see an empty category list if that
    // query won the race. Awaiting setup here guarantees the defaults
    // exist in the database before any page's queries run.
    const applySession = async (session) => {
      const user = session?.user ?? null;
      if (user && setupDoneForUid.current !== user.id) {
        try {
          await supabase.rpc("ensure_user_setup");
          setupDoneForUid.current = user.id;
        } catch (err) {
          // Don't permanently block the app if this call fails (e.g. a
          // transient network error) — log it and let useProfile()'s own
          // ensure_user_setup call retry on the next render.
          console.error("ensure_user_setup failed:", err);
        }
      }
      setState({ user, session, loading: false });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  return useContext(AuthContext);
}
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}
