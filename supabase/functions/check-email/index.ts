// Supabase Edge Function: check-email
//
// Used by the "Forgot password" screen to tell the user up front whether an
// account exists for the email they typed, instead of silently doing
// nothing for unknown addresses. This has to run server-side with the
// service-role key — the anon/client key can't look up auth.users at all,
// and Supabase's own resetPasswordForEmail() intentionally always "succeeds"
// (even for unknown emails) to avoid leaking which addresses are registered.
// That default is a reasonable choice for a lot of apps, but this project
// specifically asked for the reverse (tell the user if the email isn't
// registered), so we do the lookup ourselves before deciding whether to
// trigger the reset email.
//
// Deploy with:
//   supabase functions deploy check-email --no-verify-jwt
//
// (--no-verify-jwt because this runs on the "forgot password" screen,
// before the visitor has a session.)
//
// Requires these env vars (Supabase sets them automatically for Edge Functions):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    // fall through to the empty-email check below
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // GoTrue's admin listUsers doesn't support an exact-email filter, so we
  // page through users looking for a case-insensitive match. Fine for the
  // user counts a personal finance tracker like this one will realistically
  // have; revisit with a dedicated lookup if that ever changes.
  let exists = false;
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (data.users.some((u) => u.email?.toLowerCase() === email)) {
      exists = true;
      break;
    }
    if (data.users.length < perPage) break; // last page
  }

  return new Response(JSON.stringify({ exists }), {
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
