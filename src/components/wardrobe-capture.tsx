"use client";

import { useState, type FormEvent } from "react";
import { Camera, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { name: string; category: string; colors: string[] };
function parseLine(line: string): Item | null {
  const name = line.trim().replace(/^[-*•\d.)\s]+/,"").slice(0,100);
  if (!name) return null;
  const lower = name.toLowerCase();
  const category = /sneaker|shoe|boot|heel|loafer|sandal|trainer/.test(lower) ? "Shoes"
    : /jean|trouser|pant|short|skirt|legging/.test(lower) ? "Bottoms"
    : /dress|gown/.test(lower) ? "Dresses"
    : /jacket|hoodie|coat|blazer|cardigan/.test(lower) ? "Outerwear"
    : /backpack|handbag|tote|bag/.test(lower) ? "Bags"
    : /watch|belt|hat|cap|earring|necklace|bracelet/.test(lower) ? "Accessories"
    : /swimsuit|bikini|swim shorts/.test(lower) ? "Swimwear"
    : /sports bra|gym|workout/.test(lower) ? "Activewear"
    : /pajama|pyjama|sleepwear/.test(lower) ? "Sleepwear"
    : /shirt|tee|t-shirt|top|blouse|polo|sweater/.test(lower) ? "Tops" : "Other";
  const colors = ["black","white","blue","navy","green","red","pink","brown","beige","cream","yellow","grey","gray","purple","orange"].filter(color=>new RegExp("\\b"+color+"\\b").test(lower)).slice(0,3);
  return {name,category,colors};
}

export function WardrobeCapture({userId,onImported,onScan}: {userId:string;onImported:()=>Promise<void>;onScan:()=>void}) {
  const [description,setDescription] = useState("");
  const [confirmed,setConfirmed] = useState(false);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const entries = Array.from(new Map(description.split(/\r?\n/).map(parseLine).filter((x):x is Item=>x!==null).map(x=>[x.name.toLowerCase(),x])).values()).slice(0,25);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!confirmed||!entries.length||saving)return;
    setSaving(true);setMessage("");
    try {
      const {error}=await createClient().from("wardrobe_items").insert(entries.map(entry=>({
        user_id:userId,name:entry.name,category:entry.category,colors:entry.colors,formality:5,
        status:"available",is_owned:true,image_path:null,
        attributes:{source:"natural_language_batch",user_confirmed_ownership:true,category_inferred:true}
      })));
      if(error)throw error;
      setDescription("");setConfirmed(false);
      await onImported();
      setMessage("Saved "+entries.length+" pieces. Review inferred categories whenever you like.");
    }catch(error){setMessage(error instanceof Error?error.message:"Couldn't save your wardrobe description.");}
    finally{setSaving(false);}
  }
  return <section className="surface section capture-surface">
    <div><span className="eyebrow">NO CATALOGUE. NO HOMEWORK.</span><h2 className="section-title">Your wardrobe, your way.</h2><p className="section-note">One photo can identify several garments. Or describe a few things you own in your own words — no scrolling through hundreds of clothing types.</p></div>
    <div className="capture-options"><button type="button" className="button primary" onClick={onScan}><Camera size={16}/>Scan an outfit photo</button><span className="small muted">or add a few by describing them below</span></div>
    <form onSubmit={save}>
      <label className="field">A few clothes you already own (one per line)
        <textarea className="input textarea" rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder={"Black jeans\nWhite sneakers\nCream hoodie"} maxLength={2600}/>
      </label>
      {entries.length>0&&<div className="capture-preview"><span className="tiny muted">{entries.length} pieces detected. Categories are guesses that you can edit later.</span><div className="tool-row">{entries.slice(0,6).map((entry,index)=><span key={index} className="tag">{entry.name} · {entry.category}</span>)}{entries.length>6&&<span className="tag">+{entries.length-6} more</span>}</div></div>}
      <label className="capture-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I confirm these are clothes I own. Nothing is added without my confirmation.</span></label>
      <button type="submit" className="button" disabled={saving||!confirmed||!entries.length}>{saving?<LoaderCircle size={15}/>:<Plus size={15}/>} {saving?"Saving…":"Add to my wardrobe"}</button>
    </form>
    <p className="tiny muted" style={{marginTop:13}}><ShieldCheck size={13} style={{display:"inline",verticalAlign:"middle"}}/> Only your account can access your saved collection.</p>
    {message&&<p role="status" className="small muted">{message}</p>}
  </section>;
}
