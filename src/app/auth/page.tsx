"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
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
      if (!isSupabaseConfigured()) throw new Error("LOOKU authentication is waiting for the secure backend to be connected.");
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
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <aside className="auth-art"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1500&q=85" alt="Fashion editorial" /><div className="auth-art-copy"><div className="eyebrow" style={{color:"#fff"}}>PERSONAL STYLE, WITHOUT THE NOISE</div><h1>Make room for<br/>your kind of style.</h1><p style={{fontSize:13,maxWidth:370,lineHeight:1.7}}>Your real wardrobe. Thoughtful suggestions. More confident mornings.</p></div></aside>
    <section className="auth-panel">
      <Link href="/" className="wordmark" aria-label="LOOKU home">looku<span className="dot">.</span></Link>
      <p className="tagline">YOUR STYLE, UNDERSTOOD.</p>
      <h2>{mode==="signup"?"Make this space yours.":mode==="reset"?"A fresh start.":"Welcome back."}</h2>
      <p className="auth-desc">{mode==="signup"?"Create your personal style space. Your wardrobe is private by default.":mode==="reset"?"We'll send a secure password reset link to your email.":"Your wardrobe and next look are waiting."}</p>
      {!isSupabaseConfigured() && <div className="notice">Secure account services are being connected. Sign-in will be available once backend setup is complete.</div>}
      <div className="segmented" style={{marginTop:18}}><button className={mode==="signin"?"active":""} onClick={()=>{setMode("signin");setError("");setMessage("");}}>Sign in</button><button className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Create account</button></div>
      <form onSubmit={submit}>
        {mode==="signup" && <label className="field">Your name<input className="input" required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="How should we address you?"/></label>}
        <label className="field">Email address<div style={{position:"relative"}}><Mail size={16} style={{position:"absolute",left:13,top:14,color:"#8a8a80"}}/><input className="input" style={{paddingLeft:39}} type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></div></label>
        {mode!=="reset" && <label className="field">Password<div style={{position:"relative"}}><LockKeyhole size={16} style={{position:"absolute",left:13,top:14,color:"#8a8a80"}}/><input className="input" style={{paddingLeft:39,paddingRight:42}} type={showPassword?"text":"password"} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} style={{position:"absolute",right:10,top:10,border:0,background:"transparent",padding:5,color:"#777"}} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}
        {mode==="signin" && <div style={{textAlign:"right",margin:"-3px 0 18px"}}><button type="button" className="text-action" onClick={()=>{setMode("reset");setMessage("");setError("");}}>Forgot password?</button></div>}
        {error && <div className="notice" role="alert" style={{marginBottom:14}}>{error}</div>}
        {message && <div className="notice success" role="status" style={{marginBottom:14}}><Check size={15} style={{display:"inline",marginRight:6,verticalAlign:"middle"}}/>{message}</div>}
        <button type="submit" disabled={busy||!isSupabaseConfigured()} className="button primary" style={{width:"100%",minHeight:48}}>{busy?"Please wait…":mode==="signup"?"Create my account":mode==="reset"?"Send reset link":"Sign in"} {!busy&&<Sparkles size={15}/>}</button>
      </form>
      {mode==="reset"&&<button className="button ghost" style={{marginTop:12,width:"100%"}} onClick={()=>setMode("signin")}><ArrowLeft size={14}/> Back to sign in</button>}
      <p className="small muted" style={{marginTop:24,lineHeight:1.7}}>By continuing, you agree to use LOOKU respectfully. Wardrobe photos are private by default; don't upload photographs of other people without permission.</p>
    </section>
  </main>;
}
