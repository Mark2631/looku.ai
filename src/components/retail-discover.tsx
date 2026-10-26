"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Heart, Search, ShieldCheck, ShoppingBag, Store, Tag } from "lucide-react";

type Source = {
  id: string; name: string; website: string; categories: string[]; country_code: string[];
  public_evidence: string; relationship_status: string;
};
type Item = { category: string; status: string; is_owned: boolean };
const CATEGORIES = ["All stores","Clothing","Shoes","Accessories","Bags","Kenyan design"] as const;
const MATCHES: Record<string,string[]> = {
  "Clothing": ["clothing","fashion","womenswear","apparel"],
  "Shoes": ["footwear","shoes"],
  "Accessories": ["accessories"],
  "Bags": ["bags"],
  "Kenyan design": ["local-design","locally-designed","local-designers","made-in-kenya"],
};

export function RetailDiscover({
  wardrobe, style, onSaveWishlist,
}: {
  wardrobe: Item[];
  style: string;
  onSaveWishlist: (title:string,url:string,note:string)=>Promise<boolean>;
}) {
  const [sources,setSources] = useState<Source[]>([]);
  const [filter,setFilter] = useState<string>("All stores");
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(true);
  const [itemName,setItemName] = useState("");
  const [itemUrl,setItemUrl] = useState("");
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/style/merchant-sources",{cache:"no-store"}).then(async r=>{
      if(!r.ok)throw new Error("Store discovery is temporarily unavailable.");
      return r.json();
    }).then(data=>{if(active)setSources(data.sources||[]);}).catch(()=>{if(active)setMessage("Store discovery is temporarily unavailable.");}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  const ownedCategories=useMemo(()=>new Set(wardrobe.filter(i=>i.is_owned&&i.status==="available").map(i=>i.category)),[wardrobe]);
  const suggest=useMemo(()=> {
    const gaps:string[]=[];
    if(!ownedCategories.has("Dresses")&&(!ownedCategories.has("Tops")||!ownedCategories.has("Bottoms")))gaps.push("Clothing");
    if(!ownedCategories.has("Shoes"))gaps.push("Shoes");
    return gaps;
  },[ownedCategories]);
  const visible=useMemo(()=>sources.filter(source=>{
    const tags=source.categories.join(" ").toLowerCase();
    const term=query.trim().toLowerCase();
    const matchesFilter=filter==="All stores"||(MATCHES[filter]||[]).some(t=>tags.includes(t));
    const matchesQuery=!term||source.name.toLowerCase().includes(term)||tags.includes(term);
    return matchesFilter&&matchesQuery;
  }),[sources,filter,query]);

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");setSaving(true);
    try {
      const parsed=new URL(itemUrl);
      if(parsed.protocol!=="https:")throw new Error("Use a valid HTTPS product page URL.");
      const ok=await onSaveWishlist(itemName.trim(),parsed.toString(),"Found while exploring retailers in LOOKU. Verify size, price and stock at the retailer.");
      if(ok){setItemName("");setItemUrl("");setMessage("Saved to your private wishlist.");}
    }catch{setMessage("Enter a valid HTTPS product page link.");}
    finally{setSaving(false);}
  }
  return <section className="section">
    <div className="section-head"><div><span className="eyebrow">RETAILER DISCOVERY · KENYA</span><h2 className="section-title">Find something that fits your style.</h2><p className="section-note">Browse real stores first, then save an exact product link. Your current style preference: <strong>{style}</strong>.</p></div><Store size={21}/></div>
    <div className="privacy-banner"><ShieldCheck/><span><strong>External stores, not LOOKU partners.</strong> These are publicly researched retailer destinations. LOOKU has not licensed or imported their inventory, images or real-time prices. Purchases happen on the retailer's website.</span></div>
    {suggest.length>0&&<div className="surface soft" style={{marginTop:15}}><span className="eyebrow">WARDROBE CHECK</span><p className="small" style={{margin:"9px 0",lineHeight:1.6}}>You haven't added {suggest.join(" or ").toLowerCase()} to your available wardrobe yet. That may simply mean you haven't photographed those items—not that you need to buy them. Add pieces you own before shopping.</p><div className="tool-row">{suggest.map(g=><button className="button compact" key={g} onClick={()=>setFilter(g)}><Tag size={12}/>Explore {g.toLowerCase()} stores</button>)}</div></div>}
    <div className="tool-row" style={{marginTop:17}}><div className="search-wrap"><Search/><input className="input" aria-label="Search retailers" placeholder="Find a store or category…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    <div className="filter-row">{CATEGORIES.map(c=><button key={c} className={"filter-pill "+(filter===c?"active":"")} onClick={()=>setFilter(c)}>{c}</button>)}</div>
    {loading?<p className="small muted">Loading researched retailer sources…</p>:visible.length?<div className="product-grid">{visible.map((source,index)=><article className="surface" style={{minHeight:215,display:"flex",flexDirection:"column",gap:8}} key={source.id}><div style={{width:40,height:40,borderRadius:12,display:"grid",placeItems:"center",background:"#e7eade",color:"#526349"}}><Store size={19}/></div><span className="eyebrow">STORE {String(index+1).padStart(2,"0")}</span><h3 style={{font:"400 22px Georgia,serif",margin:0}}>{source.name}</h3><p className="small muted" style={{lineHeight:1.6,margin:0,flex:1}}>{source.public_evidence}</p><div className="tool-row">{source.categories.slice(0,2).map(tag=><span key={tag} className="tag">{tag.replace(/-/g," ")}</span>)}</div><a className="button primary compact" href={source.website} target="_blank" rel="noopener noreferrer">Browse this store <ArrowUpRight size={13}/></a></article>)}</div>:<div className="empty-state"><p>No matching retailers found. Try a broader category.</p></div>}
    <form className="surface section" onSubmit={save}><div className="row" style={{alignItems:"start"}}><div><span className="eyebrow">FOUND SOMETHING?</span><h3 className="section-title">Keep it on your wishlist.</h3><p className="section-note">Copy the individual product link from the retailer. LOOKU saves it privately, without claiming that its price or stock is current.</p></div><Heart size={19}/></div><div className="twocol" style={{marginTop:18}}><label className="field">Product name<input className="input" required value={itemName} maxLength={160} onChange={e=>setItemName(e.target.value)} placeholder="e.g. Brown loafers"/></label><label className="field">Exact product URL<input className="input" required type="url" value={itemUrl} onChange={e=>setItemUrl(e.target.value)} placeholder="https://retailer.example/product…"/></label></div><button type="submit" disabled={saving} className="button primary"><Heart size={14}/>{saving?"Saving…":"Save shopping idea"}</button>{message&&<p className="small muted" role="status">{message}</p>}</form>
  </section>;
}
