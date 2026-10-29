"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin"|"signup"|"reset">("signin");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (!isSupabaseConfigured()) throw new Error("Sign-in is temporarily unavailable. Please try again later.");
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + "/auth/callback" } });
        if (error) throw error;
        if (data.session) { router.replace("/"); router.refresh(); }
        else setMessage("Your account was created. If you are not signed in automatically, check your email or try signing in. If the problem continues, contact support.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/"); router.refresh();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + "/auth/callback?next=/auth" });
        if (error) throw error;
        setMessage("If an account exists for this email, a password reset link will arrive shortly.");
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message.toLowerCase() : "";
      if (detail.includes("invalid login") || detail.includes("credentials")) setError("Email or pass  return <main className="auth-shell auth-shell-minimal">
    <aside className="auth-art" aria-hidden="true"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1500&q=85" alt="" /></aside>
    <section className="auth-panel auth-panel-minimal">
      <Link href="/" className="wordmark" aria-label="LOOKU home">looku<span className="dot">.</span></Link>
      <h2>{mode==="signup"?"Create your account":mode==="reset"?"Reset password":"Sign in"}</h2>
      <div className="segmented auth-mode-switch">
        <button type="button" className={mode==="signin"?"active":""} onClick={()=>{setMode("signin");setError("");setMessage("");}}>Sign in</button>
        <button type="button" className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Create account</button>
      </div>
      <form onSubmit={submit}>
        {mode==="signup" && <label className="field">Your name<input className="input" required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Your name"/></label>}
        <label className="field">Email address<input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label>
        {mode!=="reset" && <label className="field">Password<div className="auth-password-field"><input className="input" style={{paddingRight:44}} type={showPassword?"text":"password"} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="Password"/><button type="button" className="auth-password-toggle" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}
        {mode==="signin" && <div className="auth-forgot"><button type="button" className="text-action" onClick={()=>{setMode("reset");setMessage("");setError("");}}>Forgot password?</button></div>}
        {error && <div className="notice" role="alert" style={{marginBottom:14}}>{error}</div>}
        {message && <div className="notice success" role="status" style={{marginBottom:14}}>{message}</div>}
        <button type="submit" disabled={busy||!isSupabaseConfigured()} className="button primary auth-submit">{busy?"Please wait…":mode==="signup"?"Create account":mode==="reset"?"Send reset link":"Sign in"}</button>
      </form>
      {mode==="reset"&&<button className="button ghost auth-reset-back" onClick={()=>setMode("signin")}><ArrowLeft size={14}/> Back to sign in</button>}
    </section>
  </main>;   </form>
      {mode==="reset"&&<button className="button ghost" style={{marginTop:12,width:"100%"}} onClick={()=>setMode("signin")}><ArrowLeft size={14}/> Back to sign in</button>}
      <p className="small muted" style={{marginTop:24,lineHeight:1.7}}>By continuing, you agree to use LOOKU respectfully. Wardrobe photos are private by default; don't upload photographs of other people without permission.</p>
    </section>
  </main>;
}
