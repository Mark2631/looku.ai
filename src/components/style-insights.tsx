"use client";

import { Heart, Shirt, TrendingUp } from "lucide-react";

type InsightItem = { id: string; name: string; category: string; status: "available" | "laundry" | "retired"; image_url?: string | null };
type InsightOutfit = { id: string; title: string; status: "suggested" | "saved" | "planned" | "worn"; item_ids: string[] };
type Props = {
  items: InsightItem[];
  outfits: InsightOutfit[];
  onStyleItem: (name: string) => void;
};

const CATEGORY_GROUPS = ["Tops","Bottoms","Shoes","Outerwear","Dresses","Accessories","Activewear","Sleepwear","Bags","Other"];

export function StyleInsights({ items, outfits, onStyleItem }: Props) {
  const wornCounts = new Map<string, number>();
  outfits.filter(outfit => outfit.status === "worn").forEach(outfit => outfit.item_ids.forEach(id => wornCounts.set(id, (wornCounts.get(id) || 0) + 1)));
  const wornLooks = outfits.filter(outfit => outfit.status === "worn");
  const savedLooks = outfits.filter(outfit => outfit.status === "saved" || outfit.status === "planned" || outfit.status === "worn");
  const categoryCounts = CATEGORY_GROUPS
    .map(category => ({ category, count: items.filter(item => item.category === category && item.status !== "retired").length }))
    .filter(row => row.count > 0)
    .sort((a,b) => b.count - a.count);
  const frequentlyWorn = items
    .map(item => ({ item, count: wornCounts.get(item.id) || 0 }))
    .filter(row => row.count > 0)
    .sort((a,b) => b.count-a.count)
    .slice(0,5);
  const notLogged = items.filter(item => item.status !== "retired" && !wornCounts.has(item.id)).slice(0,6);
  const maxCategory = Math.max(1,...categoryCounts.map(row=>row.count));

  const integrationStatus = (id: string) => {
    if (id === "ai") return integrationHealth?.aiGatewayMode === "api-key" ? "API key configured" : integrationHealth?.aiGatewayMode === "vercel-oidc" ? "Vercel OIDC available · first call verifies" : "Needs credentials";
    if (id === "calendar") return calendarConnected ? "Connected" : integrationHealth?.calendarConfigured ? "Ready to connect" : "OAuth setup required";
    if (id === "weather") return weatherConnected ? "Connected" : integrationHealth?.weatherConfigured ? (weatherCitySet ? "Configured; waiting for data" : "Add a city") : "Provider key required";
    if (id === "tryon") return integrationHealth?.tryOnConfigured ? "Provider configured" : "Optional paid integration";
    if (id === "retail") return productCount > 0 ? productCount + " approved products" : "Awaiting verified merchant feeds";
    return "Not configured";
  };
  const integrationTone = (id: string) => {
    if (id === "calendar" && calendarConnected) return "success";
    if (id === "weather" && weatherConnected) return "success";
    if (id === "retail" && productCount > 0) return "success";
    if (id === "ai" && integrationHealth?.aiGatewayMode && integrationHealth.aiGatewayMode !== "not-configured") return "success";
    if (id === "tryon" && integrationHealth?.tryOnConfigured) return "success";
    return "neutral";
  };

  return <>
    <div>
      <h1 className="page-title serif">Your style</h1>
    </div>
    <div className="stat-grid section">
      <div className="stat"><span className="stat-label">Your pieces</span><div className="stat-number">{items.length}</div><span className="stat-caption">Garments in your digital wardrobe</span></div>
      <div className="stat"><span className="stat-label">Looks actually worn</span><div className="stat-number">{wornLooks.length}</div><span className="stat-caption">Records you marked as worn</span></div>
      <div className="stat"><span className="stat-label">Saved combinations</span><div className="stat-number">{savedLooks.length}</div><span className="stat-caption">Saved, planned and worn looks</span></div>
    </div>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">PERSONAL WARDROBE ANALYTICS</span><h2 className="section-title">What your data says</h2><p className="section-note">Only information recorded in your own LOOKU wardrobe is counted.</p></div><TrendingUp size={22}/></div>
      <div className="stylist-layout">
        <div className="surface">
          <h3 style={{fontSize:16,fontWeight:500,margin:"0 0 15px"}}>Categories you own</h3>
          {categoryCounts.length ? <div className="stack">{categoryCounts.slice(0,8).map(row=><div key={row.category}><div className="row"><span className="small">{row.category}</span><span className="small muted">{row.count} pieces</span></div><div style={{height:5,background:"#eeeae2",borderRadius:10,marginTop:7,overflow:"hidden"}}><div style={{height:"100%",width:Math.max(4,row.count/maxCategory*100)+"%",background:"#899782",borderRadius:10}}/></div></div>)}</div> : <p className="small muted">Add garments to start seeing your wardrobe structure.</p>}
        </div>
        <div className="surface">
          <h3 style={{fontSize:16,fontWeight:500,margin:"0 0 13px"}}>Frequently worn</h3>
          {frequentlyWorn.length ? <div className="stack">{frequentlyWorn.map(({item,count})=><div key={item.id} className="outfit-row">{item.image_url ? <img src={item.image_url} alt={item.name}/> : <div className="avatar"><Shirt size={16}/></div>}<div style={{flex:1,minWidth:0}}><strong>{item.name}</strong><small>{item.category} · Logged in {count} worn {count===1?"look":"looks"}</small></div></div>)}</div> : <p className="small muted">Mark a saved look as worn to build a useful wear history. LOOKU will not pretend to know how often you've worn something.</p>}
        </div>
      </div>
      <div className="surface section">
        <div className="row"><div><h3 style={{fontSize:16,fontWeight:500,margin:"0 0 6px"}}>Pieces not yet logged in a worn look</h3><p className="small muted" style={{margin:0}}>This means there is no saved wear record. It does not mean the garment has never been worn.</p></div><span className="badge neutral">{notLogged.length} shown</span></div>
        {notLogged.length ? <div className="outfit-strip" style={{marginTop:14}}>{notLogged.map(item=><div key={item.id} style={{minWidth:120,width:120}}>{item.image_url ? <img src={item.image_url} alt={item.name}/> : <div className="avatar"><Shirt size={17}/></div>}<strong style={{display:"block",fontSize:11,marginTop:7}}>{item.name}</strong><small className="muted">{item.category}</small><button className="text-action" style={{display:"block",marginTop:6}} onClick={()=>onStyleItem(item.name)}>Style this piece</button></div>)}</div> : <p className="small muted" style={{marginTop:13}}>No unlogged items are currently shown.</p>}
      </div>
    </section>

  </>;
}
