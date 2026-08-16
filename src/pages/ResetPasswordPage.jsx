import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, ArrowRight, KeyRound, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/Bits";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Reached by clicking the password-reset link in the email (see AuthPage's
// resetPasswordForEmail call, redirectTo: `${origin}/reset-password`).
// Supabase's client detects the recovery tokens in the URL on load and
// fires a PASSWORD_RECOVERY auth event once it has turned them into a
// (temporary) session — we wait for that before showing the form, and show
// an error state if it never arrives (expired/invalid/reused link).
export default function ResetPasswordPage() {
  useDocumentTitle("Reset password — MoneyTrail");
  const navigate = useNavigate();

  const [status, setStatus] = useState("checking"); // checking | ready | invalid
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // If the recovery session was already established before this listener
    // attached (e.g. fast page load), fall back to checking for one directly.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || status === "ready") return;
      if (data.session) setStatus("ready");
    });

    // Give the link a few seconds to resolve before calling it invalid.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setStatus((s) => (s === "checking" ? "invalid" : s));
      }
    }, 4000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="size-7" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">MoneyTrail</h1>
        </div>

        {status === "checking" && (
          <div className="surface flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-7 animate-pulse" />
            </span>
            Verifying your reset link…
          </div>
        )}

        {status === "invalid" && (
          <div className="surface flex flex-col items-center p-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Link expired or invalid</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is no longer valid. Request a new one from the sign-in page.
            </p>
            <Button className="mt-6 h-12 w-full" onClick={() => navigate("/auth")}>
              Back to sign in
            </Button>
          </div>
        )}

        {status === "ready" && (
          <div className="surface p-6">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Set a new password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
            <div className="mt-5 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-new-password">Confirm password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  className="h-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <Button className="mt-5 h-12 w-full" onClick={submit} disabled={loading}>
              Update password <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        <SiteFooter />
      </div>
    </div>
  );
}
