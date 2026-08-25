import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Mail, Lock, ArrowRight, Hash, Cake, Link2, Apple } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { isNative } from "@/lib/native";
import DateOfBirthWheel from "@/components/DateOfBirthWheel";



const RESEND_COOLDOWN_SECONDS = 30;

// Returns age in full years given a yyyy-mm-dd string. Returns -1 if invalid.
const calcAge = (dob: string): number => {
  if (!dob) return -1;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

type View = "auth" | "forgot";

const AuthPage = () => {
  const [view, setView] = useState<View>("auth");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // The Apple OAuth handoff (/~oauth/initiate) is served by Lovable hosting, so it
  // only exists on published/preview domains — not the in-editor dev sandbox.
  const appleAuthAvailable = (() => {
    if (isNative()) return true;
    const host = window.location.hostname;
    return host.endsWith(".lovable.app") || host.endsWith("teeneffort.app");
  })();

  const handleAppleSignIn = async () => {
    if (!appleAuthAvailable) {
      toast.error("Apple sign-in only works on the published app, not in the editor preview.");
      return;
    }
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Couldn't sign in with Apple. Please try again.");
        return;
      }
      if (result.redirected) return;
    } catch {
      toast.error("Couldn't sign in with Apple. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!appleAuthAvailable) {
      toast.error("Google sign-in only works on the published app, not in the editor preview.");
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("Couldn't sign in with Google. Please try again.");
        return;
      }
      if (result.redirected) return;
    } catch {
      toast.error("Couldn't sign in with Google. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };


  // Password recovery state

  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Resend cooldowns (seconds remaining)
  const [signupResendIn, setSignupResendIn] = useState(0);
  const [resetResendIn, setResetResendIn] = useState(0);
  // Pending partner invite
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pending-partner-code")) {
      setHasPendingInvite(true);
      setIsSignUp(true);
    }
  }, []);

  useEffect(() => {
    if (signupResendIn <= 0) return;
    const t = setTimeout(() => setSignupResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [signupResendIn]);

  useEffect(() => {
    if (resetResendIn <= 0) return;
    const t = setTimeout(() => setResetResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resetResendIn]);

  const verifyAge = (dobValue: string): boolean => {
    const age = calcAge(dobValue);
    if (age < 0) { toast.error("Please enter a valid date of birth"); return false; }
    if (age < 13) { toast.error("You must be at least 13 years old to use this app."); return false; }
    if (age > 120) { toast.error("Please enter a valid date of birth"); return false; }
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp && !verifyAge(dob)) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { birthday: dob },
          },
        });
        if (error) throw error;
        // Email verification is enabled: signUp returns no session until the
        // user confirms via the 6-digit code (or the link in the same email).
        if (data.session) {
          toast.success("Account created! You're signed in.");
        } else {
          setEmailOtpSent(true);
          setSignupResendIn(RESEND_COOLDOWN_SECONDS);
          toast.success("Check your email for your verification code");
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      const msg = err?.message || "Authentication failed";
      // If the user hasn't verified their email yet, drop them into the OTP flow
      if (/confirm|not confirmed|verify/i.test(msg)) {
        try {
          await supabase.auth.resend({ type: "signup", email });
        } catch {}
        setEmailOtpSent(true);
        setSignupResendIn(RESEND_COOLDOWN_SECONDS);
        toast.info("Please verify your email — we just sent you a new verification code.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length < 6) return toast.error("Please enter the code from your email");
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: emailOtp, type: "signup" });
      if (error) throw error;
      toast.success("Email verified! You're signed in.");
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (signupResendIn > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setSignupResendIn(RESEND_COOLDOWN_SECONDS);
      toast.success("New code sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email first");
    if (resetSent && resetResendIn > 0) return;
    setLoading(true);
    try {
      // resetPasswordForEmail sends an email containing BOTH a magic link and a 6-digit token.
      // We use the 6-digit token to avoid email-scanner prefetch consuming the link.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      setResetResendIn(RESEND_COOLDOWN_SECONDS);
      toast.success("Check your email for a reset code");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length < 6) return toast.error("Enter the code");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: resetCode,
        type: "recovery",
      });
      if (verifyErr) throw verifyErr;
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      toast.success("Password updated! You're signed in.");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-background flex items-center justify-center px-4 safe-area-top">
      <div className="w-full max-w-sm space-y-4 max-h-full overflow-hidden py-2">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Date Planner</h1>
          <p className="text-sm text-muted-foreground">
            {view === "forgot" ? "Reset your password"
              : emailOtpSent ? "Verify your email"
              : isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {hasPendingInvite && view === "auth" && !emailOtpSent && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-start gap-3">
            <Link2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">You've been invited to link up 💕</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {isSignUp
                  ? "Create your account and we'll connect you with your partner automatically."
                  : "Sign in and we'll connect you with your partner automatically."}
              </p>
            </div>
          </div>
        )}

        {/* Forgot Password — step 1: send code */}
        {view === "forgot" && !resetSent && (
          <form onSubmit={handleSendResetCode} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your email and we'll send you a verification code to reset your password.
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Sending…" : "Send reset code"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <button
              type="button"
              onClick={() => { setView("auth"); setResetSent(false); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {/* Forgot Password — step 2: verify code + set new password */}
        {view === "forgot" && resetSent && (
          <form onSubmit={handleVerifyResetCode} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the code sent to <span className="text-foreground font-medium">{email}</span> and choose a new password.
            </p>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Verification code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest text-lg"
                required
                maxLength={8}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
                minLength={6}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Updating…" : "Reset Password"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => { setResetSent(false); setResetCode(""); setNewPassword(""); setConfirmPassword(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Use different email
              </button>
              <button
                type="button"
                onClick={handleSendResetCode as any}
                disabled={loading || resetResendIn > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resetResendIn > 0 ? `Resend in ${resetResendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* Email Form */}
        {view === "auth" && !emailOtpSent && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-wide text-muted-foreground">
                  <Cake className="h-3.5 w-3.5" />
                  Date of birth
                </div>
                <DateOfBirthWheel value={dob} onChange={setDob} />
                <p className="text-[11px] text-muted-foreground px-1">You must be 13 or older to use this app.</p>
              </div>
            )}

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Loading..." : isSignUp ? "Send Verification Code" : "Sign In"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        )}

        {/* Social sign-in */}
        {view === "auth" && !emailOtpSent && appleAuthAvailable && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-11 rounded-xl gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59A14.6 14.6 0 019.77 24c0-1.6.28-3.14.76-4.59l-7.97-6.19A23.94 23.94 0 000 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {googleLoading ? "Connecting..." : isSignUp ? "Sign up with Google" : "Continue with Google"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={appleLoading}
              onClick={handleAppleSignIn}
              className="w-full h-11 rounded-xl gap-2"
            >
              <Apple className="h-4 w-4" />
              {appleLoading ? "Connecting..." : "Continue with Apple"}
            </Button>
          </div>
        )}


        {/* Email OTP Verification */}
        {view === "auth" && emailOtpSent && (
          <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the code sent to <span className="text-foreground font-medium">{email}</span>
            </p>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Verification code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest text-lg"
                required
                maxLength={8}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Verifying..." : "Verify & Continue"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => { setEmailOtpSent(false); setEmailOtp(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={loading || signupResendIn > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {signupResendIn > 0 ? `Resend in ${signupResendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* Toggle sign up / sign in */}
        {view === "auth" && !emailOtpSent && (
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
