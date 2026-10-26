"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, ExternalLink, Heart, Shirt, ShoppingBag, Sparkles, Wallet } from "lucide-react";

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

const EVENTS = [
  { name: "Birthday", dressCode: "Celebration", note: "A standout piece, comfortable shoes and one intentional accessory usually go further than buying a full new outfit." },
  { name: "Graduation", dressCode: "Smart celebratory", note: "Consider the venue, walking, photographs and any gown or institutional dress requirements." },
  { name: "Date night", dressCode: "Smart casual", note: "Start with a piece you feel confident in; match formality to the venue, not a generic rule." },
  { name: "Wedding guest", dressCode: "Ceremony appropriate", note: "Check the invitation and cultural expectations first; avoid anything the couple asks guests not to wear." },
  { name: "Campus event", dressCode: "Expressive casual", note: "Prioritize movement and comfort, then add one personal detail that makes the outfit feel deliberate." },
  { name: "Job interview", dressCode: "Polished", note: "The employer and role set the formality. Clean, comfortable and well-fitting beats buying a new outfit by default." },
  { name: "Dinner", dressCode: "Venue-led", note: "Use the venue and company as the dress-code signal. Rewearing a reliable base is a valid choice." },
  { name: "Family celebration", dressCode: "Personal and occasion-aware", note: "Balance comfort, family or cultural expectations and your own taste." },
];

const CATEGORY_NEEDS: Record<string, string[]> = {
  "Birthday": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Graduation": ["Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"],
  "Date night": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
  "Wedding guest": ["Dresses", "Tops", "Bottoms", "Shoes", "Accessories"],
  "Campus event": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Job interview": ["Tops", "Bottoms", "Shoes", "Outerwear"],
  "Dinner": ["Tops", "Bottoms", "Dresses", "Shoes"],
  "Family celebration": ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories"],
};

export function OccasionStudio({
  items, products, generated, styling, onGenerate, onPlan, onRenderLook,
}: {
  items: WardrobePiece[]; products: StoreProduct[]; generated: OutfitIdea[]; styling: boolean;
  onGenerate: (prompt: string, occasion: string) => void;
  onPlan: (date: string, title: string, occasion: string) => void;
  onRenderLook: (idea: OutfitIdea, index: number) => ReactNode;
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
  useEffect(() => {
    let live = true;
    fetch("/api/style/occasion-playbooks", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("research unavailable");
      return response.json();
    }).then(data => { if (live) { setPlaybooks(data.playbooks || []); setGapGuides(data.shoppingGapGuides || []); setResearchAvailable(true); } }).catch(() => { if (live) setResearchAvailable(false); });
    return () => { live = false; };
  }, []);
  const selectedEvent = EVENTS.find(event => event.name === eventName) || EVENTS[0];
  const selectedPlaybook = playbooks.find(playbook => playbook.occasion.toLowerCase() === eventName.toLowerCase()) || null;
  const eventGapGuides = gapGuides.filter(guide => guide.occasion.toLowerCase() === eventName.toLowerCase());
  const readyItems = items.filter(item => item.is_owned && item.status === "available");
  const ownedCategories = useMemo(() => new Set(readyItems.map(item => item.category)), [readyItems]);
  const missingCategories = (CATEGORY_NEEDS[eventName] || CATEGORY_NEEDS.Birthday).filter(category => {
    if (category === "Accessories") return !ownedCategories.has(category);
    if (category === "Outerwear") return !ownedCategories.has(category);
    if (category === "Shoes") return !ownedCategories.has(category);
    return !ownedCategories.has(category);
  });
  const budgetNumber = Number(budget);
  const matchingProducts = products
    .filter(product => product.currency === "KES" && (product.price == null || !Number.isFinite(budgetNumber) || budgetNumber <= 0 || product.price <= budgetNumber))
    .filter(product => {
      const category = product.category.toLowerCase();
      return missingCategories.some(need => category.includes(need.toLowerCase()) || need.toLowerCase().includes(category));
    })
    .slice(0, 8);
  const productFallback = products
    .filter(product => product.currency === "KES" && (product.price == null || !Number.isFinite(budgetNumber) || budgetNumber <= 0 || product.price <= budgetNumber))
    .slice(0, 8);
  const shoppingOptions = matchingProducts.length ? matchingProducts : productFallback;

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
          <div className="surface soft" style={{marginBottom:13}}><div className="row"><div><strong>Potential gaps</strong><p className="small muted" style={{margin:"5px 0 0"}}>{missingCategories.length ? missingCategories.join(" · ") : "Your wardrobe covers the main categories for this occasion."}</p></div><Wallet size={20}/></div><p className="tiny muted" style={{margin:"9px 0 0"}}>This is a category check, not a verdict that you must buy something. Try styling what you already own first.</p></div>
          {shoppingOptions.length ? <div className="product-grid">{shoppingOptions.map(product=><article className="product-card" key={product.id}>
            {product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy"/> : <div style={{height:180,background:"#efede6",display:"grid",placeItems:"center"}}><ShoppingBag size={27}/></div>}
            <div className="piece-info"><span className="eyebrow">{product.merchant}</span><h3>{product.title}</h3><p className="small muted">{product.price == null ? "Price not listed" : product.currency+" "+product.price.toLocaleString()}</p><a className="button primary compact" href={product.affiliate_url || product.product_url} target="_blank" rel="noopener noreferrer">View at retailer <ExternalLink size={12}/></a></div>
          </article>)}</div> : <div className="surface soft"><div className="row"><CircleAlert size={20}/><strong>No verified shop items match this event yet.</strong></div><p className="small muted" style={{lineHeight:1.7}}>LOOKU does not fill this space with fake products or invented prices. You can still style your closet, or browse a retailer directly while our approved merchant catalogue is being established.</p><a className="button" href="https://www.shopzetu.com/" target="_blank" rel="noopener noreferrer">Browse Shop Zetu <ExternalLink size={13}/></a><p className="tiny muted" style={{marginTop:10}}>External retailer link; LOOKU has not confirmed a partnership, stock or live pricing through this link.</p></div>}
        </div>}
    </section>

    <section className="surface section" style={{padding:18}}>
      <div className="row"><div><span className="eyebrow">SAVE YOUR PLAN</span><h2 className="section-title">Make the look part of your calendar.</h2><p className="section-note">Save the occasion date and outfit plan to your LOOKU planner. This does not create or edit a Google Calendar event.</p></div><CalendarDays size={23}/></div>
      <button className="button primary" style={{marginTop:12}} onClick={()=>onPlan(eventDate || new Date().toISOString().slice(0,10), eventName+" outfit", eventName)}>Plan this occasion <ArrowRight size={14}/></button>
    </section>
  </div>;
}
