"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Camera, Check, CircleAlert, LoaderCircle, Scan, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Piece={name:string;category:string;colors:string[];description?:string; selected:boolean};
type Scan={pieces:Piece[]};
const CATEGORIES=["Tops","Bottoms","Shoes","Outerwear","Dresses","Swimwear","Accessories","Activewear","Sleepwear","Bags","Other"];
export function ScanOutfit({userId,onImported,onClose}:{userId:string;onImported:()=>Promise<void>;onClose:()=>void}) {
  const [photo,setPhoto]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [pieces,setPieces]=useState<Piece[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [consent,setConsent]=useState(false);
  useEffect(()=>{
    if(!photo){setPreview("");return;}
    const url=URL.createObjectURL(photo);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[photo]);
  async function compactScanImage(file:File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx){bitmap.close();throw new Error("Image processing is not supported on this device.");}
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.78));
    if(!blob||blob.size>3_500_000)throw new Error("Unable to compress the photo below 3.5 MB. Try a smaller picture.");
    return new File([blob],"looku-outfit-scan.jpg",{type:"image/jpeg"});
  }
  async function scan(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!photo||!consent||busy)return;
    setBusy(true);setError("");setMessage("");setPieces([]);
    try {
      if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>10*1024*1024)throw new Error("Choose a JPG, PNG or WebP photo smaller than 10 MB.");
      const compact=await compactScanImage(photo);
      const formData=new FormData();
      formData.append("photo",compact);
      const response=await fetch("/api/ai/analyze-outfit",{method:"POST",body:formData,cache:"no-store"});
      const data=await response.json() as Scan & {error?:string};
      if(!response.ok)throw new Error(data.error||"Could not scan that outfit.");
      if(!Array.isArray(data.pieces)||!data.pieces.length)throw new Error("No clear garments detected. Use Quick Closet or try another photo.");
      setPieces(data.pieces.slice(0,8).map(piece=>({...piece,selected:false})));
      setMessage("Detected "+data.pieces.length+" possible pieces. Review them and tick only the garments you own. LOOKU did not store the scan photo.");
    }catch(e){setError(e instanceof Error?e.message:"Could not scan this outfit. Quick Closet works without AI.");}
    finally{setBusy(false);}
  }
  async function savePieces(){
    if(busy)return;
    const selected=pieces.filter(piece=>piece.selected);
    if(!selected.length){setError("Select only garments you confirm you own.");return;}
    if(selected.some(piece=>!piece.name.trim()||piece.name.length>100||!CATEGORIES.includes(piece.category))){setError("Review each selected name and category.");return;}
    setBusy(true);setError("");
    try{
      const rows=selected.map(piece=>({
        user_id:userId,name:piece.name.trim().slice(0,100),
        category:piece.category,colors:piece.colors.filter(Boolean).slice(0,3),
        formality:5,status:"available",is_owned:true,image_path:null,
        attributes:{source:"single-outfit-photo-detection",user_confirmed_ownership:true,photo_retained:false,visual_description:piece.description||""}
      }));
      const {error:dbError}=await createClient().from("wardrobe_items").insert(rows);
      if(dbError)throw dbError;
      await onImported();
      setPieces([]);setMessage("Added "+selected.length+" confirmed pieces. The scan photo was not retained.");
    }catch(e){setError(e instanceof Error?e.message:"Couldn't save your pieces.");}
    finally{setBusy(false);}
  }
  return <section className="surface section" style={{padding:20}}>
    <div className="row" style={{alignItems:"start"}}><div><span className="eyebrow">ONE PHOTO → SEVERAL CLOTHES</span><h2 className="section-title">Scan a mirror selfie or outfit photo.</h2><p className="section-note">LOOKU attempts to recognize multiple garments from one photo. Review the results and confirm ownership. This needs working AI image analysis; Quick Closet stays available without it.</p></div><button type="button" className="button compact" aria-label="Close outfit scanner" onClick={onClose}><X size={16}/></button></div>
    <form onSubmit={scan}>
      {preview&&<img src={preview} alt="Your outfit scan preview" style={{maxHeight:220,objectFit:"contain",borderRadius:12,margin:"15px 0"}}/>}
      <label className="field" style={{marginTop:15}}>One outfit photo
        <input className="input" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>{setPhoto(e.target.files?.[0]||null);setPieces([]);setError("");}}/>
      </label>
      <label className="row" style={{justifyContent:"start",marginTop:14}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span className="small">I agree to send a resized copy of this image to the configured AI provider. LOOKU processes the request in memory without saving the scan photo.</span></label>
      <button className="button primary" type="submit" disabled={!photo||!consent||busy} style={{marginTop:14}}>{busy?<LoaderCircle size={14}/>:<Scan size={14}/>} {busy?"Analyzing…":"Identify clothes in this photo"}</button>
    </form>
    {message&&<div className="privacy-banner" role="status" style={{marginTop:14}}><ShieldCheck size={16}/>{message}</div>}
    {error&&<div className="notice" role="alert" style={{marginTop:14}}><CircleAlert size={16}/>{error}</div>}
    {pieces.length>0&&<div style={{marginTop:18}}><h3 style={{fontSize:16}}>Confirm your clothes</h3><p className="small muted">Detected garments are not saved or assumed to be yours. Choose only what you own. No cropped garment images are fabricated.</p>
      <div className="stack">{pieces.map((piece,index)=><div className="surface soft" key={index} style={{padding:12}}>
        <label className="row" style={{justifyContent:"start",marginBottom:10}}><input type="checkbox" checked={piece.selected} onChange={e=>setPieces(old=>old.map((x,i)=>i===index?{...x,selected:e.target.checked}:x))}/><strong className="small">I own this garment</strong></label>
        <div className="twocol">
          <label className="field">Garment name<input className="input" value={piece.name} maxLength={100} onChange={e=>setPieces(old=>old.map((x,i)=>i===index?{...x,name:e.target.value}:x))}/></label>
          <label className="field">Category<select className="input" value={piece.category} onChange={e=>setPieces(old=>old.map((x,i)=>i===index?{...x,category:e.target.value}:x))}>{CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}</select></label>
        </div>
        <label className="field">Color<input className="input" value={piece.colors.join(", ")} onChange={e=>setPieces(old=>old.map((x,i)=>i===index?{...x,colors:e.target.value.split(",").map(c=>c.trim()).filter(Boolean).slice(0,3)}:x))}/></label>
      </div>)}</div>
      <button className="button primary" disabled={busy||!pieces.some(p=>p.selected)} onClick={()=>void savePieces()} style={{marginTop:14}}><Check size={14}/>Save confirmed clothes</button>
    </div>}
  </section>;
}
