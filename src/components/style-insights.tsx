"use client";

import { BookOpenText, CalendarDays, CheckCircle2, CircleAlert, CloudSun, ExternalLink, Heart, Layers3, Lightbulb, ShieldCheck, Shirt, ShoppingBag, Sparkles, TrendingUp } from "lucide-react";
import { INTEGRATION_GUIDES, STYLE_RESEARCH_REVIEWED, STYLE_RESEARCH_SOURCES } from "@/lib/style-research";

type InsightItem = { id: string; name: string; category: string; status: "available" | "laundry" | "retired"; image_url?: string | null };
type InsightOutfit = { id: string; title: string; status: "suggested" | "saved" | "planned" | "worn"; item_ids: string[] };
type IntegrationHealth = {
  backendConfigured?: boolean;
  aiGatewayKeyConfigured?: boolean;
  aiGatewayMode?: "api-key" | "vercel-oidc" | "not-configured";
  adminCatalogConfigured?: boolean;
  calendarConfigured?: boolean;
  weatherConfigured?: boolean;
  tryOnConfigured?: boolean;
};
type Props = {
  items: InsightItem[];
  outfits: InsightOutfit[];
  integrationHealth: IntegrationHealth | null;
  calendarConnected: boolean;
  weatherConnected: boolean;
  weatherCitySet: boolean;
  productCount: number;
  onStyleItem: (name: string) => void;
};

const CATEGORY_GROUPS = ["Tops","Bottoms","Shoes","Outerwear","Dresses","Accessories","Activewear","Sleepwear","Bags","Other"];

export function StyleInsights({ items, outfits, integrationHealth, calendarConnected, weatherConnected, weatherCitySet, productCount, onStyleItem }: Props) {
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
      <span className="eyebrow">EVIDENCE-LED PERSONAL STYLE</span>
      <h1 className="page-title serif">Style intelligence.</h1>
      <p className="page-subtitle">An open view of how LOOKU makes styling decisions: your own wardrobe history, practical rules and cited research. Research guides the recommendations; it doesn't override your taste.</p>
    </div>
    <div className="stat-grid section">
      <div className="stat"><span className="stat-label">Your pieces</span><div className="stat-number">{items.length}</div><span className="stat-caption">Garments in your digital wardrobe</span></div>
      <div className="stat"><span className="stat-label">Looks actually worn</span><div className="stat-number">{wornLooks.length}</div><span className="stat-caption">Records you marked as worn</span></div>
      <div className="stat"><span className="stat-label">Saved combinations</span><div className="stat-number">{savedLooks.length}</div><span className="stat-caption">Saved, planned and worn looks</span></div>
    </div>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">HOW THE STYLIST DECIDES</span><h2 className="section-title">Constraints first. Taste always.</h2><p className="section-note">These are explainable product rules, not a claim that fashion has one objectively correct answer.</p></div></div>
      <div className="quick-grid">
        <div className="quick-card"><Shirt/><span className="eyebrow">01</span><strong>Start with reality</strong><span>Only owned, available garments can become outfit pieces. Laundry items stay out of the shortlist.</span></div>
        <div className="quick-card"><CalendarDays/><span className="eyebrow">02</span><strong>Respect the occasion</strong><span>Event formality, comfort, accessibility and explicit instructions outrank aesthetic scoring.</span></div>
        <div className="quick-card"><Layers3/><span className="eyebrow">03</span><strong>Balance the whole look</strong><span>Combine category logic with supported color, pattern and silhouette signals rather than one score.</span></div>
        <div className="quick-card"><Heart/><span className="eyebrow">04</span><strong>Learn from feedback</strong><span>Your likes, dislikes and logged wear history personalize later suggestions.</span></div>
      </div>
    </section>

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

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">RESEARCH LIBRARY</span><h2 className="section-title">Why we style this way</h2><p className="section-note">Curated sources, reviewed {STYLE_RESEARCH_REVIEWED}. This research is embedded into LOOKU's recommendation instructions.</p></div><BookOpenText size={22}/></div>
      <div className="stack">{STYLE_RESEARCH_SOURCES.map(source=><article className="surface" key={source.id}>
        <div className="row" style={{alignItems:"start"}}><div style={{minWidth:0}}><span className="badge neutral">{source.publisher} · {source.year}</span><h3 style={{fontSize:19,fontWeight:500,lineHeight:1.35,margin:"11px 0 8px"}}>{source.title}</h3></div><BookOpenText size={20}/></div>
        <p className="small" style={{lineHeight:1.7,margin:"0 0 12px"}}>{source.takeaway}</p>
        <div className="surface soft" style={{padding:13,boxShadow:"none",marginBottom:10}}><strong className="tiny">HOW LOOKU USES IT</strong><p className="small" style={{lineHeight:1.6,margin:"6px 0 0"}}>{source.application}</p></div>
        <p className="tiny muted" style={{lineHeight:1.6,margin:"0 0 12px"}}><strong>Limit:</strong> {source.limitation}</p>
        <a className="text-action" href={source.url} target="_blank" rel="noreferrer">Read original source <ExternalLink size={11} style={{display:"inline"}}/></a>
      </article>)}</div>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">CONNECTED SERVICES</span><h2 className="section-title">Integration readiness</h2><p className="section-note">An integration is only called connected when the real provider flow succeeds.</p></div><ShieldCheck size={22}/></div>
      <div className="stack">{INTEGRATION_GUIDES.map(guide=><article className="surface row" key={guide.id} style={{alignItems:"start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div className="row" style={{justifyContent:"start",flexWrap:"wrap"}}><strong style={{fontSize:14}}>{guide.name}</strong><span className="badge neutral">{integrationStatus(guide.id)}</span></div>
          <p className="small muted" style={{lineHeight:1.6,margin:"8px 0"}}>{guide.purpose}</p>
          <p className="tiny" style={{lineHeight:1.6,margin:"0 0 7px"}}><strong>Required:</strong> {guide.required}</p>
          <p className="tiny muted" style={{lineHeight:1.6,margin:"0 0 9px"}}>{guide.note}</p>
          <a className="text-action" href={guide.setup} target="_blank" rel="noreferrer">Official setup guide <ExternalLink size={11} style={{display:"inline"}}/></a>
        </div>
        <span className="avatar"><CheckCircle2 size={16}/></span>
      </article>)}</div>
      <div className="privacy-banner section"><CircleAlert/><span>Weather and calendar context should be used only when configured and authorized. The model receives a small, relevant context summary with a styling request—not a full calendar export or the user's entire account data.</span></div>
    </section>
  </>;
}
