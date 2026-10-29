"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (!isSupabaseConfigured()) throw new Error("Sign-in is temporarily unavailable. Please try again later.");
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + "/auth/callback",
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Account created. Check your email to finish signing in.");
        }
      } else if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.replace("/");
        router.refresh();
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + "/auth/callback?next=/auth",
        });
        if (resetError) throw resetError;
        setMessage("If that email has an account, a reset link will arrive shortly.");
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message.toLowerCase() : "";
      if (detail.includes("invalid login") || detail.includes("credentials")) setError("Email or password is incorrect.");
      else if (detail.includes("already registered") || detail.includes("already been registered")) setError("An account with this email already exists.");
      else if (detail.includes("password") && detail.includes("least")) setError("Choose a stronger password and try again.");
      else setError(err instanceof Error ? err.message : "Could not complete that action. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell auth-shell-minimal">
      <aside className="auth-art" aria-hidden="true">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1500&q=85" alt="" />
      </aside>
      <section className="auth-panel auth-panel-minimal">
        <Link href="/" className="wordmark" aria-label="LOOKU home">looku<span className="dot">.</span></Link>
        <h2>{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Sign in"}</h2>
        <div className="segmented auth-mode-switch">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">Your name
              <input className="input" required value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name" />
            </label>
          )}
          <label className="field">Email address
            <input className="input" type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />
          </label>
          {mode !== "reset" && (
            <label className="field">Password
              <div className="auth-password-field">
                <input className="input" style={{ paddingRight: 44 }} type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Password" />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}
          {mode === "signin" && (
            <div className="auth-forgot">
              <button type="button" className="text-action" onClick={() => { setMode("reset"); setMessage(""); setError(""); }}>Forgot password?</button>
            </div>
          )}
          {error && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
          {message && <div className="notice success" role="status" style={{ marginBottom: 14 }}>{message}</div>}
          <button type="submit" disabled={busy || !isSupabaseConfigured()} className="button primary auth-submit">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
          </button>
        </form>
        {mode === "reset" && (
          <button className="button ghost auth-reset-back" onClick={() => setMode("signin")}>
            <ArrowLeft size={14} /> Back to sign in
          </button>
        )}
      </section>
    </main>
  );
}
