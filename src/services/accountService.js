import { supabase } from "@/integrations/supabase/client";

/**
 * Permanently deletes the current user's account.
 *
 * This previously ran as a TanStack Start server function using the Supabase
 * service-role key. A plain Vite SPA has no trusted server to hold that key,
 * so this now calls a Supabase Edge Function ("delete-account") which holds
 * the service-role key on Supabase's infrastructure instead.
 *
 * See supabase/functions/delete-account/index.ts. You need to deploy it once
 * with the Supabase CLI:
 *
 *   supabase functions deploy delete-account
 *
 * and make sure SUPABASE_SERVICE_ROLE_KEY is set as a secret for that function
 * (Supabase sets this automatically for you in most projects).
 */
export async function deleteAccount() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error("You must be signed in to delete your account.");
  }

  const { error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });

  if (error) throw error;
}

/**
 * Checks whether an account exists for the given email. Used by the
 * "Forgot password" screen — see supabase/functions/check-email/index.ts.
 * Called before the user has a session, so no auth header is sent (the
 * function is deployed with --no-verify-jwt).
 */
export async function checkEmailExists(email) {
  const { data, error } = await supabase.functions.invoke("check-email", {
    body: { email },
  });
  if (error) throw error;
  return Boolean(data?.exists);
}
