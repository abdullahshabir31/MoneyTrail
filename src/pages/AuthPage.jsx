import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, ArrowRight, MailCheck } from "lucide-react";
import {
  supabase,
  getRememberMePreference,
  setRememberMePreference,
} from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AuthPage() {
  useDocumentTitle("Sign in — MoneyTrail Personal Finance Tracker");

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());

  // Once sign-up succeeds and Supabase requires email confirmation, we swap
  // the whole card for a "check your email" screen instead of a toast.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // The Auth page always renders dark, independent of the app's saved
  // Light/Dark preference. The rest of the app toggles the `.dark` class on
  // <html> (see useTheme), and every themed color in this codebase is only
  // wired up to respond to that root-level toggle — so we do the same thing
  // here for the lifetime of this page, then hand control back to whatever
  // the theme system had set (or will set) once the user leaves.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    setRememberMePreference(checked);
  };

  const signIn = async () => {
    setLoading(true);
    setRememberMePreference(rememberMe);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/dashboard");
  };

  const signUp = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    setRememberMePreference(rememberMe);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setConfirmationEmail(email);
      setAwaitingConfirmation(true);
      setResendCooldown(30);
      return;
    }
    toast.success("Account created! You can start tracking now.");
    navigate("/dashboard");
  };

  const resendConfirmation = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Confirmation email resent.");
    setResendCooldown(30);
  };

  const forgot = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent to your email.");
  };

  const google = async () => {
    setRememberMePreference(rememberMe);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error("Google sign-in failed");
    }
    // On success the browser redirects to Google, then back to redirectTo.
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="size-7" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">MoneyTrail</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Know exactly where your money goes — every day, every month.
          </p>
        </div>

        {awaitingConfirmation ? (
          <div className="surface flex flex-col items-center p-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{confirmationEmail}</span>.
              Click it to activate your account, then come back and sign in.
            </p>
            <Button
              variant="outline"
              className="mt-6 h-12 w-full"
              onClick={resendConfirmation}
              disabled={resendCooldown > 0 || resending}
            >
              {resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : "Resend email"}
            </Button>
            <button
              type="button"
              onClick={() => setAwaitingConfirmation(false)}
              className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
        <div className="surface p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5 space-y-4">
              <Field id="in-email" label="Email" value={email} onChange={setEmail} type="email" />
              <Field
                id="in-password"
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={handleRememberMeChange}
                />
                <Label htmlFor="remember-me" className="cursor-pointer text-sm font-normal">
                  Remember me
                </Label>
              </div>
              <Button className="h-12 w-full" onClick={signIn} disabled={loading}>
                Sign in <ArrowRight className="size-4" />
              </Button>
              <button
                type="button"
                onClick={forgot}
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
            </TabsContent>

            <TabsContent value="signup" className="mt-5 space-y-4">
              <Field id="up-name" label="Name" value={name} onChange={setName} />
              <Field id="up-email" label="Email" value={email} onChange={setEmail} type="email" />
              <Field
                id="up-password"
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
              <Field
                id="up-confirm-password"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
              />
              <Button className="h-12 w-full" onClick={signUp} disabled={loading}>
                Create account <ArrowRight className="size-4" />
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="h-12 w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your financial data is private and visible only to you.
        </p>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text" }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12"
      />
    </div>
  );
}
