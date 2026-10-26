"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, CloudSun, Heart, House, ImagePlus, Layers3, LogOut, Menu, MessageCircle, Plus, Search, Settings, Shirt,
  ShoppingBag, Sparkles, Star, Trash2, Upload, UserRound, X, Footprints, WandSparkles, RefreshCw, ThumbsDown,
  ThumbsUp, Bookmark, Clock3, CalendarCheck, Package, ShieldCheck, LockKeyhole, ExternalLink, Link as LinkIcon,
  ListChecks, SlidersHorizontal, Camera, CircleAlert, LoaderCircle, Download, Store, Pencil, CalendarPlus, ShirtIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { StyleInsights } from "@/components/style-insights";

type Screen = "Today" | "Closet" | "Stylist" | "Plan" | "Looks" | "Shop" | "Settings";
type WardrobeItem = {
  id: string; user_id: string; name: string; brand: string | null; category: string; colors: string[]; pattern: string | null;
  formality: number; seasons: string[]; style_tags: string[]; image_path: string | null; image_url?: string | null;
  status: "available" | "laundry" | "retired"; is_owned: boolean; attributes: Record<string, unknown>; created_at: string;
};
type OutfitIdea = { title: string; style: string; reason: string; itemIds: string[]; confidenceNote?: string };
type Outfit = {
  id: string; user_id: string; title: string; occasion: string; style_label: string | null; recommendation_reason: string | null;
  status: "suggested" | "saved" | "planned" | "worn"; source: "ai" | "manual"; cover_image_path: string | null;
  cover_url?: string | null; worn_at: string | null; created_at: string; item_ids: string[];
};
type OutfitPlan = { id: string; user_id: string; plan_date: string; event_title: string; occasion: string; notes: string | null; outfit_id: string | null; external_event_id: string | null; created_at: string };
type Product = { id: string; title: string; description: string | null; category: string; brand: string | null; merchant: string; currency: string; price: number | null; image_url: string | null; product_url: string; affiliate_url: string | null; country_code: string[]; sizes: string[]; is_active?: boolean; is_approved?: boolean };
type Wish = { id: string; user_id: string; title: string; product_url: string | null; note: string | null; created_at: string };
type Profile = { full_name: string | null; style_preferences: Record<string, unknown>; onboarding_completed: boolean };
type Modal = "garment" | "edit-garment" | "plan" | "wish" | "look" | "merchant" | "product" | "feedback" | null;
type ChatMessage = { role: "user" | "assistant"; text: string };
type CalendarEvent = { id: string; title: string; description: string; location: string; start: string; end: string; url: string | null };
type CalendarPayload = { configured: boolean; connected: boolean; accountEmail?: string | null; events: CalendarEvent[]; message?: string; error?: string };
type WeatherPayload = { location: { name: string; region: string; country: string }; current: { tempC: number; feelsLikeC: number; condition: string; icon: string; humidity: number; windKph: number; precipitationMm: number; updatedAt: string } };

const navItems: { id: Screen; label: string; icon: typeof House; group?: string }[] = [
  { id: "Today", label: "Today", icon: House, group: "YOUR SPACE" },
  { id: "Closet", label: "My closet", icon: Shirt },
  { id: "Stylist", label: "AI stylist", icon: Sparkles, group: "YOUR STYLE" },
  { id: "Plan", label: "Outfit planner", icon: CalendarDays },
  { id: "Looks", label: "My lookbook", icon: ImagePlus },
  { id: "Shop", label: "Curated shop", icon: ShoppingBag, group: "DISCOVER" },
  { id: "Settings", label: "Preferences", icon: Settings, group: "ACCOUNT" },
];
const categories = ["All", "Tops", "Bottoms", "Shoes", "Outerwear", "Dresses", "Accessories", "Activewear", "Sleepwear", "Bags", "Other"];
const occasions = ["Everyday", "Work / Presentation", "Event / Date", "Wedding / Celebration", "Campus", "Travel", "Gym / Active", "Relaxed / Home", "Church / Ceremony", "Dinner"];
const styles = ["Relaxed minimal", "Smart casual", "Streetwear", "Classic elegance", "Colorful creative", "Comfort-first", "Modest and polished"];
const heroImage = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85";

