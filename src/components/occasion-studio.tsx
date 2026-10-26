"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, ExternalLink, Heart, Shirt, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { filterBudgetSafeProducts, findOccasionGaps } from "@/lib/occasion-planning";

type WardrobePiece = {
  id: string; name: string; category: string; colors: string[]; status: "available" | "laundry" | "retired";
  is_owned: boolean; image_url?: string | null; formality: number; style_tags: string[];
};
type StoreProduct = {
  id: string; title: string; description: string | null; category: string; brand: string | null; merchant: string;
  currency: string; price: number | null; image_url: string | null; product_url: string; affiliate_url: string | null;
};
type OutfitIdea = { title: string; style: string; reason: string; itemIds: string[]; confidenceNote?: string };
type OccasionPlaybook = { id: string; occasion: string; display_name: string; dress_codes: string[]; priorities: string[]; styling_guidance: string; shopping_guidance: string; cultural_note: string; source_urls: string[]; sort_order: number };
type ShoppingGapGuide = { id: string; occasion: string; category: string; when_to_consider: string; alternatives: string; budget_guidance: string; source_urls: string[] };
type MerchantSource = { id: string; name: string; website: string; categories: string[]; business_model: string; integration_path: string; public_evidence: string; source_url: string; relationship_status: string };

const EVENTS = [
  { name: "Birthday", dressCode: "Celebration", note: "A standout piece, comfortable shoes and one intentional accessory usually go further than buying a full new outfit." },
  { name: "Graduation", dressCode: "Smart celebratory", note: "Consider the venue, walking, photographs and any gown or institutional dress requirements." },
  { name: "Date night", dressCode: "Smart casual", note: "Start with a piece you feel confident in; match formality to the venue, not a generic rule." },
  { name: "Wedding guest", dressCode: "Ceremony appropriate", note: "Check the invitation and cultural expectations first; avoid anything the couple asks guests not to wear." },
  { name: "Campus event", dressCode: "Expressive casual", note: "Prioritize movement and comfort, then add one personal detail that makes the outfit feel deliberate." },
  { name: "Job interview", dressCode: "Polished", note: "The employer and role set the formality. Clean, comfortable and well-fitting beats buying a new outfit by default." },
  { name: "Dinner", dressCode: "Venue-led", note: "Use the venue and company as the dress-code signal. Rewearing a reliable base is a valid choice." },
  { name: "Family celebration", dressCode: "Personal and occasion-aware", note: "Balance comfort, family or cultural expectations and your own taste." },
  { name: "Church or faith ceremony", dressCode: "Modest and polished", note: "Follow the specific venue guidance and your own comfort or modesty preferences; traditions differ." },
  { name: "Workday", dressCode: "Smart casual", note: "Build around the actual workplace dress expectations and a comfortable commute." },
  { name: "Travel day", dressCode: "Comfort-first", note: "Prioritize layers, movement and versatile pieces you can rewear while travelling." },
  { name: "Outdoor event", dressCode: "Casual", note: "Consider terrain, movement and verified weather; do not guess a forecast." },
  { name: "Gym or active", dressCode: "Activewear", note: "Use pieces suitable for the activity and free movement; appearance should not override function." },
  { name: "Formal event", dressCode: "Formal", note: "Follow the invitation. Do not assume black tie or a particular outfit without explicit guidance." },
  { name: "Online interview", dressCode: "Polished", note: "Make the on-camera portion deliberate while keeping the full outfit comfortable." },
  { name: "Campus date", dressCode: "Smart casual", note: "Use the user's own comfort and personal style, not assumptions about gender or relationship expectations." },
  { name: "Conference / networking", dressCode: "Polished", note: "Use the actual event guidance, all-day comfort, layers and practical shoes. You do not need a full new outfit to look credible." },
  { name: "Concert / festival", dressCode: "Expressive casual", note: "Venue rules, terrain, weather and movement matter. Prioritize comfortable shoes and a layer only when it serves a real need." },
  { name: "Beach or pool day", dressCode: "Comfort and activity-led", note: "Start from swimwear or activity-suitable pieces you already own. Coverage and modesty are personal choices; do not assume them." },
  { name: "Photoshoot", dressCode: "Brief and background-led", note: "Follow the shoot brief and background. Offer color and texture alternatives, but do not promise a garment will photograph perfectly without a test." },
  { name: "Baby shower", dressCode: "Smart casual", note: "Use the host's dress code and venue. Comfort and freedom of movement matter more than trend-driven spending." },
  { name: "First day at work", dressCode: "Workplace-led", note: "Use the employer's stated expectations and your own comfort. Rewear pieces you already own before filling a real gap." },
];

