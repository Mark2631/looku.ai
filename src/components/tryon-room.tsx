"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, LockKeyhole, ScanFace, Sparkles, Upload, WandSparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Garment = {
  id: string;
  name: string;
  category: string;
  status: "available" | "laundry" | "retired";
  is_owned: boolean;
  image_url?: string | null;
};
type JobResult = { jobId: string; status: string; resultUrl?: string | null; error?: string; message?: string; creditsUsed?: number | null };

export function TryOnRoom({ userId, items, configured }: { userId: string; items: Garment[]; configured: boolean }) {
  const [garmentId, setGarmentId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  const available = items.filter(item => item.is_owned && item.status === "available" && item.image_url);
  const selected = available.find(item => item.id === garmentId) || null;

  useEffect(() => {
    if (!photo) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function checkJob(id: string): Promise<JobResult> {
    const response = await fetch("/api/tryon/" + encodeURIComponent(id), { cache: "no-store" });
    const data = await response.json() as JobResult;
    if (!response.ok && response.status !== 202) throw new Error(data.error || "Could not check the try-on job.");
    return data;
  }

  async function pollUntilDone(id: string) {
    for (let attempt = 0; attempt < 26; attempt++) {
      const current = await checkJob(id);
      setStatus(current.status);
      if (current.status === "completed" && current.resultUrl) {
        setResultUrl(current.resultUrl);
        setCredits(current.creditsUsed ?? null);
        setStatus("completed");
        return;
      }
      if (current.status === "failed") throw new Error(current.error || "The fitting-room job failed.");
      await new Promise(resolve => window.setTimeout(resolve, 3000));
    }
    setStatus("processing");
    setError("This job is still processing. Keep this page open and use “Check result” to resume polling; the provider job remains associated with your account.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResultUrl("");
    setCredits(null);
    if (!configured) { setError("The FASHN provider is not configured yet. No photo was uploaded or sent."); return; }
    if (!selected) { setError("Choose an available garment with an image."); return; }
    if (!photo) { setError("Choose a clear photo of yourself."); return; }
    if (!["image/jpeg","image/png","image/webp"].includes(photo.type) || photo.size > 10 * 1024 * 1024) {
      setError("Use a JPG, PNG or WebP photo smaller than 10 MB.");
      return;
    }
    setBusy(true);
    setStatus("uploading");
    let uploadedPath = "";
    try {
      const supabase = createClient();
      uploadedPath = userId + "/tryon/" + crypto.randomUUID() + "-" + photo.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-80);
      const { error: uploadError } = await supabase.storage.from("wardrobe-private").upload(uploadedPath, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      setStatus("starting");
      const response = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardrobeItemId: selected.id, modelImagePath: uploadedPath, prompt: prompt.trim() }),
      });
      const data = await response.json() as { jobId?: string; status?: string; error?: string };
      if (!response.ok || !data.jobId) throw new Error(data.error || "Couldn't start the virtual fitting.");
      setJobId(data.jobId);
      setStatus(data.status || "queued");
      await pollUntilDone(data.jobId);
    } catch (caught) {
      setStatus("failed");
      setError(caught instanceof Error ? caught.message : "The fitting-room request failed.");
      if (uploadedPath) {
        try { await createClient().storage.from("wardrobe-private").remove([uploadedPath]); } catch { /* User can remove leftover private files through account data deletion. */ }
      }
    } finally { setBusy(false); }
  }

  async function resume() {
    if (!jobId || busy) return;
    setError("");
    setBusy(true);
    try { await pollUntilDone(jobId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not retrieve the result."); }
    finally { setBusy(false); }
  }

  return <>
    <div><span className="eyebrow">SEE A GARMENT ON YOU</span><h1 className="page-title serif">Virtual fitting room.</h1><p className="page-subtitle">Preview one of your own garments on a personal photo. This is a visual styling aid—not a sizing tool and not a guarantee of how the real garment will fit.</p></div>

    {!configured && <div className="notice section"><CircleAlert size={16} style={{display:"inline",verticalAlign:"middle",marginRight:7}}/><strong>Provider setup required.</strong> The FASHN API key is not configured. You can explore this workflow, but LOOKU will not upload or send your photo until the integration is active.</div>}

    <div className="stylist-layout section">
      <form className="surface" onSubmit={submit}>
        <span className="eyebrow">CREATE A PREVIEW</span>
        <label className="field" style={{marginTop:16}}>Choose an available garment<select className="input" value={garmentId} onChange={e=>setGarmentId(e.target.value)} required><option value="">Select from your closet…</option>{available.map(item=><option value={item.id} key={item.id}>{item.name} · {item.category}</option>)}</select></label>
        {selected && <div className="outfit-row" style={{marginBottom:15}}>{selected.image_url&&<img src={selected.image_url} alt={selected.name}/>}<div><strong>{selected.name}</strong><small>{selected.category} · Your wardrobe</small></div><CheckCircle2 size={16} color="#66775e"/></div>}
        <label className="field">A clear photo of yourself<div className="upload-box"><Camera/><strong style={{display:"block",fontSize:12}}>Choose your photo</strong><small>Front-facing, good light, one person · JPG, PNG or WebP under 10 MB</small><input id="tryon-person-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setPhoto(e.target.files?.[0]||null);setError("");}}/><label className="button compact" htmlFor="tryon-person-photo" style={{marginTop:12}}><Upload size={13}/>Browse photo</label></div></label>
        {photoPreview&&<div className="surface soft" style={{padding:12,marginBottom:14,boxShadow:"none"}}><img src={photoPreview} alt="Your selected try-on photo preview" style={{width:"100%",maxHeight:350,objectFit:"contain",borderRadius:12}}/><button type="button" className="text-action" style={{marginTop:10}} onClick={()=>setPhoto(null)}>Remove photo</button></div>}
        <label className="field">Styling instruction (optional)<input className="input" value={prompt} maxLength={180} onChange={e=>setPrompt(e.target.value)} placeholder="e.g. keep the shirt untucked"/></label>
        <div className="privacy-banner" style={{marginBottom:16}}><LockKeyhole/><span>When you start, LOOKU sends the selected garment image and your chosen personal photo to FASHN for processing. The result is saved to your private LOOKU storage. Never upload someone else's photo without their permission.</span></div>
        {error&&<div style={{marginBottom:13}}><div className="notice" role="alert">{error}</div></div>}
        <button type="submit" className="button primary" style={{width:"100%"}} disabled={busy||!configured||!selected||!photo}>
          {busy?<><LoaderCircle size={15} className="spin-icon"/>Working…</>:<><WandSparkles size={15}/>Generate try-on preview</>}
        </button>
        <p className="tiny muted" style={{lineHeight:1.6,marginTop:12}}>Limited to two generations per account per day. The API uses paid credits; configure a provider key and purchase credits before enabling the feature.</p>
      </form>

      <aside className="stack">
        <div className="surface soft">
          <span className="eyebrow">WHAT THIS DOES</span>
          <h2 className="section-title" style={{marginTop:10}}>Visualise, then decide.</h2>
          <p className="small muted" style={{lineHeight:1.75,marginTop:9}}>LOOKU sends one selected garment and one user-provided photo to the configured try-on provider. If generation succeeds, the private result is accessible to your account only.</p>
          <div className="divider"/>
          <div className="row"><span className="small">Input image</span><span className="badge neutral">Private upload</span></div>
          <div className="row" style={{marginTop:10}}><span className="small">Provider work</span><span className="badge neutral">On demand</span></div>
          <div className="row" style={{marginTop:10}}><span className="small">Daily allowance</span><span className="badge">2 generations</span></div>
        </div>
        <div className="surface">
          <span className="eyebrow">PROVIDER & PRIVACY</span>
          <h3 style={{fontSize:16,fontWeight:500,margin:"10px 0 8px"}}>FASHN AI</h3>
          <p className="small muted" style={{lineHeight:1.7}}>The provider requires an API key and prepaid credits. Review current pricing, input handling and retention rules before enabling the integration.</p>
          <div className="tool-row"><a className="button compact" href="https://docs.fashn.ai/api-reference/tryon-max" target="_blank" rel="noreferrer">API documentation <ExternalLink size={12}/></a><a className="button compact" href="https://docs.fashn.ai/api-overview/data-retention" target="_blank" rel="noreferrer">Data retention <ExternalLink size={12}/></a></div>
        </div>
        {status&&<div className="surface"><span className="eyebrow">LATEST JOB</span><div className="row" style={{marginTop:10}}><strong style={{fontSize:13}}>{status==="completed"?"Preview ready":status==="failed"?"Generation failed":status==="uploading"?"Uploading securely…":status==="starting"?"Starting provider job…":status==="queued"?"In queue":status==="processing"?"Generating preview…":"Job status"}</strong><span className="badge neutral">{status}</span></div>{jobId&&<p className="tiny muted" style={{marginTop:8}}>Job ID: {jobId}</p>}{status!=="completed"&&status!=="failed"&&jobId&&!busy&&<button className="button compact" style={{marginTop:10}} onClick={()=>void resume()}>Check result</button>}</div>}
      </aside>
    </div>

    {resultUrl&&<section className="section"><div className="section-head"><div><span className="eyebrow">YOUR PRIVATE PREVIEW</span><h2 className="section-title">The look, visualised.</h2><p className="section-note">This generated image is saved privately. AI imagery can alter garment details; it does not validate sizing, comfort or fabric quality.</p></div></div><div className="surface"><img src={resultUrl} alt="AI-generated virtual try-on preview" style={{width:"100%",maxHeight:800,objectFit:"contain",borderRadius:12,background:"#eeeae2"}}/>{credits!==null&&<p className="tiny muted" style={{marginTop:10}}>Provider reported {credits} credit(s) used for this job.</p>}</div></section>}
  </>;
}
