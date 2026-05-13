"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import { Brain, ArrowRight, Loader2, Mail, ShieldCheck, Timer, ChevronLeft, User, Lock } from "lucide-react";

export default function AuthCard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  async function handleInitialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const emailVal = String(formData.get("email") || "").trim().toLowerCase();
    const passwordVal = String(formData.get("password") || "").trim();
    const nameVal = String(formData.get("fullName") || "").trim();
    
    setEmail(emailVal);
    setFullName(nameVal);
    setPassword(passwordVal);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailVal,
          password: passwordVal,
        });

        if (error) throw error;

        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh();
      } else {
        // Hybrid Signup: Use OTP for verification, then set password
        const { error } = await supabase.auth.signInWithOtp({
          email: emailVal,
          options: {
            shouldCreateUser: true,
            data: { full_name: nameVal }
          },
        });

        if (error) throw error;

        setPassword(passwordVal); 
        
        toast.success("Verification code sent to your email!");
        setStep("otp");
        setTimer(60);
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Automatically set password for new accounts after OTP success
        if (mode === "signup" && password) {
          await supabase.auth.updateUser({
            password: password,
          });
        }

        toast.success(mode === "signup" ? "Account created successfully!" : "Welcome back!");
        
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 500);
      } else {
        throw new Error("Verification successful but no session created.");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass w-full max-w-md rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden animate-slide-up shadow-2xl shadow-primary/5 border border-white/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      
      <div className="flex justify-center mb-8">
        <div className="h-16 w-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary shadow-inner">
          <Brain className="h-8 w-8" />
        </div>
      </div>
      
      {step === "form" ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {mode === "login" 
                ? "Sign in securely with Email OTP." 
                : "Enter your details to receive an OTP."}
            </p>
          </div>

          <div className="flex p-1 bg-muted/50 rounded-2xl mb-8">
            <button 
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              LOGIN
            </button>
            <button 
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'signup' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              SIGNUP
            </button>
          </div>

          <form onSubmit={handleInitialSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-[0.2em]">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/50 pl-11 pr-4 py-3.5 focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm outline-none font-medium"
                    name="fullName"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-[0.2em]">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  className="w-full rounded-2xl border border-border/60 bg-background/50 pl-11 pr-4 py-3.5 focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm outline-none font-medium"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-[0.2em]">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  className="w-full rounded-2xl border border-border/60 bg-background/50 pl-11 pr-4 py-3.5 focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm outline-none font-medium"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button 
              disabled={loading} 
              className="w-full mt-4 rounded-2xl bg-primary px-4 py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 group"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</>
              ) : (
                <>{mode === "login" ? "Get Login OTP" : "Get Signup OTP"} <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" /> Verify OTP
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              We've sent a <span className="text-foreground font-bold">6-digit</span> code to <br />
              <span className="text-foreground font-bold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-[0.2em]">
                Verification Code
              </label>
              <input
                className="w-full text-center text-3xl tracking-[0.3em] font-black rounded-2xl border border-border/60 bg-background/50 px-4 py-5 focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <button 
              disabled={loading || otp.length < 6}
              className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Continue"}
            </button>

            <div className="flex flex-col items-center gap-4 pt-2">
              <button 
                type="button"
                onClick={async () => {
                  if (timer > 0) return;
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithOtp({
                      email: email,
                    });
                    if (error) throw error;
                    toast.success("New 6-digit OTP sent!");
                    setTimer(60);
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={timer > 0 || loading}
                className="text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline transition-all flex items-center gap-2"
              >
                {timer > 0 ? (
                  <>Resend in {timer}s</>
                ) : (
                  "Didn't get a code? Resend"
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep("form")}
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Change email
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-10 text-center border-t border-white/10 pt-6">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black opacity-40">
          Secure StudyFlow AI Access
        </p>
      </div>
    </div>
  );
}