export function OccasionStudio({
  items, products, generated, styling, onGenerate, onPlan, onRenderLook, onSaveWishlist,
}: {
  items: WardrobePiece[]; products: StoreProduct[]; generated: OutfitIdea[]; styling: boolean;
  onGenerate: (prompt: string, occasion: string) => void;
  onPlan: (date: string, title: string, occasion: string) => void;
  onRenderLook: (idea: OutfitIdea, index: number) => ReactNode;
  onSaveWishlist: (title: string, url: string, note: string) => Promise<boolean>;
}) {
  const [eventName, setEventName] = useState("Birthday");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("Restaurant or venue");
  const [dressCode, setDressCode] = useState("Celebration");
  const [budget, setBudget] = useState("3000");
  const [priority, setPriority] = useState("Use my wardrobe first");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"outfit" | "shopping">("outfit");
  const [playbooks, setPlaybooks] = useState<OccasionPlaybook[]>([]);
  const [gapGuides, setGapGuides] = useState<ShoppingGapGuide[]>([]);
  const [researchAvailable, setResearchAvailable] = useState(false);
  const [merchantSources, setMerchantSources] = useState<MerchantSource[]>([]);
  const [externalProductTitle, setExternalProductTitle] = useState("");
  const [externalProductUrl, setExternalProductUrl] = useState("");
  const [externalProductNote, setExternalProductNote] = useState("");
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [savingCatalogProductId, setSavingCatalogProductId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      fetch("/api/style/occasion-playbooks", { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("research unavailable"); return response.json(); }),
      fetch("/api/style/merchant-sources", { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("merchant research unavailable"); return response.json(); }),
    ]).then(([research, merchants]) => {
      if (live) {
        setPlaybooks(research.playbooks || []);
        setGapGuides(research.shoppingGapGuides || []);
        setMerchantSources(merchants.sources || []);
        setResearchAvailable(true);
      }
    }).catch(() => { if (live) setResearchAvailable(false); });
    return () => { live = false; };
  }, []);
  const selectedEvent = EVENTS.find(event => event.name === eventName) || EVENTS[0];
  const selectedPlaybook = playbooks.find(playbook => playbook.occasion.toLowerCase() === eventName.toLowerCase()) || null;
  const eventGapGuides = gapGuides.filter(guide => guide.occasion.toLowerCase() === eventName.toLowerCase());
  const readyItems = useMemo(() => items.filter(item => item.is_owned && item.status === "available"), [items]);
  const missingCategories = useMemo(() => findOccasionGaps(readyItems, eventName), [readyItems, eventName]);
  const shoppingOptions = useMemo(
    () => filterBudgetSafeProducts(products, missingCategories, budget, 8),
    [products, missingCategories, budget],
  );

  const relevantMerchantSources = useMemo(() => {
    if (!missingCategories.length) return merchantSources;
    return merchantSources.filter(source => {
      const tags = source.categories.join(" ").toLowerCase();
      return missingCategories.some(need => {
        const category = need.toLowerCase();
        if (["tops", "bottoms", "dresses", "outerwear"].includes(category)) {
          return /clothing|apparel|womenswear|fashion|local-design|locally-designed/.test(tags);
        }
        if (category === "shoes") return /shoe|footwear/.test(tags);
        if (category === "accessories" || category === "bags") return /accessor|bag/.test(tags);
        if (category === "swimwear") return /swimwear|clothing|apparel|fashion/.test(tags);
        if (category === "activewear") return /activewear|sportswear|clothing/.test(tags);
        return /fashion|clothing/.test(tags);
      });
    });
  }, [merchantSources, missingCategories]);

  async function saveCatalogProduct(product: StoreProduct) {
    try {
      const url = new URL(product.product_url);
      if (url.protocol !== "https:") throw new Error("Invalid retailer URL");
      setSavingCatalogProductId(product.id);
      const priceNote = product.price === null
        ? "Price not listed."
        : "Listed price: " + product.currency + " " + Number(product.price).toLocaleString() + "; confirm at checkout.";
      const note = ["Consider for " + eventName + ".", priceNote, "Budget cap: KES " + (budget || "not set") + ". Verify current price, size and stock at the retailer."].join(" ");
      await onSaveWishlist(product.title, url.toString(), note);
    } catch {
      // The product is still visible at the retailer; never save an unsafe URL.
    } finally {
      setSavingCatalogProductId(null);
    }
  }

  async function saveExternalProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!externalProductTitle.trim() || !externalProductUrl.trim()) return;
    let url: URL;
    try { url = new URL(externalProductUrl); } catch { return; }
    if (url.protocol !== "https:") return;
    setSavingWishlist(true);
    try {
      const saved = await onSaveWishlist(externalProductTitle.trim(), url.toString(), externalProductNote.trim() || "Consider for " + eventName + ". Budget: KES " + (budget || "not set") + ".");
      if (saved) { setExternalProductTitle(""); setExternalProductUrl(""); setExternalProductNote(""); }
    } finally { setSavingWishlist(false); }
  }

  function generate() {
    const prompt = [
      "Build three genuinely distinct outfit options for my " + eventName + ".",
      "Date: " + (eventDate || "not set yet") + ". Venue: " + venue + ". Dress code: " + dressCode + ".",
      "Shopping budget cap: KES " + (budget || "not specified") + ". Priority: " + priority + ".",
      "First use my own available clothes. Do not invent garments or product inventory. For each look explain which actual owned items are used, what if anything is missing, and why it fits the occasion.",
      "Only suggest purchases if they materially improve the look. Keep the full proposed purchase list within KES " + (budget || "unspecified") + ".",
      "Personal details: " + (notes || "none provided") + ".",
      "Style guidance: " + (selectedPlaybook?.styling_guidance || selectedEvent.note),
      "Shopping guidance: " + (selectedPlaybook?.shopping_guidance || "Use existing clothes first; only suggest a purchase for a documented gap."),
      "Cultural/context guidance: " + (selectedPlaybook?.cultural_note || "Ask rather than assume cultural requirements."),
      "Research sources: " + (selectedPlaybook?.source_urls || []).join(", "),
    ].join("\n");
    onGenerate(prompt, eventName);
    setActiveTab("outfit");
  }

  return <div className="section">
    <section className="surface" style={{padding:20}}>
      <span className="eyebrow">THE OCCASION STUDIO</span>
      <h2 className="section-title" style={{marginTop:9}}>One event. One considered outfit plan.</h2>
      <p className="section-note">Tell LOOKU what is happening. We start with the clothes you actually own, then check the approved shop for a genuine gap. No invented wardrobe pieces or made-up product listings.</p>
      <div className="twocol" style={{marginTop:18}}>
        <label className="field">What are you dressing for?
          <select className="input" value={eventName} onChange={event => { setEventName(event.target.value); const found = EVENTS.find(item => item.name === event.target.value); if (found) setDressCode(found.dressCode); }}>
            {EVENTS.map(event => <option key={event.name}>{event.name}</option>)}
          </select>
        </label>
        <label className="field">Event date
          <input className="input" type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} />
        </label>
        <label className="field">Venue or setting
          <select className="input" value={venue} onChange={event => setVenue(event.target.value)}>
            {["Restaurant or venue","At home","Campus","Outdoor / garden","Church or ceremony","Office / professional","Nightlife","Not decided"].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">Dress code
          <select className="input" value={dressCode} onChange={event => setDressCode(event.target.value)}>
            {["Celebration","Smart celebratory","Smart casual","Ceremony appropriate","Expressive casual","Polished","Venue-led","Personal and occasion-aware","Casual","Formal","Modest and polished"].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">Maximum shopping budget (KES)
          <input className="input" type="number" min="0" max="1000000" step="100" value={budget} onChange={event => setBudget(event.target.value)} />
        </label>
        <label className="field">What matters most?
          <select className="input" value={priority} onChange={event => setPriority(event.target.value)}>
            {["Use my wardrobe first","Look especially good in photos","Comfort and movement","Stay within budget","Buy one versatile item","Try a bolder style"].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <label className="field" style={{marginTop:12}}>Anything else? (optional)
        <textarea className="input textarea" rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Colours you like, cultural expectations, comfort needs, who you're going with…" />
      </label>
      <div className="privacy-banner" style={{marginTop:14}}><Sparkles/><span>{selectedPlaybook?.styling_guidance || selectedEvent.note}{selectedPlaybook?.cultural_note ? " " + selectedPlaybook.cultural_note : ""}</span></div>
      <p className="tiny muted" style={{marginTop:8}}>{researchAvailable ? "Research-backed occasion playbook loaded from LOOKU database." : "Using built-in occasion guidance while the research service reconnects."}{selectedPlaybook?.source_urls?.length ? " Sources: " + selectedPlaybook.source_urls.length + "." : ""}</p>
      <div className="row" style={{marginTop:16,flexWrap:"wrap"}}>
        <span className="badge neutral"><Shirt size={13}/>{readyItems.length} available pieces</span>
        <span className="badge neutral"><ShoppingBag size={13}/>{products.length} approved shop items</span>
        <button className="button primary" onClick={generate} disabled={styling || readyItems.length < 2}><Sparkles size={15}/>{styling ? "Building your looks…" : "Build my occasion looks"}<ArrowRight size={14}/></button>
      </div>
      {readyItems.length < 2 && <p className="tiny muted" style={{marginTop:12}}>Add at least two pieces to your closet before asking LOOKU to build an outfit. The wardrobe below is private to your account.</p>}
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">START WITH WHAT YOU OWN</span><h2 className="section-title">Your wardrobe for this event</h2><p className="section-note">These are your saved garments, not sample clothing. Items marked for laundry or retired are excluded.</p></div><Shirt size={22}/></div>
      {readyItems.length ? <div className="product-grid">{readyItems.slice(0,12).map(item => <article className="product-card" key={item.id}>
        {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy"/> : <div style={{height:170,background:"#efede6",display:"grid",placeItems:"center"}}><Shirt size={28}/></div>}
        <div className="piece-info"><span className="eyebrow">{item.category}</span><h3>{item.name}</h3><p className="small muted">{(item.colors || []).join(", ") || "Colour not recorded"} · Formality {item.formality}/10</p></div>
      </article>)}</div> : <div className="surface soft"><p className="small">Your wardrobe is empty so far. Add your own clothing in My Closet; LOOKU will use those real pieces to build the plan.</p></div>}
    </section>

    <section className="section">
      <div className="row" style={{alignItems:"start",flexWrap:"wrap"}}><div><span className="eyebrow">THE OUTFIT DECISION</span><h2 className="section-title">Style first. Shop second.</h2><p className="section-note">Your generated looks will appear here after the stylist runs.</p></div><div className="tool-row"><button className={"button compact "+(activeTab==="outfit"?"primary":"")} onClick={()=>setActiveTab("outfit")}>My outfit options</button><button className={"button compact "+(activeTab==="shopping"?"primary":"")} onClick={()=>setActiveTab("shopping")}>Shop for gaps</button></div></div>
      {activeTab === "outfit" ? <div className="stack">{generated.length ? generated.map((idea,index)=>onRenderLook(idea,index)) : <div className="surface soft"><Sparkles size={19}/><p className="small" style={{lineHeight:1.7}}>Fill in the occasion details and build your looks. LOOKU will only reference items in your available wardrobe. You can save a favourite and plan it for the event.</p></div>}</div> :
        <div>
          <div className="surface soft" style={{marginBottom:13}}><div className="row"><div><strong>Potential gaps</strong><p className="small muted" style={{margin:"5px 0 0"}}>{missingCategories.length ? missingCategories.join(" · ") : "Your wardrobe covers the main categories for this occasion."}</p></div><Wallet size={20}/></div><p className="tiny muted" style={{margin:"9px 0 0"}}>These are alternatives that might close a real gap, not a shopping list. A dress can replace a top-and-bottom combination; owning suitable pieces is already a complete solution.</p>{eventGapGuides.slice(0,4).map(guide=><div key={guide.id} style={{marginTop:11,borderTop:"1px solid var(--line)",paddingTop:10}}><strong className="small">{guide.category}: when a purchase makes sense</strong><p className="tiny muted" style={{lineHeight:1.6,margin:"5px 0"}}>{guide.when_to_consider}</p><p className="tiny" style={{lineHeight:1.6,margin:"4px 0"}}><strong>Alternative:</strong> {guide.alternatives}</p><p className="tiny muted" style={{lineHeight:1.6,margin:"4px 0"}}>{guide.budget_guidance}</p></div>)}</div>
          {shoppingOptions.length ? <div className="product-grid">{shoppingOptions.map(product=><article className="product-card" key={product.id}>
            {product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy"/> : <div style={{height:180,background:"#efede6",display:"grid",placeItems:"center"}}><ShoppingBag size={27}/></div>}
            <div className="piece-info"><span className="eyebrow">{product.merchant}</span><h3>{product.title}</h3><p className="small muted">{product.price == null ? "Price not listed" : product.currency+" "+product.price.toLocaleString()}</p><div className="tool-row"><a className="button primary compact" href={product.product_url} target="_blank" rel="noopener noreferrer">View at retailer <ExternalLink size={12}/></a><button className="button compact" onClick={() => void saveCatalogProduct(product)} disabled={savingCatalogProductId===product.id} aria-label={"Save "+product.title+" to wishlist"}>{savingCatalogProductId===product.id?"Saving…":<><Heart size={13}/> Save</>}</button></div></div>
          </article>)}</div> : <div className="surface soft"><div className="row"><CircleAlert size={20}/><strong>No verified shop items match this event yet.</strong></div><p className="small muted" style={{lineHeight:1.7}}>LOOKU does not fill this space with fake products or invented prices. You can still style your closet, or browse a retailer directly while our approved merchant catalogue is being established.</p><div className="stack" style={{marginTop:14}}>{relevantMerchantSources.map(source=><article className="surface row" key={source.id} style={{alignItems:"start",gap:12,boxShadow:"none"}}><div style={{flex:1,minWidth:0}}><strong>{source.name}</strong><p className="tiny muted" style={{lineHeight:1.6,margin:"5px 0"}}>{source.public_evidence}</p><span className="badge neutral">Research lead · Not a partner</span></div><a className="button compact" href={source.website} target="_blank" rel="noopener noreferrer">Visit site <ExternalLink size={12}/></a></article>)}</div><p className="tiny muted" style={{marginTop:10}}>These are researched external retailers, not LOOKU partners. Their products, current prices, sizes and stock have not been verified through a live feed.</p><form className="surface" style={{marginTop:16}} onSubmit={saveExternalProduct}><strong>Found something worth considering?</strong><p className="tiny muted" style={{lineHeight:1.6}}>Open a retailer, copy the exact product URL and save it to your private wishlist. LOOKU does not scrape the page or claim its current stock.</p><label className="field">Item name<input className="input" required maxLength={160} value={externalProductTitle} onChange={event=>setExternalProductTitle(event.target.value)} placeholder="e.g. Black loafers"/></label><label className="field">Product page URL<input className="input" required type="url" value={externalProductUrl} onChange={event=>setExternalProductUrl(event.target.value)} placeholder="https://retailer.example/product"/></label><label className="field">Why it might work<input className="input" maxLength={500} value={externalProductNote} onChange={event=>setExternalProductNote(event.target.value)} placeholder="What would it pair with?"/></label><button className="button primary" disabled={savingWishlist}>{savingWishlist?"Saving…":"Save to my wishlist"}</button></form></div>}
        </div>}
    </section>

    <section className="surface section" style={{padding:18}}>
      <div className="row"><div><span className="eyebrow">SAVE YOUR PLAN</span><h2 className="section-title">Make the look part of your calendar.</h2><p className="section-note">Save the occasion date and outfit plan to your LOOKU planner. This does not create or edit a Google Calendar event.</p></div><CalendarDays size={23}/></div>
      <button className="button primary" style={{marginTop:12}} onClick={()=>onPlan(eventDate || new Date().toISOString().slice(0,10), eventName+" outfit", eventName)}>Plan this occasion <ArrowRight size={14}/></button>
    </section>
  </div>;
}
