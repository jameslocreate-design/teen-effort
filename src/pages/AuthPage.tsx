import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Mail, Lock, ArrowRight, Hash, Cake } from "lucide-react";
import { toast } from "sonner";

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
  // Password recovery state
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { birthday: dob },
          },
        });
        if (error) throw error;
        setEmailOtpSent(true);
        toast.success("We sent a 6-digit code to your email");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length < 6) return toast.error("Please enter the 6-digit code");
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
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
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
    setLoading(true);
    try {
      // resetPasswordForEmail sends an email containing BOTH a magic link and a 6-digit token.
      // We use the 6-digit token to avoid email-scanner prefetch consuming the link.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Check your email for a 6-digit reset code");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length < 6) return toast.error("Enter the 6-digit code");
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center glow-md">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Date Planner</h1>
          <p className="text-sm text-muted-foreground">
            {view === "forgot" ? "Reset your password"
              : emailOtpSent ? "Verify your email"
              : isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* Forgot Password — step 1: send code */}
        {view === "forgot" && !resetSent && (
          <form onSubmit={handleSendResetCode} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your email and we'll send you a 6-digit code to reset your password.
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
              Enter the 6-digit code sent to <span className="text-foreground font-medium">{email}</span> and choose a new password.
            </p>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="6-digit code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest text-lg"
                required
                maxLength={6}
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
                disabled={loading}
                className="text-primary hover:underline"
              >
                Resend code
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
                <div className="relative">
                  <Cake className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Date of birth"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="pl-10 bg-secondary/50 border-border"
                    required
                  />
                </div>
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

        {/* Email OTP Verification */}
        {view === "auth" && emailOtpSent && (
          <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code sent to <span className="text-foreground font-medium">{email}</span>
            </p>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="6-digit code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest text-lg"
                required
                maxLength={6}
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
                disabled={loading}
                className="text-primary hover:underline"
              >
                Resend code
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
