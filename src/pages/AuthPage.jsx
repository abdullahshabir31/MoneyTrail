import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, ArrowRight, MailCheck, KeyRound, ArrowLeft } from "lucide-react";
import {
  supabase,
  getRememberMePreference,
  setRememberMePreference,
} from "@/integrations/supabase/client";
import { checkEmailExists } from "@/services/accountService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteFooter } from "@/components/Bits";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Which card is shown inside the auth shell. "auth" is the normal
// sign-in/sign-up tabs; the others are full-card takeovers.
const SCREEN = {
  AUTH: "auth",
  CONFIRM_SIGNUP: "confirmSignup",
  FORGOT_FORM: "forgotForm",
  FORGOT_SENT: "forgotSent",
};

export default function AuthPage() {
  useDocumentTitle("Sign in — MoneyTrail Personal Finance Tracker");

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());

  const [screen, setScreen] = useState(SCREEN.AUTH);

  // Sign-up "check your email" screen state.
  const [confirmationEmail, setConfirmationEmail] = useState("");

  // Forgot-password screen state (kept separate from the sign-in email
  // field so switching screens never clobbers what the user typed).
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Shared 30-second resend cooldown, reused by both the sign-up
  // confirmation resend and the password-reset resend.
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
      setResendCooldown(30);
      setScreen(SCREEN.CONFIRM_SIGNUP);
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

  const openForgotPassword = () => {
    setResetEmail(email); // pre-fill with whatever they'd typed on the sign-in tab
    setScreen(SCREEN.FORGOT_FORM);
  };

  const sendResetLink = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter your email first");
      return;
    }
    setResetLoading(true);
    try {
      const exists = await checkEmailExists(resetEmail.trim());
      if (!exists) {
        toast.error("No account found with that email.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setResendCooldown(30);
      setScreen(SCREEN.FORGOT_SENT);
    } catch (err) {
      toast.error(err.message || "Couldn't check that email right now. Try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const resendResetLink = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reset link resent.");
    setResendCooldown(30);
  };

  const backToSignIn = () => setScreen(SCREEN.AUTH);

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

        {screen === SCREEN.CONFIRM_SIGNUP && (
          <div className="surface flex flex-col items-center p-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{confirmationEmail}</span>. Click it to
              activate your account, then come back and sign in.
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
              onClick={backToSignIn}
              className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}

        {screen === SCREEN.FORGOT_FORM && (
          <div className="surface p-6">
            <button
              type="button"
              onClick={backToSignIn}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to sign in
            </button>
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Reset your password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email on your account and we'll send you a link to set a new password.
            </p>
            <div className="mt-5">
              <Field
                id="reset-email"
                label="Email"
                value={resetEmail}
                onChange={setResetEmail}
                type="email"
                name="email"
                autoComplete="email"
              />
            </div>
            <Button className="mt-5 h-12 w-full" onClick={sendResetLink} disabled={resetLoading}>
              Send reset link <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {screen === SCREEN.FORGOT_SENT && (
          <div className="surface flex flex-col items-center p-6 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to{" "}
              <span className="font-medium text-foreground">{resetEmail}</span>. Open it to choose a
              new password.
            </p>
            <Button
              variant="outline"
              className="mt-6 h-12 w-full"
              onClick={resendResetLink}
              disabled={resendCooldown > 0 || resending}
            >
              {resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : "Resend email"}
            </Button>
            <button
              type="button"
              onClick={backToSignIn}
              className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}

        {screen === SCREEN.AUTH && (
          <div className="surface p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5 space-y-4">
                <Field
                  id="in-email"
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  name="email"
                  autoComplete="email"
                />
                <Field
                  id="in-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  name="password"
                  autoComplete="current-password"
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
                  onClick={openForgotPassword}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </TabsContent>

              <TabsContent value="signup" className="mt-5 space-y-4">
                <Field
                  id="up-name"
                  label="Name"
                  value={name}
                  onChange={setName}
                  name="name"
                  autoComplete="name"
                />
                <Field
                  id="up-email"
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  name="email"
                  autoComplete="email"
                />
                <Field
                  id="up-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                />
                <Field
                  id="up-confirm-password"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  name="confirm-password"
                  autoComplete="new-password"
                />
                <Button className="h-12 w-full" onClick={signUp} disabled={loading}>
                  Create account <ArrowRight className="size-4" />
                </Button>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="h-12 w-full" onClick={google}>
              Continue with Google
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your financial data is private and visible only to you.
        </p>
        <SiteFooter />
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", name, autoComplete }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12"
        // `name` + `autoComplete` are what tell the browser/password manager
        // what each field is for — without them Chrome won't reliably offer
        // autofill or "Suggest strong password" on the signup password field.
        name={name}
        autoComplete={autoComplete}
      />
    </div>
  );
}
