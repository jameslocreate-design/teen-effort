import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Mail, Lock, ArrowRight, Phone, Hash, Cake } from "lucide-react";
import { toast } from "sonner";

type AuthMethod = "email" | "phone";

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

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compliance: COPPA requires we do not collect data from children under 13.
  // We gate BEFORE calling supabase.auth.signUp so no account or profile row is created.
  const verifyAge = (dobValue: string): boolean => {
    const age = calcAge(dobValue);
    if (age < 0) {
      toast.error("Please enter a valid date of birth");
      return false;
    }
    if (age < 13) {
      toast.error("You must be at least 13 years old to use this app.");
      return false;
    }
    if (age > 120) {
      toast.error("Please enter a valid date of birth");
      return false;
    }
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
        toast.success("Check your email to confirm your account!");
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

  const formatPhone = (value: string) => {
    // Only allow digits and +
    const cleaned = value.replace(/[^\d+]/g, "");
    // Auto-prepend +1 for US numbers if no country code
    if (cleaned && !cleaned.startsWith("+")) {
      return "+1" + cleaned;
    }
    return cleaned;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !verifyAge(dob)) return;
    const formatted = formatPhone(phone);
    if (formatted.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: isSignUp ? { data: { birthday: dob } } : undefined,
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Verification code sent to your phone!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formatPhone(phone),
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      toast.success("Signed in successfully!");
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
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
            {authMethod === "phone"
              ? otpSent ? "Enter the code we sent" : "Sign in with your phone"
              : isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex rounded-xl bg-secondary/50 p-1 gap-1">
          <button
            onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              authMethod === "email"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
          <button
            onClick={() => { setAuthMethod("phone"); setOtpSent(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              authMethod === "phone"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="h-4 w-4" /> Phone
          </button>
        </div>

        {/* Email Form */}
        {authMethod === "email" && (
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
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        )}

        {/* Phone Form */}
        {authMethod === "phone" && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Phone number (e.g. 5551234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">US numbers auto-add +1. For other countries, include your country code (e.g. +44).</p>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Sending..." : "Send Verification Code"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        )}

        {authMethod === "phone" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-10 bg-secondary/50 border-border text-center tracking-widest text-lg"
                required
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading ? "Verifying..." : "Verify & Sign In"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Change phone number
            </button>
          </form>
        )}

        {/* Toggle sign up / sign in (email only) */}
        {authMethod === "email" && (
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