function todayIso() {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}
function formatDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, options);
}
function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "L";
}
async function fetchCalendarSnapshot(): Promise<CalendarPayload> {
  const response = await fetch("/api/calendar/events", { cache: "no-store" });
  const data = await response.json() as CalendarPayload;
  if (!response.ok) throw new Error(data.error || "Could not load Google Calendar.");
  return data;
}
function safeHostname(raw: string | null | undefined) { try { return raw ? new URL(raw).hostname : ""; } catch { return ""; } }
function safeExternalUrl(raw: string | null | undefined) {
  if (!raw) return null;
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}
function ErrorNotice({ children }: { children: ReactNode }) {
  return <div className="notice" role="alert" style={{ display: "flex", gap: 9, alignItems: "start" }}><CircleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{children}</span></div>;
}
function EmptyState({ icon: Icon = Shirt, title, body, action, onAction }: { icon?: typeof Shirt; title: string; body: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Icon /></div><h3>{title}</h3><p>{body}</p>{action && onAction && <button className="button primary" onClick={onAction}><Plus size={15}/>{action}</button>}</div>;
}

export function LookuApp() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; name: string } | null>(null);
  const [screen, setScreen] = useState<Screen>("Today");
  const [moreOpen, setMoreOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [plans, setPlans] = useState<OutfitPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<Wish[]>([]);
  const [profile, setProfile] = useState<Profile>({ full_name: null, style_preferences: { style: "Relaxed minimal", avoidedColors: [], notes: "" }, onboarding_completed: false });
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [occasion, setOccasion] = useState("Everyday");
  const [mood, setMood] = useState("");
  const [generated, setGenerated] = useState<OutfitIdea[]>([]);
  const [styling, setStyling] = useState(false);
  const [aiError, setAiError] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", text: "Tell me where you're going, what mood you're after, or which item you want to wear. I'll build around pieces in your actual wardrobe." }]);
  const [chatInput, setChatInput] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOutfitId, setModalOutfitId] = useState<string | null>(null);
  const [editingGarment, setEditingGarment] = useState<WardrobeItem | null>(null);
  const [modalDate, setModalDate] = useState(todayIso());
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [modalPlanTitle, setModalPlanTitle] = useState("Outfit plan");
  const [modalPlanOccasion, setModalPlanOccasion] = useState("Everyday");
  const [modalPlanNotes, setModalPlanNotes] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminError, setAdminError] = useState("");
  const [calendarStatus, setCalendarStatus] = useState<CalendarPayload>({ configured: false, connected: false, events: [] });
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [weatherMessage, setWeatherMessage] = useState("");
  const weatherCity = typeof profile.style_preferences?.locationCity === "string" ? String(profile.style_preferences.locationCity).trim() : "";

  const showToast = useCallback((message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(""), 3000); }, []);

  const loadData = useCallback(async (userId: string) => {
    setLoadingData(true);
    try {
      const supabase = createClient();
      const [profileRes, itemRes, outfitRes, outfitItemsRes, planRes, productRes, wishRes] = await Promise.all([
        supabase.from("profiles").select("full_name,style_preferences,onboarding_completed").eq("id", userId).maybeSingle(),
        supabase.from("wardrobe_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(400),
        supabase.from("outfits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabase.from("outfit_items").select("outfit_id,wardrobe_item_id,position").eq("user_id", userId).order("position"),
        supabase.from("outfit_plans").select("*").eq("user_id", userId).order("plan_date", { ascending: true }).limit(400),
        supabase.from("products").select("id,title,description,category,brand,merchant,currency,price,image_url,product_url,affiliate_url,country_code,sizes").eq("is_active", true).eq("is_approved", true).order("created_at", { ascending: false }).limit(100),
        supabase.from("wishlist_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      ]);
      if (profileRes.data) setProfile({ full_name: profileRes.data.full_name, style_preferences: profileRes.data.style_preferences || {}, onboarding_completed: Boolean(profileRes.data.onboarding_completed) });
      if (profileRes.error) console.error("LOOKU profile load", profileRes.error.message);
      const mappedItems: WardrobeItem[] = await Promise.all((itemRes.data || []).map(async (item: any) => {
        let imageUrl: string | null = null;
        if (item.image_path) {
          const { data } = await supabase.storage.from("wardrobe-private").createSignedUrl(item.image_path, 3600);
          imageUrl = data?.signedUrl || null;
        }
        return { ...item, image_url: imageUrl };
      }));
      setItems(mappedItems);
      const links = (outfitItemsRes.data || []) as { outfit_id: string; wardrobe_item_id: string; position: number }[];
      const mappedOutfits: Outfit[] = await Promise.all((outfitRes.data || []).map(async (outfit: any) => {
        let coverUrl: string | null = null;
        if (outfit.cover_image_path) {
          const { data } = await supabase.storage.from("wardrobe-private").createSignedUrl(outfit.cover_image_path, 3600);
          coverUrl = data?.signedUrl || null;
        }
        return { ...outfit, cover_url: coverUrl, item_ids: links.filter(l => l.outfit_id === outfit.id).sort((a,b) => a.position-b.position).map(l => l.wardrobe_item_id) };
      }));
      setOutfits(mappedOutfits);
      if (planRes.data) setPlans(planRes.data as OutfitPlan[]);
      if (productRes.data) setProducts(productRes.data as Product[]);
      if (wishRes.data) setWishlist(wishRes.data as Wish[]);
      try {
        const r = await fetch("/api/admin/products", { cache: "no-store" });
        if (r.ok) { const j = await r.json(); setAdmin(true); setAdminProducts(j.products || []); }
        else if (r.status === 403) setAdmin(false);
      } catch { /* Normal users do not need the catalog administration endpoint. */ }
      if (itemRes.error || outfitRes.error || planRes.error || productRes.error || wishRes.error) {
        console.error("LOOKU load returned an error", [itemRes.error, outfitRes.error, planRes.error, productRes.error, wishRes.error].filter(Boolean).map(x => x?.message));
      }
    } catch (error) {
      console.error("LOOKU data loading failed", error);
      showToast("Some information couldn't load. Check your connection and refresh.");
    } finally { setLoadingData(false); }
  }, [showToast]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (!configured) { setReady(true); return; }
    let live = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (!live) return;
      if (error) console.error("LOOKU auth", error.message);
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email, name: String(u.user_metadata?.full_name || u.email?.split("@")[0] || "Your style") });
        void loadData(u.id);
      }
      setReady(true);
    }).catch(() => { if (live) setReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email, name: String(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Your style") });
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") void loadData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null); setItems([]); setOutfits([]); setPlans([]); setWishlist([]); setProducts([]);
      }
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, [configured, loadData]);

  useEffect(() => {
    if (!ready) return;
    const status = new URLSearchParams(window.location.search).get("calendar");
    if (!status) return;
    const messages: Record<string, string> = {
      connected: "Google Calendar connected. Your upcoming events are now available in the planner.",
      not_configured: "Google Calendar setup is incomplete. Server-side OAuth credentials and encrypted token storage must be configured first.",
      cancelled: "Google Calendar connection was cancelled.",
      state_error: "Calendar authorization could not be verified. Start the connection again.",
      token_error: "Google did not authorize the calendar connection. Check the OAuth client and redirect URI.",
      refresh_token_missing: "Google did not issue a refresh token. Remove LOOKU from Google Account access and reconnect with offline access.",
      save_error: "Google authorized the connection, but LOOKU could not safely store its encrypted credentials.",
      provider_error: "Google Calendar couldn't be connected. Please retry.",
    };
    setToastMessage(messages[status] || "Calendar connection status updated.");
    if (status === "connected") setScreen("Plan");
    window.history.replaceState({}, "", window.location.pathname);
  }, [ready]);

  useEffect(() => {
    if (!configured || !user || screen !== "Plan") return;
    let active = true;
    setCalendarLoading(true);
    setCalendarMessage("");
    fetchCalendarSnapshot().then(data => {
      if (!active) return;
      setCalendarStatus(data); setCalendarEvents(data.events || []);
      if (data.message) setCalendarMessage(data.message);
    }).catch(error => { if (active) setCalendarMessage(error instanceof Error ? error.message : "Calendar events could not be loaded."); })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [configured, user?.id, screen]);

  useEffect(() => {
    if (!configured || !user || !weatherCity || screen !== "Today") { setWeather(null); setWeatherMessage(""); return; }
    let active = true;
    fetch("/api/weather?city=" + encodeURIComponent(weatherCity), { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Weather could not be loaded.");
      return data as WeatherPayload;
    }).then(data => { if (active) { setWeather(data); setWeatherMessage(""); } }).catch(error => {
      if (active) { setWeather(null); setWeatherMessage(error instanceof Error ? error.message : "Weather could not be loaded."); }
    });
    return () => { active = false; };
  }, [configured, user?.id, weatherCity, screen]);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(""), 2800);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  const filteredItems = useMemo(() => items.filter(item => (filter === "All" || item.category === filter) && (item.name + " " + (item.brand || "") + " " + (item.colors || []).join(" ")).toLowerCase().includes(search.toLowerCase())), [items, filter, search]);
  const availableItems = useMemo(() => items.filter(item => item.is_owned && item.status === "available"), [items]);
  const savedLooks = useMemo(() => outfits.filter(o => o.status === "saved" || o.status === "planned" || o.status === "worn"), [outfits]);
  const todayPlans = useMemo(() => plans.filter(p => p.plan_date === todayIso()), [plans]);
  const styleName = String(profile.style_preferences?.style || "Relaxed minimal");
  const greetingName = (profile.full_name || user?.name || "there").split(" ")[0];


  function switchScreen(next: Screen) { setScreen(next); setMoreOpen(false); setModal(null); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function generateLooks(prompt: string, requestedOccasion = occasion, fromChat = false) {
    if (availableItems.length < 2) { showToast("Add at least two available items to get started."); switchScreen("Closet"); return; }
    setStyling(true); setAiError("");
    try {
      const response = await fetch("/api/ai/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ occasion: requestedOccasion, prompt, count: 3 }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The stylist couldn't complete that request.");
      setGenerated(data.outfits || []);
      if (fromChat) setChat(prev => [...prev, { role: "assistant", text: "I've prepared " + (data.outfits || []).length + " look" + ((data.outfits || []).length === 1 ? "" : "s") + " using only clothes currently marked available. You can save a look or ask me to adjust it." }]);
      showToast("Your wardrobe edit is ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The stylist is unavailable.";
      setAiError(message);
      if (fromChat) setChat(prev => [...prev, { role: "assistant", text: message }]);
      else showToast(message);
    } finally { setStyling(false); }
  }

  async function saveOutfit(idea: OutfitIdea, selectedOccasion = occasion) {
    if (!user) return;
    const validItems = idea.itemIds.filter(id => availableItems.some(item => item.id === id));
    if (validItems.length < 2) { showToast("Those pieces are no longer all available. Generate a fresh look."); return; }
    setModalBusy(true);
    try {
      const supabase = createClient();
      const { data: outfit, error } = await supabase.from("outfits").insert({
        user_id: user.id, title: idea.title.slice(0, 120), occasion: selectedOccasion, style_label: idea.style,
        recommendation_reason: idea.reason, status: "saved", source: "ai",
      }).select("*").single();
      if (error || !outfit) throw error || new Error("Couldn't save this look.");
      const { error: itemError } = await supabase.from("outfit_items").insert(validItems.map((id, position) => ({ user_id: user.id, outfit_id: outfit.id, wardrobe_item_id: id, position })));
      if (itemError) { await supabase.from("outfits").delete().eq("id", outfit.id).eq("user_id", user.id); throw itemError; }
      await loadData(user.id);
      setModal(null);
      showToast("Saved to your lookbook.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Couldn't save this outfit."); }
    finally { setModalBusy(false); }
  }

  async function markWorn(outfit: Outfit) {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("outfits").update({ status: "worn", worn_at: new Date().toISOString() }).eq("id", outfit.id).eq("user_id", user.id);
    if (error) { showToast("Couldn't update the wear history."); return; }
    await supabase.from("outfit_feedback").insert({ user_id: user.id, outfit_id: outfit.id, reaction: "wore" });
    await loadData(user.id);
    showToast("Logged as worn. Your style history is updated.");
  }

  async function reactToOutfit(outfit: Outfit, reaction: "like" | "dislike") {
    if (!user) return;
    const { error } = await createClient().from("outfit_feedback").insert({ user_id: user.id, outfit_id: outfit.id, reaction });
    if (error) showToast("Feedback couldn't be saved.");
    else showToast(reaction === "like" ? "Noted. I'll favor looks like this." : "Noted. I'll avoid leaning this way.");
  }

  async function deleteOutfit(outfit: Outfit) {
    if (!user || !window.confirm("Delete this saved look?")) return;
    const { error } = await createClient().from("outfits").delete().eq("id", outfit.id).eq("user_id", user.id);
    if (error) { showToast("Couldn't delete this look."); return; }
    if (outfit.cover_image_path) await createClient().storage.from("wardrobe-private").remove([outfit.cover_image_path]);
    await loadData(user.id); showToast("Look deleted.");
  }

  async function toggleGarmentStatus(item: WardrobeItem) {
    if (!user) return;
    const next = item.status === "available" ? "laundry" : "available";
    const { error } = await createClient().from("wardrobe_items").update({ status: next }).eq("id", item.id).eq("user_id", user.id);
    if (error) { showToast("Couldn't update availability."); return; }
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: next } : x));
    showToast(next === "laundry" ? "Marked as in the laundry." : "Back in your available wardrobe.");
  }

  async function removeGarment(item: WardrobeItem) {
    if (!user || !window.confirm("Remove " + item.name + " from your wardrobe? Saved looks containing it will update too.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id).eq("user_id", user.id);
    if (error) { showToast("Couldn't remove this garment."); return; }
    if (item.image_path) await supabase.storage.from("wardrobe-private").remove([item.image_path]);
    await loadData(user.id); showToast("Garment removed.");
  }


  async function refreshCalendarEvents() {
    setCalendarLoading(true); setCalendarMessage("");
    try {
      const data = await fetchCalendarSnapshot();
      setCalendarStatus(data); setCalendarEvents(data.events || []);
      if (data.message) setCalendarMessage(data.message);
      else setCalendarMessage("");
    } catch (error) {
      setCalendarMessage(error instanceof Error ? error.message : "Calendar events could not be loaded.");
    } finally { setCalendarLoading(false); }
  }

  async function disconnectCalendar() {
    if (!window.confirm("Disconnect Google Calendar from LOOKU? Existing outfits and plans will remain.")) return;
    try {
      const response = await fetch("/api/calendar/disconnect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not disconnect Google Calendar.");
      setCalendarStatus({ configured: true, connected: false, events: [] }); setCalendarEvents([]);
      showToast("Google Calendar disconnected.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Could not disconnect Google Calendar."); }
  }

  async function importCalendarEvent(event: CalendarEvent) {
    if (!user) return;
    if (plans.some(plan => plan.external_event_id === event.id)) { showToast("This calendar event is already in your LOOKU planner."); return; }
    const date = event.start.slice(0, 10);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) { showToast("This event has no usable start date."); return; }
    const title = event.title.slice(0, 140);
    const titleLower = title.toLowerCase();
    const planOccasion = /wedding|marriage|ceremony|graduation|party|celebration/.test(titleLower) ? "Wedding / Celebration"
      : /interview|presentation|meeting|office|client|conference/.test(titleLower) ? "Work / Presentation"
      : /gym|workout|run|training/.test(titleLower) ? "Gym / Active"
      : /date|dinner|restaurant|anniversary/.test(titleLower) ? "Event / Date"
      : /flight|travel|trip|airport/.test(titleLower) ? "Travel" : "Everyday";
    const notes = [event.location, event.description].filter(Boolean).join("\\n").slice(0, 1200) || null;
    const { data, error } = await createClient().from("outfit_plans").insert({
      user_id: user.id, plan_date: date, event_title: title, occasion: planOccasion,
      notes, external_event_id: event.id,
    }).select("*").single();
    if (error || !data) { showToast(error?.message || "Could not import the event."); return; }
    setPlans(prev => [...prev, data as OutfitPlan].sort((a,b)=>a.plan_date.localeCompare(b.plan_date)));
    showToast("Added to your LOOKU planner. Choose an outfit when you're ready.");
  }

  async function submitEditGarment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !editingGarment) return;
    setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const brand = String(form.get("brand") || "").trim();
    const category = String(form.get("category") || "Other");
    const colors = String(form.get("colors") || "").split(",").map(value => value.trim()).filter(Boolean).slice(0,5);
    const formality = Number(form.get("formality") || 5);
    const productUrl = String(form.get("product_url") || "").trim();
    if (productUrl && !safeExternalUrl(productUrl)) { setModalError("Use a valid HTTPS product URL."); setModalBusy(false); return; }
    if (!name) { setModalError("Garment name is required."); setModalBusy(false); return; }
    const { error } = await createClient().from("wardrobe_items").update({
      name: name.slice(0,100), brand: brand || null, category, colors,
      formality: Math.min(10, Math.max(1, formality)),
      attributes: { ...(editingGarment.attributes || {}), productUrl: productUrl || null, manualCorrection: true, correctedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", editingGarment.id).eq("user_id", user.id);
    if (error) { setModalError(error.message || "Couldn't update this garment."); setModalBusy(false); return; }
    await loadData(user.id);
    setEditingGarment(null); setModal(null); setModalBusy(false); showToast("Garment details updated.");
  }

  async function submitGarment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const enteredName = String(form.get("name") || "").trim();
    const fallbackCategory = String(form.get("category") || "Other");
    const enteredColor = String(form.get("color") || "").trim();
    const brand = String(form.get("brand") || "").trim();
    const productUrl = String(form.get("product_url") || "").trim();
    const formality = Number(form.get("formality") || 5);
    const files = form.getAll("image").filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length) { setModalError("Choose at least one garment photo."); setModalBusy(false); return; }
    if (files.length > 12) { setModalError("Add up to 12 garments per batch. You can repeat the process as your wardrobe grows."); setModalBusy(false); return; }
    if (productUrl && !safeExternalUrl(productUrl)) { setModalError("Use a valid HTTPS product URL."); setModalBusy(false); return; }
    if (productUrl && files.length > 1) { setModalError("Add a product link with one garment at a time, or leave it blank for a batch upload."); setModalBusy(false); return; }
    for (const file of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setModalError("Use JPG, PNG or WebP images. No items were uploaded."); setModalBusy(false); return; }
      if (file.size > 10 * 1024 * 1024) { setModalError("Each image must be smaller than 10 MB. No items were uploaded."); setModalBusy(false); return; }
    }
    if (files.length === 1 && !enteredName) { setModalError("Give this garment a name, or select several photos to use their file names as starting labels."); setModalBusy(false); return; }
    const supabase = createClient();
    let added = 0, untagged = 0;
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      setToastMessage("Adding garment " + (index + 1) + " of " + files.length + "…");
      const fallbackName = (files.length === 1 ? enteredName : file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")).slice(0,100) || "Wardrobe item";
      const path = user.id + "/" + crypto.randomUUID() + "-" + file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-90);
      try {
        const { error: uploadError } = await supabase.storage.from("wardrobe-private").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        let attributes: Record<string, unknown> = {};
        try {
          const response = await fetch("/api/ai/analyze-garment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePath: path, suggestedName: fallbackName }) });
          const result = await response.json();
          if (response.ok && result.attributes) attributes = result.attributes;
          else untagged++;
        } catch { untagged++; }
        const allowedCategories = categories.filter(cat => cat !== "All");
        const inferredCategory = typeof attributes.category === "string" && allowedCategories.includes(attributes.category) ? attributes.category : fallbackCategory;
        const { data, error } = await supabase.from("wardrobe_items").insert({
          user_id: user.id,
          name: typeof attributes.name === "string" ? attributes.name.slice(0,100) : fallbackName,
          category: inferredCategory,
          brand: brand || null,
          colors: Array.isArray(attributes.colors) ? attributes.colors.filter(x => typeof x === "string").slice(0,5) : enteredColor ? [enteredColor] : [],
          pattern: typeof attributes.pattern === "string" ? attributes.pattern : null,
          formality: typeof attributes.formality === "number" ? Math.min(10,Math.max(1,attributes.formality)) : formality,
          seasons: Array.isArray(attributes.seasons) ? attributes.seasons.filter(x => typeof x === "string") : [],
          style_tags: Array.isArray(attributes.style_tags) ? attributes.style_tags.filter(x => typeof x === "string") : [],
          image_path: path, status: "available", is_owned: true, attributes: { ...attributes, ...(productUrl ? { productUrl } : {}) },
        }).select("id").single();
        if (error || !data) {
          await supabase.storage.from("wardrobe-private").remove([path]);
          throw error || new Error("Could not save " + fallbackName + ".");
        }
        added++;
      } catch (error) {
        setModalError("Added " + added + " item(s), but couldn't finish " + fallbackName + ": " + (error instanceof Error ? error.message : "unknown error") + ". Retry the remaining items separately.");
        setModalBusy(false);
        await loadData(user.id);
        return;
      }
    }
    await loadData(user.id);
    setModal(null); setFilter("All"); setSearch(""); setScreen("Closet");
    showToast("Added " + added + " garment" + (added === 1 ? "" : "s") + (untagged ? ". " + untagged + " need a quick manual review because AI tagging was unavailable." : ". Your wardrobe is ready."));
    setModalBusy(false);
  }

  async function submitPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const planDate = String(form.get("date") || "");
    const eventTitle = String(form.get("title") || "Outfit plan").trim();
    const planOccasion = String(form.get("occasion") || "Everyday");
    const note = String(form.get("notes") || "").trim();
    const outfitId = String(form.get("outfit_id") || "") || null;
    if (!planDate || !eventTitle) { setModalError("Choose a date and name the plan."); setModalBusy(false); return; }
    const values = { plan_date: planDate, event_title: eventTitle.slice(0,140), occasion: planOccasion, notes: note || null, outfit_id: outfitId };
    const query = editingPlanId
      ? createClient().from("outfit_plans").update(values).eq("id", editingPlanId).eq("user_id", user.id).select("*").single()
      : createClient().from("outfit_plans").insert({ user_id: user.id, ...values }).select("*").single();
    const { data, error } = await query;
    if (error || !data) { setModalError(error?.message || "Couldn't save this plan."); setModalBusy(false); return; }
    if (outfitId) await createClient().from("outfits").update({ status: "planned" }).eq("id", outfitId).eq("user_id", user.id);
    await loadData(user.id); setModal(null); setModalBusy(false); showToast(editingPlanId ? "Outfit plan updated." : "Added to your outfit planner.");
  }

  async function submitLook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "A look to remember").trim();
    const lookOccasion = String(form.get("occasion") || "Personal look");
    const photo = form.get("photo") as File | null;
    if (photo && photo.size > 10 * 1024 * 1024) { setModalError("Choose an image smaller than 10 MB."); setModalBusy(false); return; }
    const supabase = createClient();
    let coverPath: string | null = null;
    try {
      if (photo && photo.size) {
        if (!["image/jpeg","image/png","image/webp"].includes(photo.type)) throw new Error("Use a JPG, PNG or WebP image.");
        coverPath = user.id + "/lookbook/" + crypto.randomUUID() + "-" + photo.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-80);
        const { error } = await supabase.storage.from("wardrobe-private").upload(coverPath, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
        if (error) throw error;
      }
      const { data, error } = await supabase.from("outfits").insert({ user_id: user.id, title: title.slice(0,120), occasion: lookOccasion, status: "worn", source: "manual", worn_at: new Date().toISOString(), cover_image_path: coverPath }).select("*").single();
      if (error || !data) { if (coverPath) await supabase.storage.from("wardrobe-private").remove([coverPath]); throw error || new Error("Couldn't save this look."); }
      await createClient().from("outfit_feedback").insert({ user_id: user.id, outfit_id: data.id, reaction: "wore", note: "Added to lookbook" });
      await loadData(user.id); setModal(null); showToast("Added to your private lookbook.");
    } catch (error) { setModalError(error instanceof Error ? error.message : "Couldn't add this look."); }
    finally { setModalBusy(false); }
  }

  async function submitWish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const url = String(form.get("url") || "").trim();
    const note = String(form.get("note") || "").trim();
    if (url && !safeExternalUrl(url)) { setModalError("Use a valid HTTPS product URL."); setModalBusy(false); return; }
    const { error } = await createClient().from("wishlist_items").insert({ user_id: user.id, title, product_url: url || null, note: note || null });
    if (error) setModalError(error.message || "Couldn't save that wishlist idea.");
    else { await loadData(user.id); setModal(null); showToast("Added to your wishlist."); }
    setModalBusy(false);
  }

  async function deleteWish(wish: Wish) {
    if (!user || !window.confirm("Remove this wishlist item?")) return;
    const { error } = await createClient().from("wishlist_items").delete().eq("id", wish.id).eq("user_id", user.id);
    if (error) showToast("Couldn't remove this wishlist item."); else { setWishlist(prev => prev.filter(w => w.id !== wish.id)); showToast("Removed from wishlist."); }
  }

  async function submitMerchant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/merchant-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand_name: String(form.get("brand") || "").trim(), contact_email: String(form.get("email") || "").trim(), website: String(form.get("website") || "").trim(), notes: String(form.get("notes") || "").trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't submit the application.");
      setModal(null); showToast("Merchant application received.");
    } catch (error) { setModalError(error instanceof Error ? error.message : "Couldn't submit this application."); }
    finally { setModalBusy(false); }
  }

  async function submitProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setModalBusy(true); setModalError("");
    const form = new FormData(e.currentTarget);
    const rawPrice = String(form.get("price") || "").trim();
    const payload = { title: String(form.get("title") || "").trim(), description: String(form.get("description") || "").trim() || null, category: String(form.get("category") || "Other"), brand: String(form.get("brand") || "").trim() || null, merchant: String(form.get("merchant") || "").trim(), currency: String(form.get("currency") || "KES"), price: rawPrice ? Number(rawPrice) : null, image_url: String(form.get("image_url") || "").trim() || null, product_url: String(form.get("product_url") || "").trim(), affiliate_url: String(form.get("affiliate_url") || "").trim() || null, country_code: [String(form.get("country_code") || "KE")], sizes: [], is_active: form.get("is_active") === "on", is_approved: false, source: "admin-entered" };
    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't add the product.");
      setAdminProducts(prev => [result.product, ...prev]); setModal(null); showToast("Product saved. Admin approval is required before customers can see it.");
    } catch (error) { setModalError(error instanceof Error ? error.message : "Couldn't add the product."); }
    finally { setModalBusy(false); }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm("Delete " + product.title + " from the catalog?")) return;
    const response = await fetch("/api/admin/products?id=" + encodeURIComponent(product.id), { method: "DELETE" });
    if (!response.ok) { showToast("Couldn't delete that product."); return; }
    setAdminProducts(prev => prev.filter(p => p.id !== product.id)); showToast("Product deleted.");
  }

  async function toggleProduct(product: Product, key: "is_active" | "is_approved") {
    const next = !Boolean((product as any)[key]);
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id, changes: { [key]: next } }) });
    const result = await response.json();
    if (!response.ok) { showToast(result.error || "Couldn't update product."); return; }
    setAdminProducts(prev => prev.map(p => p.id === product.id ? result.product : p));
    showToast(key === "is_approved" ? (next ? "Product approved." : "Approval removed.") : (next ? "Product activated." : "Product hidden."));
  }

  async function savePreferences(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    setSavingProfile(true);
    const form = new FormData(e.currentTarget);
    const nextPreferences = { ...profile.style_preferences, style: String(form.get("style") || "Relaxed minimal"), avoidedColors: String(form.get("avoid") || "").split(",").map(s=>s.trim()).filter(Boolean).slice(0,12), notes: String(form.get("notes") || "").trim().slice(0,1200), preferredCurrency: String(form.get("currency") || "KES"), locationCity: String(form.get("city") || "").trim().slice(0,100) };
    const fullName = String(form.get("full_name") || "").trim().slice(0,100);
    const { error } = await createClient().from("profiles").update({ full_name: fullName, style_preferences: nextPreferences, onboarding_completed: true, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) showToast("Preferences couldn't be saved. Please try again."); else { setProfile({ ...profile, full_name: fullName, style_preferences: nextPreferences, onboarding_completed: true }); showToast("Your style preferences are saved."); }
    setSavingProfile(false);
  }

  async function signOut() {
    try { const { error } = await createClient().auth.signOut(); if (error) throw error; router.replace("/auth"); router.refresh(); }
    catch { showToast("Couldn't sign out. Check your connection and retry."); }
  }

  async function deleteAccount() {
    if (!user?.email) return;
    const confirmationEmail = window.prompt("This permanently deletes your LOOKU account, wardrobe metadata and private photos. Type your account email to confirm: " + user.email);
    if (!confirmationEmail) return;
    try {
      const response = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmationEmail }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account deletion failed.");
      try { await createClient().auth.signOut(); } catch { /* Account already deleted server-side. */ }
      window.location.replace("/auth");
    } catch (error) { showToast(error instanceof Error ? error.message : "Account deletion failed."); }
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), profile, wardrobe: items.map(({ image_url, ...x }) => x), savedOutfits: outfits, plans, wishlist, note: "Export contains wardrobe metadata and storage paths, not the private image binary files." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "looku-personal-data.json"; a.click(); URL.revokeObjectURL(url);
    showToast("Your data export was prepared.");
  }

  async function sendChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const text = chatInput.trim(); if (!text || styling) return;
    setChat(prev => [...prev, { role: "user", text }]); setChatInput("");
    await generateLooks(text, occasion, true);
  }

  function openEditGarment(item: WardrobeItem) { setEditingGarment(item); setModalError(""); setModal("edit-garment"); }

  function openModal(next: Modal, outfitId: string | null = null, planDate = todayIso(), plan?: OutfitPlan) {
    setModalError(""); setModalOutfitId(plan?.outfit_id || outfitId); setModalDate(planDate);
    setEditingPlanId(plan?.id || null); setModalPlanTitle(plan?.event_title || "Outfit plan");
    setModalPlanOccasion(plan?.occasion || occasion); setModalPlanNotes(plan?.notes || "");
    setModal(next);
  }
  function outfitItems(outfit: Outfit | OutfitIdea) {
    const ids = "item_ids" in outfit ? outfit.item_ids : outfit.itemIds;
    return ids.map(id => items.find(item => item.id === id)).filter((item): item is WardrobeItem => Boolean(item));
  }
  function outfitCover(outfit: Outfit) {
    if (outfit.cover_url) return outfit.cover_url;
    return outfitItems(outfit).find(item => item.image_url)?.image_url || heroImage;
  }

  function replaceGeneratedPiece(outfitIndex: number, originalId: string, replacementId: string) {
    const replacement = availableItems.find(item => item.id === replacementId);
    const original = availableItems.find(item => item.id === originalId);
    if (!replacement || !original || replacement.category !== original.category) return;
    setGenerated(previous => previous.map((idea, index) => index !== outfitIndex ? idea : ({
      ...idea,
      itemIds: idea.itemIds.map(id => id === originalId ? replacementId : id),
      reason: "You swapped " + original.name + " for " + replacement.name + ". Review the updated combination and save it if it works for you.",
    })));
    showToast("Piece replaced. The rest of the look stayed in place.");
  }

  function renderOutfitIdea(idea: OutfitIdea, index: number) {
    const pieces = outfitItems(idea);
    return <article className="surface" key={idea.title + index} style={{ padding: 16 }}>
      <div className="row" style={{ alignItems: "start", marginBottom: 15 }}>
        <div><span className="badge">{idea.style || "Personal edit"}</span><h3 style={{ fontSize: 21, fontWeight: 500, fontFamily: "Georgia,serif", margin: "11px 0 6px" }}>{idea.title}</h3><p className="small muted" style={{ margin: 0, lineHeight: 1.6 }}>{idea.reason}</p></div>
        <span className="badge neutral">LOOK {index + 1}</span>
      </div>
      <div className="outfit-composition">{pieces.map(item => <div className="piece-card" key={item.id}><img src={item.image_url || ""} alt={item.name} loading="lazy"/><div className="piece-info"><span className="piece-name">{item.name}</span><span className="piece-meta">{item.category} · {(item.colors || []).slice(0,2).join(", ") || "Color not set"}</span><select aria-label={"Replace "+item.name} className="input" value={item.id} onChange={e=>replaceGeneratedPiece(index,item.id,e.target.value)} style={{padding:"7px",fontSize:10,marginTop:8}}>{availableItems.filter(candidate=>candidate.category===item.category&&(candidate.id===item.id||!idea.itemIds.includes(candidate.id))).map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></div></div>)}</div>
      {idea.confidenceNote && <p className="tiny muted" style={{ margin: "12px 0 0" }}>{idea.confidenceNote}</p>}
      <div className="tool-row" style={{ marginTop: 14 }}>
        <button className="button primary compact" disabled={modalBusy} onClick={() => void saveOutfit(idea)}><Bookmark size={14}/>Save this look</button>
        <button className="button compact" onClick={() => { setMood("Keep the idea but make it more relaxed."); void generateLooks("Keep the idea but make it more relaxed.", occasion); }}>More relaxed</button>
        <button className="button compact" onClick={() => { setMood("Keep the general style but make it more formal."); void generateLooks("Keep the general style but make it more formal.", occasion); }}>More formal</button>
      </div>
    </article>;
  }

  function renderModal() {
    if (!modal) return null;
    let title = "";
    let content: ReactNode = null;
    const close = () => { if (!modalBusy) { setModal(null); setModalError(""); } };
    if (modal === "edit-garment" && editingGarment) {
      title = "Edit garment details";
      content = <form onSubmit={submitEditGarment}>
        <div style={{ display:"flex",gap:13,alignItems:"center",marginBottom:18 }}>
          {editingGarment.image_url ? <img src={editingGarment.image_url} alt={editingGarment.name} style={{width:82,height:96,objectFit:"cover",borderRadius:12}}/> : <div className="avatar lg"><Shirt/></div>}
          <div><span className="badge neutral">Your item</span><p className="small muted" style={{lineHeight:1.6,margin:"8px 0 0"}}>Correct any AI-generated details. Your original photo stays private and unchanged.</p></div>
        </div>
        <label className="field">Garment name<input className="input" name="name" required maxLength={100} defaultValue={editingGarment.name}/></label>
        <label className="field">Category<select className="input" name="category" defaultValue={editingGarment.category}>{categories.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select></label>
        <label className="field">Main colors <small>Separate multiple colors with commas</small><input className="input" name="colors" maxLength={160} defaultValue={(editingGarment.colors||[]).join(", ")} placeholder="e.g. navy, cream"/></label>
        <label className="field">Brand (optional)<input className="input" name="brand" maxLength={120} defaultValue={editingGarment.brand||""}/></label>
        <label className="field">Original product page (optional)<input className="input" name="product_url" type="url" defaultValue={String(editingGarment.attributes?.productUrl||"")} placeholder="https://…"/></label>
        <label className="field">Formality · <span className="muted">1 casual to 10 formal</span><input className="input" name="formality" type="range" min="1" max="10" defaultValue={editingGarment.formality} style={{padding:"7px 0",border:0,boxShadow:"none"}}/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close} disabled={modalBusy}>Cancel</button><button type="submit" className="button primary" disabled={modalBusy}>{modalBusy?"Saving…":"Save changes"}</button></div>
      </form>;
    } else if (modal === "garment") {
      title = "Add to your wardrobe";
      content = <form onSubmit={submitGarment}>
        <p className="small muted" style={{ lineHeight: 1.6, marginBottom: 17 }}>Upload a clear photo of one garment. Your image is stored privately. LOOKU will try to identify the garment, and you can correct the details afterwards.</p>
        <div className="field"><span>Garment photographs</span><div className="upload-box"><Camera/><strong style={{ display: "block", fontSize: 12 }}>Choose one or several photos</strong><small>JPG, PNG or WebP · Up to 10 MB each · 12 per batch</small><input id="garment-photo" type="file" name="image" accept="image/jpeg,image/png,image/webp" multiple required/><label htmlFor="garment-photo" className="button compact" style={{ marginTop: 12 }}>Browse photos</label></div></div>
        <label className="field">Item name <small>Required for one photo; batch uploads start with each file name</small><input className="input" name="name" maxLength={100} placeholder="e.g. Blue linen shirt"/></label>
        <div className="twocol">
          <label className="field">Category<select className="input" name="category" defaultValue="Tops">{categories.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="field">Main color<input className="input" name="color" placeholder="e.g. navy blue"/></label>
        </div>
        <label className="field">Brand (optional)<input className="input" name="brand" maxLength={120} placeholder="Brand or maker"/></label>
        <label className="field">Original product page (optional)<small>For a garment you own; this saves a link but does not import retailer data.</small><input className="input" name="product_url" type="url" placeholder="https://…"/></label>
        <label className="field">Formality · <span className="muted">1 casual to 10 formal</span><input className="input" type="range" name="formality" min="1" max="10" defaultValue="5" style={{ padding: "7px 0", border: 0, boxShadow: "none" }}/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close} disabled={modalBusy}>Cancel</button><button type="submit" className="button primary" disabled={modalBusy}>{modalBusy?<><LoaderCircle className="spin-icon" size={15}/> Saving…</>:<><Upload size={15}/>Save garment</>}</button></div>
      </form>;
    } else if (modal === "plan") {
      title = "Plan an outfit";
      content = <form onSubmit={submitPlan}>
        <label className="field">Date<input className="input" name="date" type="date" required defaultValue={modalDate}/></label>
        <label className="field">Event name<input className="input" name="title" required maxLength={140} defaultValue={modalPlanTitle} placeholder="Client meeting, dinner, travel…"/></label>
        <label className="field">Occasion<select className="input" name="occasion" defaultValue={modalPlanOccasion}>{occasions.map(o=><option key={o}>{o}</option>)}</select></label>
        <label className="field">Attach a saved look (optional)<select className="input" name="outfit_id" defaultValue={modalOutfitId || ""}><option value="">Choose later</option>{savedLooks.map(o=><option key={o.id} value={o.id}>{o.title} · {o.occasion}</option>)}</select></label>
        <label className="field">Notes (optional)<textarea className="input textarea" name="notes" defaultValue={modalPlanNotes} maxLength={1200} placeholder="Dress code, comfort needs, details to remember…"/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={modalBusy}>{modalBusy?"Saving…":"Save plan"}</button></div>
      </form>;
    } else if (modal === "wish") {
      title = "Save a shopping idea";
      content = <form onSubmit={submitWish}>
        <p className="small muted" style={{ lineHeight: 1.6 }}>Save an item you found online. We don't scrape the page or claim current stock; this is your personal wishlist until an approved catalog feed is connected.</p>
        <label className="field">Item name<input className="input" name="title" required maxLength={160} placeholder="e.g. Olive overshirt"/></label>
        <label className="field">Product URL (optional)<input className="input" name="url" type="url" placeholder="https://…"/></label>
        <label className="field">Why you want it<input className="input" name="note" maxLength={500} placeholder="What would it work with?"/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={modalBusy}>{modalBusy?"Saving…":"Add to wishlist"}</button></div>
      </form>;
    } else if (modal === "look") {
      title = "Record a look";
      content = <form onSubmit={submitLook}>
        <p className="small muted" style={{ lineHeight: 1.6 }}>Save what you actually wore. The photo is private by default and can be removed by deleting the look.</p>
        <label className="field">Look name<input className="input" name="title" maxLength={120} required placeholder="Tuesday's relaxed edit"/></label>
        <label className="field">Occasion<select className="input" name="occasion" defaultValue={occasion}>{occasions.map(o=><option key={o}>{o}</option>)}</select></label>
        <label className="field">Photo (optional)<input className="input" type="file" name="photo" accept="image/jpeg,image/png,image/webp"/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={modalBusy}>{modalBusy?"Saving…":"Save to lookbook"}</button></div>
      </form>;
    } else if (modal === "merchant") {
      title = "Partner with LOOKU";
      content = <form onSubmit={submitMerchant}>
        <p className="small muted" style={{ lineHeight: 1.6 }}>We review partnerships before showing products. Only submit details you're authorized to share.</p>
        <label className="field">Brand or store name<input className="input" name="brand" required maxLength={120}/></label>
        <label className="field">Contact email<input className="input" name="email" type="email" required maxLength={200}/></label>
        <label className="field">Website<input className="input" name="website" type="url" required placeholder="https://yourstore.com"/></label>
        <label className="field">Catalog / partnership details<textarea className="input textarea" name="notes" maxLength={1200} placeholder="Product feed, supported regions, image permissions, referral terms…"/></label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={modalBusy}>{modalBusy?"Submitting…":"Send application"}</button></div>
      </form>;
    } else if (modal === "product") {
      title = "Add a catalog product";
      content = <form onSubmit={submitProduct}>
        <p className="small muted" style={{ lineHeight: 1.6 }}>Only add products where LOOKU has permission to display the image and destination. New products stay hidden until approved.</p>
        <label className="field">Product title<input className="input" name="title" required maxLength={180}/></label>
        <div className="twocol"><label className="field">Brand<input className="input" name="brand"/></label><label className="field">Merchant<input className="input" name="merchant" required/></label></div>
        <div className="twocol"><label className="field">Category<select className="input" name="category">{categories.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select></label><label className="field">Price<input className="input" name="price" type="number" step="0.01" min="0" placeholder="Optional"/></label></div>
        <label className="field">Currency<select className="input" name="currency"><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
        <label className="field">Product page URL<input className="input" name="product_url" type="url" required placeholder="https://…"/></label>
        <label className="field">Approved image URL<input className="input" name="image_url" type="url" placeholder="https://…"/></label>
        <label className="field">Tracked affiliate URL (optional)<input className="input" name="affiliate_url" type="url" placeholder="https://…"/></label>
        <label className="field">Description<textarea className="input textarea" name="description" maxLength={1500}/></label>
        <label className="field" style={{display:"flex",alignItems:"center",gridTemplateColumns:"auto 1fr",gap:8}}><input type="checkbox" name="is_active"/> Activate after review</label>
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <div className="modal-actions"><button type="button" className="button" onClick={close}>Cancel</button><button className="button primary" disabled={modalBusy}>{modalBusy?"Saving…":"Save product"}</button></div>
      </form>;
    } else { return null; }
    return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2 className="modal-title">{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={17}/></button></div>{content}</section></div>;
  }

  function renderToday() {
    const latest = outfits.find(o => o.status === "saved" || o.status === "worn" || o.status === "planned");
    const latestItems = latest ? outfitItems(latest) : [];
    return <>
      <div className="today-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR DAILY EDIT · {formatDate(todayIso(), { weekday: "long", month: "long", day: "numeric" })}</span>
          <h1 className="page-title serif">Good morning,<br/>{greetingName}.</h1>
          <p className="page-subtitle">{items.length ? "Your wardrobe is here. Let's find something that feels like you." : "Start with a few pieces you already own. Your first good outfit is closer than you think."}</p>
          <div className="hero-actions"><button className="button primary" onClick={() => { switchScreen("Stylist"); if (availableItems.length >= 2) void generateLooks("Choose the best all-round outfit for my day.", occasion); }} disabled={styling}><Sparkles size={15}/>{styling?"Styling your wardrobe…":"Find my look"}<ArrowRight size={15}/></button><button className="button" onClick={() => switchScreen("Closet")}>Open my closet</button></div>
          <div className="row" style={{ justifyContent: "start", gap: 10, marginTop: 25, flexWrap: "wrap" }}><span className="badge neutral"><Shirt size={13}/>{items.length} pieces</span><span className="badge neutral"><CalendarCheck size={13}/>{todayPlans.length} plans today</span><span className="badge neutral"><Heart size={13}/>{savedLooks.length} saved looks</span></div>
        </div>
        <div className="hero-visual"><img src={heroImage} alt="Editorial fashion inspiration, not an outfit generated from your wardrobe" /><div className="hero-overlay"><div><span className="eyebrow">A NOTE TO SELF</span><strong>Style isn't more clothes. It's more ways to wear what you have.</strong></div><Sparkles size={21}/></div></div>
      </div>
      {weather && <div className="surface row section" style={{ marginTop: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="avatar"><CloudSun size={19}/></div><div><strong style={{ fontSize: 13 }}>{weather.location.name}{weather.location.region ? ", "+weather.location.region : ""} · {Math.round(weather.current.tempC)}°C</strong><p className="tiny muted" style={{ margin: "4px 0 0" }}>{weather.current.condition} · Feels like {Math.round(weather.current.feelsLikeC)}°C · Wind {Math.round(weather.current.windKph)} km/h</p></div></div>
        <span className="badge neutral">Live weather</span>
      </div>}
      {weatherMessage && <div className="section" style={{ marginTop: 12 }}><div className="notice">{weatherMessage} <button className="text-action" onClick={()=>switchScreen("Settings")}>Update preferences</button></div></div>}
      {!weatherCity && <p className="tiny muted section" style={{ marginTop: 12 }}>Tip: add your city in Preferences to enable local weather context once a weather-provider key is connected.</p>}
      {!profile.onboarding_completed && <div className="surface soft section" style={{marginTop:18}}><span className="badge"><Sparkles size={12}/>YOUR FIRST EDIT</span><h2 className="section-title" style={{marginTop:12}}>A little about your style goes a long way.</h2><p className="section-note">Add a few preferences and some pieces you already own. LOOKU can then start building combinations around your actual clothes.</p><div className="tool-row" style={{marginTop:15}}><button className="button primary compact" onClick={()=>switchScreen("Settings")}>Set my preferences <ArrowRight size={13}/></button><button className="button compact" onClick={()=>openModal("garment")}><Plus size={13}/>Add clothes</button></div></div>}
      <section className="section">
        <div className="section-head"><div><span className="eyebrow">START WITH THE MOMENT</span><h2 className="section-title">What's on today?</h2><p className="section-note">Choose the context. The stylist will use only clothes you own and have marked available.</p></div></div>
        <div className="filter-row">{occasions.slice(0,8).map(o=><button key={o} className={"filter-pill "+(occasion===o?"active":"")} onClick={() => setOccasion(o)}>{o}</button>)}</div>
        {aiError && <div style={{ marginBottom: 16 }}><ErrorNotice>{aiError}</ErrorNotice></div>}
        <div className="quick-grid">
          <button className="quick-card" onClick={() => { switchScreen("Stylist"); void generateLooks("Create a comfortable, polished outfit for an ordinary day.", "Everyday"); }}><Sparkles/><strong>Everyday edit</strong><span>Easy combinations from your closet</span></button>
          <button className="quick-card" onClick={() => { setOccasion("Work / Presentation"); switchScreen("Stylist"); void generateLooks("Smart and confident; polished but not overdressed.", "Work / Presentation"); }}><Layers3/><strong>Work & occasions</strong><span>Match the dress code and your comfort</span></button>
          <button className="quick-card" onClick={() => openModal("plan")}><CalendarPlus/><strong>Plan ahead</strong><span>Save a look for a date or event</span></button>
          <button className="quick-card" onClick={() => switchScreen("Looks")}><ImagePlus/><strong>Keep a memory</strong><span>Save what you actually wore</span></button>
        </div>
      </section>
      <section className="section">
        <div className="section-head"><div><span className="eyebrow">YOUR PERSONAL CLOSET</span><h2 className="section-title">Made from what you own.</h2><p className="section-note">No imaginary pieces. Your actual wardrobe is the source of truth.</p></div><button className="button compact" onClick={() => switchScreen("Closet")}>View closet <ArrowRight size={14}/></button></div>
        {latest && latestItems.length > 0 ? <div className="surface">
          <div className="row" style={{ marginBottom: 15 }}><div><span className="badge">{latest.status === "worn" ? "WORN" : latest.status === "planned" ? "PLANNED" : "SAVED LOOK"}</span><h3 style={{ margin: "10px 0 5px", font: "400 25px Georgia,serif" }}>{latest.title}</h3><p className="small muted" style={{ margin: 0 }}>{latest.occasion} · {formatDate(latest.created_at)}</p></div><button className="button compact" onClick={() => switchScreen("Looks")}>Open lookbook</button></div>
          <div className="outfit-composition">{latestItems.slice(0,4).map(item => <div key={item.id} className="piece-card"><img src={item.image_url || ""} alt={item.name}/><div className="piece-info"><span className="piece-name">{item.name}</span><span className="piece-meta">{item.category}</span></div></div>)}</div>
        </div> : <EmptyState icon={WandSparkles} title={items.length < 2 ? "Your first look starts with your clothes." : "Your wardrobe is ready for its first edit."} body={items.length < 2 ? "Add at least two available garments to let the stylist build complete combinations. A few tops, bottoms and shoes are a good start." : "Generate a few outfit options, save the ones you like, and LOOKU will remember your choices."} action={items.length < 2 ? "Add garments" : "Meet your stylist"} onAction={() => items.length < 2 ? openModal("garment") : switchScreen("Stylist")}/>}
      </section>
      <section className="section">
        <div className="section-head"><div><span className="eyebrow">YOUR WEEK, LESS RUSHED</span><h2 className="section-title">Coming up</h2></div><button className="button compact" onClick={() => switchScreen("Plan")}>Open planner <ArrowRight size={14}/></button></div>
        {plans.length ? <div className="stack">{plans.filter(p => p.plan_date >= todayIso()).slice(0,3).map(p=><div className="surface row" key={p.id}><div style={{ display: "flex", gap: 13, alignItems: "center" }}><div className="avatar"><CalendarDays size={16}/></div><div><strong style={{ fontSize: 13 }}>{p.event_title}</strong><div className="tiny muted" style={{ marginTop: 5 }}>{formatDate(p.plan_date)} · {p.occasion}</div></div></div><ArrowRight size={15} className="muted"/></div>)}</div> : <div className="surface row"><div><strong style={{ fontSize: 13 }}>No outfits planned yet</strong><p className="small muted" style={{ margin: "5px 0 0" }}>Save time by choosing what to wear before the day begins.</p></div><button className="button compact" onClick={() => openModal("plan")}>Plan a look <Plus size={14}/></button></div>}
      </section>
    </>;
  }

  function renderCloset() {
    return <>
      <div className="row" style={{ alignItems: "start" }}><div><span className="eyebrow">THE PIECES THAT MAKE YOU, YOU</span><h1 className="page-title serif">My closet.</h1><p className="page-subtitle">{items.length} pieces in your collection · {availableItems.length} ready to wear. Add items as you go; there's no need to photograph everything today.</p></div><button className="button primary" onClick={() => openModal("garment")}><Plus size={15}/>Add clothes</button></div>
      <div className="stat-grid section"><div className="stat"><span className="stat-label">Wardrobe pieces</span><div className="stat-number">{items.length}</div><span className="stat-caption">Clothing you own</span></div><div className="stat"><span className="stat-label">Ready to wear</span><div className="stat-number">{availableItems.length}</div><span className="stat-caption">Available for styling</span></div><div className="stat"><span className="stat-label">Saved combinations</span><div className="stat-number">{savedLooks.length}</div><span className="stat-caption">Your personal outfit history</span></div></div>
      <div className="tool-row section" style={{ marginTop: 26 }}><div className="search-wrap"><Search/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, brand or color…" aria-label="Search wardrobe"/></div><button className="button" onClick={() => setFilter(filter==="All"?"Tops":"All")}><SlidersHorizontal size={14}/>{filter==="All"?"Filter":"Clear filter"}</button></div>
      <div className="filter-row">{categories.map(cat=><button key={cat} className={"filter-pill "+(filter===cat?"active":"")} onClick={()=>setFilter(cat)}>{cat}{cat==="All"?" ("+items.length+")":""}</button>)}</div>
      {loadingData ? <div className="garment-grid">{[1,2,3,4].map(n=><div key={n} className="garment-card"><div className="skeleton" style={{height:210}}/><div style={{padding:13}}><div className="skeleton" style={{height:12,width:"70%"}}/><div className="skeleton" style={{height:10,width:"45%",marginTop:10}}/></div></div>)}</div> : filteredItems.length ? <div className="garment-grid">{filteredItems.map(item=><article className="garment-card" key={item.id}>
        {item.image_url ? <img className="garment-image" src={item.image_url} alt={item.name} loading="lazy"/> : <div className="garment-image" style={{ display: "grid", placeItems: "center" }}><Shirt size={35} color="#8c8f82"/></div>}
        <div className="garment-content"><div className="row" style={{ gap: 5 }}><h3 title={item.name}>{item.name}</h3><span className={"tag"}>{item.status==="available"?"Ready":item.status==="laundry"?"Laundry":"Retired"}</span></div><p>{item.brand ? item.brand+" · " : ""}{item.category} · {(item.colors||[]).join(", ")||"Color not set"}</p>{safeExternalUrl(String(item.attributes?.productUrl||""))&&<a className="text-action" style={{display:"inline-block",marginTop:7}} href={safeExternalUrl(String(item.attributes?.productUrl||""))||undefined} target="_blank" rel="noreferrer">Product source <ExternalLink size={11} style={{display:"inline"}}/></a>}<div className="tool-row"><button className="button compact" onClick={()=>{ setMood("Style the garment named "+item.name+" ("+item.category+"). Keep this piece in the outfit."); setScreen("Stylist"); void generateLooks("Style the garment named "+item.name+" and keep it in the outfit.", occasion); }}><Sparkles size={12}/>Style</button><button className="icon-button" title="Edit garment details" onClick={()=>openEditGarment(item)} style={{height:32,width:32}}><Pencil size={14}/></button><button className="icon-button" title={item.status==="available"?"Mark as in laundry":"Mark ready to wear"} onClick={()=>void toggleGarmentStatus(item)} style={{height:32,width:32}}>{item.status==="available"?<Clock3 size={14}/>:<Check size={14}/>}</button><button className="icon-button" title="Remove garment" onClick={()=>void removeGarment(item)} style={{height:32,width:32}}><Trash2 size={14}/></button></div></div>
      </article>)}</div> : <EmptyState icon={Shirt} title={search || filter!=="All" ? "No pieces match this view." : "Your closet should feel like yours."} body={search || filter!=="All" ? "Try another search or category." : "Add real clothes you own. LOOKU keeps them private, recognizes their attributes where AI is available, and uses available pieces when building outfits."} action={search || filter!=="All" ? "Clear filters" : "Add your first garment"} onAction={()=>search || filter!=="All" ? (setSearch(""),setFilter("All")) : openModal("garment")}/>}
      <div className="privacy-banner section"><LockKeyhole/><span><strong>Private by default.</strong> Garment images are stored in a private bucket and delivered with short-lived signed URLs. Only your account can access your wardrobe.</span></div>
    </>;
  }

  function renderStylist() {
    return <>
      <div><span className="eyebrow">LESS GUESSWORK. MORE YOU.</span><h1 className="page-title serif">Meet your stylist.</h1><p className="page-subtitle">Tell LOOKU what matters today. It will build around available pieces in your wardrobe and explain the thinking behind each look.</p></div>
      <div className="stylist-layout section">
        <section className="chat-panel">
          <div className="chat-head"><div className="avatar" style={{ background: "#e7eade" }}><Sparkles size={17}/></div><div style={{ flex: 1 }}><strong style={{ fontSize: 13 }}>LOOKU Stylist</strong><div className="tiny muted" style={{ marginTop: 4 }}>Wardrobe-aware · Personal · Private</div></div><span className="badge neutral"><ShieldCheck size={12}/>Your closet only</span></div>
          <div className="chat-messages" aria-live="polite">{chat.map((message,i)=><div className={"chat-bubble "+(message.role==="user"?"user":"")} key={i}>{message.text}</div>)}{styling && <div className="chat-bubble"><LoaderCircle size={15} className="spin-icon" style={{ display:"inline",verticalAlign:"middle",marginRight:7 }}/>Checking your available pieces and building looks…</div>}</div>
          <form className="chat-compose" onSubmit={sendChat}><textarea className="input textarea" rows={2} maxLength={1000} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="e.g. Interview tomorrow, smart but not too formal…" aria-label="Describe your styling request"/><button className="button primary" type="submit" disabled={styling||!chatInput.trim()} aria-label="Send styling request"><ArrowRight size={16}/></button></form>
        </section>
        <aside className="chat-side">
          <div className="surface"><span className="eyebrow">SET THE SCENE</span><label className="field" style={{ marginTop: 15 }}>Occasion<select className="input" value={occasion} onChange={e=>setOccasion(e.target.value)}>{occasions.map(o=><option key={o}>{o}</option>)}</select></label><label className="field">Style direction<select className="input" value={styleName} onChange={async e=>{const prefs={...profile.style_preferences,style:e.target.value};setProfile(p=>({...p,style_preferences:prefs}));if(user){const {error}=await createClient().from("profiles").update({style_preferences:prefs}).eq("id",user.id);if(error)showToast("Could not save preference yet.");}}}>{styles.map(s=><option key={s}>{s}</option>)}</select></label><button className="button primary" style={{ width:"100%" }} onClick={()=>void generateLooks(mood||"Give me three distinct complete outfit options for the selected occasion. Respect my saved style preferences.",occasion)} disabled={styling}><WandSparkles size={15}/>{styling?"Working…":"Generate outfit ideas"}</button></div>
          <div className="surface soft"><span className="eyebrow">YOUR STYLE MEMORY</span><p style={{ fontSize: 12, lineHeight: 1.7, margin: "10px 0 13px" }}>The stylist can use saved preferences and the feedback you give it. Explicit likes and dislikes are stored to improve future ranking.</p><button className="button compact" onClick={()=>switchScreen("Settings")}>Edit preferences <ArrowRight size={13}/></button></div>
          <div className="surface"><span className="eyebrow">A FEW GOOD PROMPTS</span><div className="stack" style={{ gap: 8, marginTop: 12 }}>{["Make this more relaxed without changing the shoes.","Build a complete look around my favorite item.","Plan something comfortable for a warm day.","Avoid repeating the trousers I wore yesterday."].map(p=><button key={p} onClick={()=>{setChatInput(p);}} className="button ghost" style={{ justifyContent:"start",borderRadius:12,whiteSpace:"normal",textAlign:"left",lineHeight:1.5 }}>{p}</button>)}</div></div>
        </aside>
      </div>
      <section className="section"><div className="section-head"><div><span className="eyebrow">YOUR NEW EDIT</span><h2 className="section-title">Outfit ideas</h2><p className="section-note">AI-generated suggestions are validated against actual available wardrobe item IDs.</p></div></div>
        {aiError && <div style={{ marginBottom: 15 }}><ErrorNotice>{aiError}</ErrorNotice></div>}
        {generated.length ? <div className="stack">{generated.map((idea,index)=>renderOutfitIdea(idea,index))}</div> : <EmptyState icon={WandSparkles} title="Your next look starts here." body={availableItems.length<2 ? "Add at least two available pieces to your closet. The stylist won't invent garments for you." : "Describe a situation or generate three outfit ideas. Each option will use only clothes you own."} action={availableItems.length<2?"Open closet":"Generate outfit ideas"} onAction={()=>availableItems.length<2?switchScreen("Closet"):void generateLooks("Build three distinct outfits appropriate for my day.",occasion)}/>}
      </section>
    </>;
  }

  function renderPlanner() {
    const start = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const first = new Date(start.getFullYear(), start.getMonth(), 1).getDay();
    const daysInMonth = new Date(start.getFullYear(), start.getMonth()+1, 0).getDate();
    const monthLabel = start.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    return <>
      <div className="row" style={{ alignItems:"start" }}><div><span className="eyebrow">MAKE ROOM FOR YOUR DAY</span><h1 className="page-title serif">Plan your looks.</h1><p className="page-subtitle">Schedule outfits around real events. Calendar integration can be enabled later with explicit read-only permission.</p></div><button className="button primary" onClick={()=>openModal("plan")}><Plus size={15}/>Plan an outfit</button></div>
      <section className="surface section">
        <div className="row" style={{ alignItems: "start" }}><div><span className="eyebrow">OPTIONAL CALENDAR CONNECTION</span><h2 className="section-title">Bring your day into LOOKU.</h2><p className="section-note">Read-only Google Calendar access helps you spot upcoming occasions. LOOKU never edits or deletes your Google events.</p></div><CalendarDays size={25}/></div>
        <div className="tool-row" style={{ marginTop: 16 }}>
          {!calendarStatus.configured ? <button className="button primary" disabled title="Server configuration is required"><CalendarDays size={14}/>Connect Google Calendar</button>
            : calendarStatus.connected ? <><span className="badge"><Check size={12}/>Connected{calendarStatus.accountEmail ? " · "+calendarStatus.accountEmail : ""}</span><button className="button compact" onClick={()=>void refreshCalendarEvents()} disabled={calendarLoading}>{calendarLoading?"Refreshing…":"Refresh events"}</button><button className="button compact" onClick={()=>void disconnectCalendar()}>Disconnect</button></>
            : <a className="button primary" href="/api/calendar/connect"><CalendarDays size={14}/>Connect Google Calendar</a>}
        </div>
        {!calendarStatus.configured && <p className="tiny muted" style={{ lineHeight: 1.7, margin: "12px 0 0" }}>Provider setup is required before connecting: Google OAuth client credentials, a private token-encryption key and the LOOKU server database credentials. No calendar permission is requested until you start the connection.</p>}
        {calendarMessage && <div style={{ marginTop: 12 }}><ErrorNotice>{calendarMessage}</ErrorNotice></div>}
        {calendarLoading && <p className="small muted" style={{ marginTop: 14 }}><LoaderCircle size={14} className="spin-icon" style={{ display:"inline",verticalAlign:"middle",marginRight:6 }}/>Loading upcoming events…</p>}
        {calendarStatus.connected && calendarEvents.length===0 && !calendarLoading && <p className="small muted" style={{ marginTop: 14 }}>No upcoming events were returned for the next 45 days.</p>}
        {calendarEvents.length>0 && <div className="stack" style={{ marginTop: 15 }}>{calendarEvents.map(event=><div className="outfit-row" key={event.id}><div className="avatar"><CalendarDays size={15}/></div><div style={{ minWidth:0, flex:1 }}><strong>{event.title}</strong><small>{formatDate(event.start.slice(0,10))}{event.start.includes("T")?" · "+new Date(event.start).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):" · All day"}{event.location?" · "+event.location:""}</small></div><button className="button compact" onClick={()=>void importCalendarEvent(event)} disabled={plans.some(p=>p.external_event_id===event.id)}>{plans.some(p=>p.external_event_id===event.id)?"Added":"Add to LOOKU"}</button></div>)}</div>}
      </section>
      <div className="stat-grid section"><div className="stat"><span className="stat-label">Today</span><div className="stat-number">{todayPlans.length}</div><span className="stat-caption">Planned events</span></div><div className="stat"><span className="stat-label">Upcoming</span><div className="stat-number">{plans.filter(p=>p.plan_date>=todayIso()).length}</div><span className="stat-caption">Future outfit plans</span></div><div className="stat"><span className="stat-label">Saved looks</span><div className="stat-number">{savedLooks.length}</div><span className="stat-caption">Ready to reuse</span></div></div>
      <section className="surface section"><div className="calendar-header"><button className="icon-button" aria-label="Previous month" onClick={()=>setCalendarCursor(new Date(start.getFullYear(),start.getMonth()-1,1))}><ChevronLeft size={16}/></button><div style={{flex:1,textAlign:"center"}}><span className="eyebrow">YOUR CALENDAR</span><h2 className="section-title" style={{ marginTop: 7 }}>{monthLabel}</h2></div><button className="icon-button" aria-label="Next month" onClick={()=>setCalendarCursor(new Date(start.getFullYear(),start.getMonth()+1,1))}><ChevronRight size={16}/></button></div><div className="calendar-grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="eyebrow" style={{ textAlign:"center",paddingBottom:5 }}>{d}</div>)}{Array.from({length:first},(_,i)=><div key={"blank"+i}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),i+1);const iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(i+1).padStart(2,"0");const events=plans.filter(p=>p.plan_date===iso);return <button key={iso} className={"calendar-cell "+(iso===todayIso()?"today":"")} onClick={()=>{openModal("plan",null,iso);}} title={events.map(p=>p.event_title).join(", ")||"Plan this day"}><span className="day-label">{i+1}</span>{events.map(event=><span className="calendar-event" key={event.id}>{event.event_title}</span>)}</button>})}
      </div><p className="tiny muted" style={{ margin:"15px 0 0" }}>Choose a date to create a plan. The date is set in the form so you can add an event name, occasion and saved outfit.</p></section>
      <section className="section"><div className="section-head"><div><span className="eyebrow">UP NEXT</span><h2 className="section-title">Your upcoming plans</h2></div></div>
        {plans.filter(p=>p.plan_date>=todayIso()).length ? <div className="stack">{plans.filter(p=>p.plan_date>=todayIso()).sort((a,b)=>a.plan_date.localeCompare(b.plan_date)).map(plan=><div className="surface row" key={plan.id}><div style={{ display:"flex",gap:13,alignItems:"center",minWidth:0 }}><div className="avatar"><CalendarDays size={16}/></div><div style={{ minWidth:0 }}><strong style={{fontSize:13}}>{plan.event_title}</strong><p className="tiny muted" style={{margin:"5px 0 0"}}>{formatDate(plan.plan_date)} · {plan.occasion}{plan.notes?" · "+plan.notes:""}</p></div></div><div className="tool-row"><button className="button compact" onClick={()=>openModal("plan",plan.outfit_id,plan.plan_date,plan)}><Pencil size={12}/>Edit</button><button className="icon-button" onClick={async()=>{if(!user||!confirm("Delete this plan?"))return;const {error}=await createClient().from("outfit_plans").delete().eq("id",plan.id).eq("user_id",user.id);if(error)showToast("Couldn't remove plan.");else{setPlans(p=>p.filter(x=>x.id!==plan.id));showToast("Plan removed.");}}} aria-label="Delete plan"><Trash2 size={15}/></button></div></div>)}</div> : <EmptyState icon={CalendarDays} title="Your calendar has room." body="Add an event and attach a saved look, or create the plan now and choose an outfit later." action="Add your first plan" onAction={()=>openModal("plan")}/>}
      </section>
    </>;
  }

  function renderLooks() {
    return <>
      <div className="row" style={{ alignItems:"start" }}><div><span className="eyebrow">A PRIVATE RECORD OF YOUR STYLE</span><h1 className="page-title serif">Your lookbook.</h1><p className="page-subtitle">Saved combinations, outfits you wore and moments you want to remember. Nothing is public unless you choose to share it in a future community feature.</p></div><button className="button primary" onClick={()=>openModal("look")}><Plus size={15}/>Record a look</button></div>
      <div className="filter-row section"><button className="filter-pill active">All looks · {savedLooks.length}</button><span className="badge neutral"><LockKeyhole size={12}/>Private by default</span></div>
      {savedLooks.length ? <div className="look-grid">{savedLooks.map(outfit=>{const pieces=outfitItems(outfit);return <article className="look-card" key={outfit.id}><img src={outfit.cover_url||pieces.find(i=>i.image_url)?.image_url||heroImage} alt={outfit.title} loading="lazy"/><div className="look-info"><div className="row"><span className="badge neutral">{outfit.status==="worn"?"WORN":outfit.status==="planned"?"PLANNED":"SAVED"}</span><button className="icon-button" style={{width:30,height:30}} onClick={()=>void deleteOutfit(outfit)} aria-label="Delete look"><Trash2 size={13}/></button></div><strong style={{display:"block",marginTop:11}}>{outfit.title}</strong><p>{outfit.occasion} · {formatDate(outfit.worn_at||outfit.created_at)}</p>{pieces.length>0&&<p>{pieces.map(x=>x.name).join(" · ")}</p>}<div className="tool-row" style={{marginTop:12}}>{outfit.status!=="worn"&&<button className="button compact" onClick={()=>void markWorn(outfit)}><Check size={13}/>Wore this</button>}<button className="button compact" onClick={()=>void reactToOutfit(outfit,"like")} aria-label="Like look"><ThumbsUp size={13}/></button><button className="button compact" onClick={()=>void reactToOutfit(outfit,"dislike")} aria-label="Dislike look"><ThumbsDown size={13}/></button></div></div></article>})}</div> : <EmptyState icon={ImagePlus} title="Keep the looks you love." body="Save an AI-generated outfit or upload a real outfit photo. Over time this becomes a useful record of combinations you can repeat." action="Record a look" onAction={()=>openModal("look")}/>}
      <section className="section"><div className="section-head"><div><span className="eyebrow">THE IDEAS YOU'RE CONSIDERING</span><h2 className="section-title">Wishlist</h2><p className="section-note">Saved product links aren't owned clothing and won't be used in outfit generation.</p></div><button className="button compact" onClick={()=>openModal("wish")}><Plus size={13}/>Add idea</button></div>
      {wishlist.length ? <div className="stack">{wishlist.map(w=><div className="surface row" key={w.id}><div style={{minWidth:0}}><strong style={{fontSize:13}}>{w.title}</strong><p className="small muted" style={{margin:"5px 0 0"}}>{w.note||"Personal shopping idea"}{w.product_url&&safeHostname(w.product_url)?" · "+safeHostname(w.product_url):""}</p>{w.product_url&&safeExternalUrl(w.product_url)&&<a className="text-action" href={safeExternalUrl(w.product_url)||undefined} target="_blank" rel="noreferrer">Open retailer <ExternalLink size={11} style={{display:"inline"}}/></a>}</div><button className="icon-button" onClick={()=>void deleteWish(w)} aria-label="Remove wishlist idea"><Trash2 size={14}/></button></div>)}</div> : <div className="surface row"><div><strong style={{fontSize:12}}>Keep your future purchases intentional.</strong><p className="small muted" style={{margin:"5px 0 0"}}>Save a product URL and why it belongs in your wardrobe.</p></div><button className="button compact" onClick={()=>openModal("wish")}>Add wishlist idea</button></div>}
      </section>
    </>;
  }

  function renderShop() {
    return <>
      <div><span className="eyebrow">BUY WITH INTENTION</span><h1 className="page-title serif">The curated shop.</h1><p className="page-subtitle">Products should complement what you already own, fit your budget and be genuinely available. Only approved merchant listings appear here.</p></div>
      <div className="privacy-banner section"><ShieldCheck/><span><strong>No fake inventory.</strong> Prices and stock are not invented. The storefront will show only products with a reviewed source, permission to display their media, and a working merchant destination.</span></div>
      {admin&&<section className="surface section"><div className="row"><div><span className="eyebrow">MERCHANT CATALOG ADMIN</span><h2 className="section-title">Manage product listings</h2><p className="section-note">Only your allow-listed admin account can manage these records.</p></div><button className="button primary" onClick={()=>openModal("product")}><Plus size={14}/>Add product</button></div>
        {adminProducts.length ? <div className="stack" style={{marginTop:15}}>{adminProducts.map(p=><div className="outfit-row" key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="avatar"><ShoppingBag size={16}/></div>}<div style={{flex:1,minWidth:0}}><strong>{p.title}</strong><small>{p.merchant} · {p.currency} {p.price ?? "price not set"}</small><div className="tool-row" style={{marginTop:7}}><button className="button compact" onClick={()=>void toggleProduct(p,"is_active")}>{p.is_active?"Hide":"Activate"}</button><button className="button compact" onClick={()=>void toggleProduct(p,"is_approved")}>{p.is_approved?"Unapprove":"Approve"}</button><button className="button compact" onClick={()=>void deleteProduct(p)}><Trash2 size={12}/>Delete</button></div></div><span className="badge neutral">{p.is_approved?"Approved":"Pending"}</span></div>)}</div> : <p className="small muted" style={{marginTop:12}}>No catalog items have been added yet.</p>}</section>}
      <section className="section"><div className="section-head"><div><span className="eyebrow">RETAIL PARTNERS</span><h2 className="section-title">A considered edit, not endless scrolling.</h2></div></div>
        {products.length ? <div className="product-grid">{products.map(p=><article className="product-card" key={p.id}>{p.image_url&&safeExternalUrl(p.image_url)?<img src={p.image_url} alt={p.title} loading="lazy"/>:<div style={{height:210,background:"#efede6",display:"grid",placeItems:"center"}}><ShoppingBag size={30} color="#8a8f7f"/></div>}<div className="piece-info"><span className="badge neutral">{p.merchant}</span><strong style={{display:"block",marginTop:9}}>{p.title}</strong><div className="product-price">{p.price===null?"See merchant for price":p.currency+" "+Number(p.price).toLocaleString()}</div><p className="small muted" style={{lineHeight:1.55}}>{p.description||"Curated product listing."}</p><div className="tool-row"><a className="button compact primary" href={safeExternalUrl(p.affiliate_url)||safeExternalUrl(p.product_url)||undefined} target="_blank" rel="sponsored noopener noreferrer">View product <ArrowUpRight size={13}/></a><button className="button compact" onClick={()=>{openModal("wish");}}><Heart size={13}/></button></div></div></article>)}</div> : <EmptyState icon={ShoppingBag} title="We're curating the first collection." body="Retail listings will appear once merchants and product-image permissions are verified. You can still save individual product links to your wishlist." action="Save a shopping idea" onAction={()=>openModal("wish")}/>}
      </section>
      <section className="section surface soft"><div className="row" style={{alignItems:"start"}}><div><span className="eyebrow">ARE YOU A BRAND OR A SHOP?</span><h2 className="section-title">Make your products part of someone's style.</h2><p className="section-note" style={{maxWidth:490}}>Request a partnership to discuss a product feed, image permissions, stock updates and referral terms. We review all merchants before publishing.</p></div><Store size={27}/></div><button className="button" style={{marginTop:17}} onClick={()=>openModal("merchant")}>Apply as a merchant <ArrowRight size={14}/></button></section>
    </>;
  }

  function renderSettings() {
    const prefs=profile.style_preferences||{};
    return <>
      <div><span className="eyebrow">YOUR SPACE, YOUR RULES</span><h1 className="page-title serif">Preferences.</h1><p className="page-subtitle">Tell LOOKU what feels right. Your feedback and preferences guide recommendations, but you can change them whenever you like.</p></div>
      <div className="stylist-layout section">
        <form className="surface" onSubmit={savePreferences}>
          <span className="eyebrow">YOUR PROFILE</span><label className="field" style={{marginTop:18}}>Display name<input className="input" name="full_name" defaultValue={profile.full_name||user?.name||""} maxLength={100}/></label>
          <label className="field">Personal style<select className="input" name="style" defaultValue={String(prefs.style||"Relaxed minimal")}>{styles.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="field">Colors or styles you usually avoid <small>Comma-separated</small><input className="input" name="avoid" defaultValue={Array.isArray(prefs.avoidedColors)?prefs.avoidedColors.join(", "):""} placeholder="e.g. neon, very formal, itchy fabrics"/></label>
          <label className="field">What should the stylist remember?<textarea className="input textarea" name="notes" defaultValue={String(prefs.notes||"")} maxLength={1200} placeholder="Comfort preferences, dress codes, modesty, fit constraints, things you love…"/></label>
          <div className="twocol"><label className="field">Preferred currency<select className="input" name="currency" defaultValue={String(prefs.preferredCurrency||"KES")}><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label className="field">City for weather (optional)<input className="input" name="city" defaultValue={String(prefs.locationCity||"")} placeholder="e.g. Nairobi"/></label></div>
          <button className="button primary" type="submit" disabled={savingProfile}>{savingProfile?"Saving…":"Save preferences"}</button>
        </form>
        <aside className="stack">
          <div className="surface"><div className="row"><div className="avatar lg">{getInitials(profile.full_name||user?.name||"Looku")}</div><div style={{flex:1,minWidth:0}}><strong>{profile.full_name||user?.name}</strong><p className="small muted" style={{margin:"5px 0 0",overflowWrap:"anywhere"}}>{user?.email}</p></div></div><div className="divider"/><p className="small muted" style={{lineHeight:1.7}}>Account authenticated through Supabase. Wardrobe images are stored in private object storage; the browser only receives short-lived signed URLs.</p><button className="button" style={{width:"100%"}} onClick={exportData}><Download size={14}/>Export my data</button><button className="button" style={{width:"100%",marginTop:9}} onClick={()=>void signOut()}><LogOut size={14}/>Sign out</button><button className="button danger" style={{width:"100%",marginTop:9}} onClick={()=>void deleteAccount()}><Trash2 size={14}/>Delete account and data</button></div>
          <div className="surface soft"><span className="eyebrow">YOUR AI ALLOWANCE</span><h3 style={{fontSize:23,fontWeight:500,margin:"10px 0 5px"}}>20 calls per day</h3><p className="small muted" style={{lineHeight:1.6}}>The backend applies a per-user daily limit to help control model costs. Image recognition and styling use the same allowance.</p></div>
          <div className="surface"><span className="eyebrow">PRIVACY AND CONTROL</span><p className="small muted" style={{lineHeight:1.7}}>You can remove wardrobe items, delete saved looks and export your metadata. You can delete your account from this screen. The secure server-side flow confirms your email, removes private photos, and deletes account records.</p><a className="text-action" href="https://www.odpc.go.ke/" target="_blank" rel="noreferrer">Kenya data protection authority <ExternalLink size={11} style={{display:"inline"}}/></a></div>
          {admin&&<div className="surface"><span className="eyebrow">INTERNAL TOOLS</span><h3 style={{margin:"8px 0",fontWeight:500}}>Catalog administration</h3><p className="small muted">You are allow-listed for catalog management. Add records, inspect review state and only publish products with authorized sources.</p><button className="button compact" onClick={()=>switchScreen("Shop")}>Open catalog tools</button></div>}
        </aside>
      </div>
    </>;
  }

  if (!ready) return <div className="loading-screen"><div><div className="loading-mark">looku<span style={{color:"var(--sage-dark)"}}>.</span></div><div className="spinner"/><p className="small muted">Preparing your personal style space…</p></div></div>;

  if (!configured) return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:22}}><div style={{maxWidth:680,width:"100%"}}><Link href="/" className="wordmark">looku<span className="dot">.</span></Link><p className="tagline">YOUR STYLE, UNDERSTOOD.</p><div className="surface" style={{padding:30,marginTop:25}}><span className="badge warn"><CircleAlert size={13}/> Backend connection required</span><h1 className="page-title serif" style={{marginTop:18}}>Your style space is ready to be connected.</h1><p className="page-subtitle">LOOKU is deployed, but production accounts, cloud wardrobe storage and persistent data are deliberately not simulated. Connect a dedicated Supabase project to activate the app.</p><div className="stack" style={{marginTop:24}}><div className="row"><span className="small">Authentication and private data</span><span className="badge warn">Not configured</span></div><div className="row"><span className="small">AI stylist and image recognition</span><span className="badge neutral">Needs model access</span></div><div className="row"><span className="small">Retail catalog</span><span className="badge neutral">Awaiting approved feeds</span></div></div><div className="divider"/><p className="small muted" style={{lineHeight:1.7}}>Deployment environment variables required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Do not put the service-role key in browser code.</p><a className="button primary" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase setup <ExternalLink size={14}/></a></div></div></main>;

  if (!user) return <main className="auth-shell"><aside className="auth-art"><img src={heroImage} alt="Fashion editorial inspiration"/><div className="auth-art-copy"><div className="eyebrow" style={{color:"#fff"}}>YOUR CLOSET, UNDERSTOOD</div><h1>Get dressed<br/>with intention.</h1><p style={{fontSize:13,lineHeight:1.7,maxWidth:360}}>Your clothes, your day, one thoughtful look. Start with what you already own.</p></div></aside><section className="auth-panel"><div className="wordmark">looku<span className="dot">.</span></div><p className="tagline">YOUR STYLE, UNDERSTOOD.</p><h2>Your personal style space.</h2><p className="auth-desc">Sign in to keep your wardrobe, outfit plans, saved looks and style preferences in one private place.</p><a className="button primary" href="/auth" style={{width:"100%",minHeight:48}}>Sign in <ArrowRight size={15}/></a><a className="button" href="/auth?mode=signup" style={{width:"100%",marginTop:10,minHeight:48}}>Create an account</a><div className="privacy-banner" style={{marginTop:25}}><LockKeyhole/><span>Your wardrobe is private by default. We never need to publish your outfit photos to make styling useful.</span></div></section></main>;

  const currentNav = navItems.find(n=>n.id===screen);
  const mobileItems: {id: Screen|"More"; label: string; icon: typeof House}[] = [
    {id:"Today",label:"Today",icon:House},{id:"Closet",label:"Closet",icon:Shirt},{id:"Stylist",label:"Stylist",icon:Sparkles},{id:"Plan",label:"Plan",icon:CalendarDays},{id:"More",label:"More",icon:Menu}
  ];
  const content = screen==="Today" ? renderToday() : screen==="Closet" ? renderCloset() : screen==="Stylist" ? renderStylist() : screen==="Plan" ? renderPlanner() : screen==="Looks" ? renderLooks() : screen==="Shop" ? renderShop() : renderSettings();

  return <div className="app-shell">
    <aside className="sidebar"><div className="wordmark">looku<span className="dot">.</span></div><div className="tagline">YOUR STYLE, UNDERSTOOD.</div><nav className="side-nav">{navItems.map((n,i)=><div key={n.id}>{n.group&&<div className="eyebrow" style={{padding:"15px 12px 7px",marginTop:i===0?0:7}}>{n.group}</div>}<button className={"nav-link "+(screen===n.id?"active":"")} onClick={()=>switchScreen(n.id)}><n.icon size={17}/>{n.label}{n.id==="Closet"&&items.length>0&&<span style={{marginLeft:"auto",fontSize:10,color:"var(--muted)"}}>{items.length}</span>}</button></div>)}</nav><div className="side-bottom"><div className="surface soft" style={{padding:14,boxShadow:"none",marginBottom:16}}><Sparkles size={17} color="#526349"/><p style={{fontSize:12,lineHeight:1.55,margin:"10px 0 12px"}}>Small wardrobe. More combinations. A style that feels like you.</p><button className="button compact" onClick={()=>{switchScreen("Stylist");}}>Style something <ArrowUpRight size={12}/></button></div><div className="profile-chip"><div className="avatar">{getInitials(profile.full_name||user.name)}</div><div style={{flex:1,minWidth:0}}><strong style={{display:"block",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.full_name||user.name}</strong><span className="tiny muted">Personal wardrobe</span></div><button className="icon-button" onClick={()=>switchScreen("Settings")} aria-label="Account settings" style={{width:31,height:31}}><Settings size={14}/></button></div></div></aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><span className="wordmark" style={{fontSize:25,display:"none"}}>looku<span className="dot">.</span></span><div><span className="eyebrow tag-line-current">{currentNav?.label||"Your space"}</span><div className="tiny muted" style={{marginTop:5}}>Your wardrobe. Your day. Your style.</div></div></div><div className="topbar-right"><span className="badge neutral"><ShieldCheck size={12}/>Private space</span><button className="icon-button" onClick={()=>switchScreen("Settings")} aria-label="Preferences"><UserRound size={16}/></button></div></header>
      {loadingData&&<div className="small muted" style={{marginBottom:14}}><LoaderCircle size={13} className="spin-icon" style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Syncing your style space…</div>}
      {content}
      <footer className="section row" style={{borderTop:"1px solid var(--line)",paddingTop:20,alignItems:"start"}}><div><div className="wordmark" style={{fontSize:24}}>looku<span className="dot">.</span></div><p className="tiny muted" style={{lineHeight:1.7,marginTop:8}}>Thoughtfully dressed, every day.<br/>Wardrobe images stay private by default.</p></div><div className="tool-row"><button className="text-action" onClick={()=>switchScreen("Settings")}>Privacy & preferences</button><button className="text-action" onClick={()=>switchScreen("Shop")}>Retail partners</button></div></footer>
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">{mobileItems.map(n=>{const Icon=n.icon;return <button key={n.id} className={(n.id==="More"?moreOpen:screen===n.id)?"active":""} onClick={()=>n.id==="More"?setMoreOpen(v=>!v):switchScreen(n.id as Screen)}><Icon/><span>{n.label}</span></button>})}</nav>
    {moreOpen&&<div style={{position:"fixed",zIndex:45,bottom:75,right:12,background:"#fff",border:"1px solid var(--line)",borderRadius:16,padding:8,boxShadow:"0 15px 45px #0002",width:210}}>{([{id:"Looks",label:"My lookbook",icon:ImagePlus},{id:"Shop",label:"Curated shop",icon:ShoppingBag},{id:"Settings",label:"Preferences",icon:Settings}] as {id:Screen;label:string;icon:typeof House}[]).map(n=><button key={n.id} className="nav-link" onClick={()=>switchScreen(n.id)}><n.icon size={16}/>{n.label}</button>)}<button className="nav-link" onClick={()=>void signOut()}><LogOut size={16}/>Sign out</button></div>}
    {renderModal()}
    {toastMessage&&<div className="toast" role="status">{toastMessage}</div>}
  </div>;
}
