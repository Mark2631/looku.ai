"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, CloudSun, Heart, House, ImagePlus, Layers3, LogOut, Menu, MessageCircle, Plus, Search, Settings, Shirt, Mic, MoreHorizontal, Moon, Sun,
  ShoppingBag, Sparkles, Star, Trash2, Upload, UserRound, X, Footprints, WandSparkles, RefreshCw, ThumbsDown,
  ThumbsUp, Bookmark, Clock3, CalendarCheck, Package, ShieldCheck, LockKeyhole, ExternalLink, Link as LinkIcon,
  ListChecks, SlidersHorizontal, Camera, CircleAlert, LoaderCircle, Download, Store, Pencil, CalendarPlus, ShirtIcon, Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { StyleInsights } from "@/components/style-insights";
import { OccasionStudio } from "@/components/occasion-studio";
import { RetailDiscover } from "@/components/retail-discover";
import { WardrobeCapture } from "@/components/wardrobe-capture";
import { ShoppingJournal } from "@/components/shopping-journal";
import { StyleCommunity } from "@/components/style-community";
import { ScanOutfit } from "@/components/scan-outfit";

import { TryOnRoom } from "@/components/tryon-room";

type Screen = "Today" | "Closet" | "Stylist" | "Occasion" | "TryOn" | "Plan" | "Looks" | "Community" | "Shop" | "Insights" | "Settings";
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
type IntegrationHealth = { backendConfigured?: boolean; aiGatewayKeyConfigured?: boolean; adminCatalogConfigured?: boolean; calendarConfigured?: boolean; weatherConfigured?: boolean; tryOnConfigured?: boolean };

const navItems: { id: Screen; label: string; icon: typeof House; group?: string }[] = [
  { id: "Today", label: "Today", icon: House, group: "YOUR SPACE" },
  { id: "Closet", label: "My closet", icon: Shirt },
  { id: "Stylist", label: "AI stylist", icon: Sparkles, group: "YOUR STYLE" },
  { id: "Occasion", label: "Occasion studio", icon: CalendarCheck },
  { id: "TryOn", label: "Virtual fitting room", icon: Camera },
  { id: "Plan", label: "Outfit planner", icon: CalendarDays },
  { id: "Looks", label: "My lookbook", icon: ImagePlus },
  { id: "Community", label: "Style community", icon: Users },
  { id: "Shop", label: "Curated shop", icon: ShoppingBag, group: "DISCOVER" },
  { id: "Insights", label: "Style intelligence", icon: CircleHelp, group: "DISCOVER" },
  { id: "Settings", label: "Preferences", icon: Settings, group: "ACCOUNT" },
];
const categories = ["All", "Tops", "Bottoms", "Shoes", "Outerwear", "Dresses", "Swimwear", "Accessories", "Activewear", "Sleepwear", "Bags", "Other"];
const occasions = ["Everyday", "Birthday", "Graduation", "Date night", "Wedding guest", "Campus event", "Job interview", "Dinner", "Family celebration", "Church or faith ceremony", "Workday", "Travel day", "Outdoor event", "Gym or active", "Formal event", "Online interview", "Campus date", "Conference / networking", "Concert / festival", "Beach or pool day", "Photoshoot", "Baby shower", "First day at work", "Relaxed / Home", "Work / Presentation", "Event / Date", "Wedding / Celebration", "Campus", "Travel", "Gym / Active", "Church / Ceremony"];
const styles = ["Relaxed minimal", "Smart casual", "Streetwear", "Classic elegance", "Colorful creative", "Comfort-first", "Modest and polished"];
const STYLE_TEST_SCENARIOS = [
  { title:"Dinner with friends", caption:"Comfortable with a little polish", occasion:"Dinner", prompt:"Style me for a casual dinner with friends. Consider what I own and my style preferences." },
  { title:"Graduation", caption:"A look worth remembering", occasion:"Graduation", prompt:"Help me dress for a graduation celebration without overdoing it." },
  { title:"First date", caption:"Feel confident, still feel yourself", occasion:"Date night", prompt:"I need an effortless date night outfit that feels like me." },
  { title:"Casual walk", caption:"Everyday, but intentional", occasion:"Everyday", prompt:"Make an easy everyday look for a relaxed walk." },
  { title:"Job interview", caption:"Professional without a costume", occasion:"Job interview", prompt:"Build a polished, confident outfit for a job interview." },
  { title:"Wedding guest", caption:"Dress for the celebration", occasion:"Wedding guest", prompt:"Find a wedding guest outfit that respects the dress code." }
] as const;
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
  const [communityDraft,setCommunityDraft] = useState<{id:string;title:string;occasion:string;coverPath:string}|null>(null);
  const [showOutfitScanner, setShowOutfitScanner] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lookMenu, setLookMenu] = useState<{ id: string; top: number; left: number; above: boolean } | null>(null);
  const [likedOutfitIds, setLikedOutfitIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
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
  const [stylingMethod, setStylingMethod] = useState<"ai" | "wardrobe-rules" | null>(null);
  const [stylingNotice, setStylingNotice] = useState("");
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
  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealth | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarPayload>({ configured: false, connected: false, events: [] });
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => { setCurrentTime(Date.now()); }, []);
  useEffect(() => { const saved = window.localStorage.getItem("looku-theme"); const next = saved === "light" ? "light" : "dark"; document.documentElement.dataset.lookuTheme = next; setTheme(next); }, []);
  useEffect(() => {
    const textarea = document.getElementById("looku-composer-input");
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.style.height = "40px";
    textarea.style.height = Math.min(textarea.scrollHeight, 138) + "px";
  }, [chatInput, screen]);
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
      const [profileRes, itemRes, outfitRes, outfitItemsRes, planRes, productRes, wishRes, feedbackRes] = await Promise.all([
        supabase.from("profiles").select("full_name,style_preferences,onboarding_completed").eq("id", userId).maybeSingle(),
        supabase.from("wardrobe_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(400),
        supabase.from("outfits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabase.from("outfit_items").select("outfit_id,wardrobe_item_id,position").eq("user_id", userId).order("position"),
        supabase.from("outfit_plans").select("*").eq("user_id", userId).order("plan_date", { ascending: true }).limit(400),
        supabase.from("products").select("id,title,description,category,brand,merchant,currency,price,image_url,product_url,affiliate_url,country_code,sizes").eq("is_active", true).eq("is_approved", true).order("created_at", { ascending: false }).limit(100),
        supabase.from("wishlist_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabase.from("outfit_feedback").select("outfit_id,reaction").eq("user_id", userId).eq("reaction", "like").limit(200),
      ]);
      if (profileRes.data) setProfile({ full_name: profileRes.data.full_name, style_preferences: profileRes.data.style_preferences || {}, onboarding_completed: Boolean(profileRes.data.onboarding_completed) });
      if (profileRes.error) console.error("LOOKU profile load", profileRes.error.message);
      const mappedItems: WardrobeItem[] = await Promise.all((itemRes.data || []).map(async (item: Omit<WardrobeItem, "image_url">) => {
        let imageUrl: string | null = null;
        if (item.image_path) {
          const { data } = await supabase.storage.from("wardrobe-private").createSignedUrl(item.image_path, 3600);
          imageUrl = data?.signedUrl || null;
        }
        return { ...item, image_url: imageUrl };
      }));
      setItems(mappedItems);
      const links = (outfitItemsRes.data || []) as { outfit_id: string; wardrobe_item_id: string; position: number }[];
      const mappedOutfits: Outfit[] = await Promise.all((outfitRes.data || []).map(async (outfit: Omit<Outfit, "cover_url" | "item_ids">) => {
        let coverUrl: string | null = null;
        if (outfit.cover_image_path) {
          const { data } = await supabase.storage.from("wardrobe-private").createSignedUrl(outfit.cover_image_path, 3600);
          coverUrl = data?.signedUrl || null;
        }
        return { ...outfit, cover_url: coverUrl, item_ids: links.filter(l => l.outfit_id === outfit.id).sort((a,b) => a.position-b.position).map(l => l.wardrobe_item_id) };
      }));
      setOutfits(mappedOutfits);
      setLikedOutfitIds(Array.from(new Set((feedbackRes.data || []).map((row: { outfit_id: string }) => row.outfit_id))));
      if (planRes.data) setPlans(planRes.data as OutfitPlan[]);
      if (productRes.data) setProducts(productRes.data as Product[]);
      if (wishRes.data) setWishlist(wishRes.data as Wish[]);
      try {
        const r = await fetch("/api/admin/products", { cache: "no-store" });
        if (r.ok) { const j = await r.json(); setAdmin(true); setAdminProducts(j.products || []); }
        else if (r.status === 403) setAdmin(false);
      } catch { /* Normal users do not need the catalog administration endpoint. */ }
      if (itemRes.error || outfitRes.error || planRes.error || productRes.error || wishRes.error || feedbackRes.error) {
        console.error("LOOKU load returned an error", [itemRes.error, outfitRes.error, planRes.error, productRes.error, wishRes.error, feedbackRes.error].filter(Boolean).map(x => x?.message));
      }
    } catch (error) {
      console.error("LOOKU data loading failed", error);
      showToast("Some information couldn't load. Check your connection and refresh.");
    } finally { setLoadingData(false); }
  }, [showToast]);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" }).then(response => response.json()).then(data => setIntegrationHealth(data as IntegrationHealth)).catch(() => setIntegrationHealth(null));
  }, []);

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
    if (!configured || !user) return;
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
  }, [configured, user?.id]);

  useEffect(() => {
    if (!configured || !user || !weatherCity) { setWeather(null); setWeatherMessage(""); return; }
    if (screen !== "Today") return;
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



  function switchScreen(next: Screen) { setScreen(next); setMoreOpen(false); setModal(null); setLookMenu(null); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function setLookuTheme(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.dataset.lookuTheme = next;
    window.localStorage.setItem("looku-theme", next);
  }

  function startNewLook() {
    setScreen("Today");
    setMoreOpen(false);
    setLookMenu(null);
    setChatInput("");
    setMood("");
    setGenerated([]);
    setAiError("");
    setChat([{ role: "assistant", text: "Tell me the occasion, mood, or piece you want to build around. I’ll help make a look from your real wardrobe." }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleLookMenu(id: string, event: ReactMouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 180;
    const above = window.innerHeight - rect.bottom < menuHeight;
    const top = above ? rect.top - 7 : rect.bottom + 7;
    const menuWidth = Math.min(190, window.innerWidth - 20);
    const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.right - menuWidth));
    setLookMenu(current => current?.id === id ? null : { id, top, left, above });
  }

  function startVoiceInput() {
    type VoiceResult = { transcript: string };
    type VoiceRecognition = {
      lang: string; interimResults: boolean; maxAlternatives: number;
      onresult: ((event: { results: ArrayLike<ArrayLike<VoiceResult>> }) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
    };
    type VoiceConstructor = new () => VoiceRecognition;
    const speechWindow = window as Window & { SpeechRecognition?: VoiceConstructor; webkitSpeechRecognition?: VoiceConstructor };
    const SpeechConstructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechConstructor) { showToast("Voice input is not supported in this browser. You can type your look instead."); return; }
    try {
      const recognition = new SpeechConstructor();
      recognition.lang = "en-KE";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        const transcript = Array.from(event.results).map(result => result[0]?.transcript || "").join(" ").trim();
        if (transcript) setChatInput(previous => previous ? previous.trim() + " " + transcript : transcript);
      };
      recognition.onerror = () => showToast("Voice input stopped. You can type your look instead.");
      recognition.start();
    } catch { showToast("Could not start voice input. Please type your look instead."); }
  }

  async function generateLooks(prompt: string, requestedOccasion = occasion, fromChat = false) {
    if (availableItems.length < 2) { showToast("Add at least two available items to get started."); switchScreen("Closet"); return; }
    setStyling(true); setAiError(""); setStylingNotice("");
    try {
      const now = currentTime;
      const upcomingEvents = calendarEvents.filter(event => {
        const start = new Date(event.start).getTime();
        return Number.isFinite(start) && start >= now && start <= now + 7 * 24 * 60 * 60 * 1000;
      }).slice(0, 5).map(event => ({ title: event.title.slice(0, 120), start: event.start }));
      const context = {
        weather: weather ? {
          tempC: weather.current.tempC, feelsLikeC: weather.current.feelsLikeC,
          condition: weather.current.condition, windKph: weather.current.windKph,
          precipitationMm: weather.current.precipitationMm,
        } : undefined,
        upcomingEvents,
      };
      const response = await fetch("/api/ai/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ occasion: requestedOccasion, prompt, count: 3, context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The stylist couldn't complete that request.");
      setGenerated(data.outfits || []);
      setStylingMethod(data.method === "ai" ? "ai" : "wardrobe-rules");
      setStylingNotice(typeof data.notice === "string" ? data.notice : "");
      if (fromChat) setChat(prev => [...prev, { role: "assistant", text: (data.method === "wardrobe-rules" ? "I matched " : "I styled ") + (data.outfits || []).length + " look(s) from your real available clothes. " + (data.notice || "You can save a look or ask for adjustments.") }]);
      showToast("Your wardrobe edit is ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The stylist is unavailable.";
      setAiError(message);
      if (fromChat) setChat(prev => [...prev, { role: "assistant", text: message }]);
      else showToast(message);
    } finally { setStyling(false); }
  }

  async function recordSuggestionFeedback(idea: OutfitIdea, signal: "love" | "not-me" | "too-formal" | "too-casual" | "colors") {
    if (!user?.id) return;
    const entry={ signal, title:idea.title.slice(0,80), style:idea.style.slice(0,80), occasion, itemIds:idea.itemIds.slice(0,6), recordedAt:new Date().toISOString() };
    const previous=Array.isArray(profile.style_preferences?.suggestionFeedback) ? profile.style_preferences.suggestionFeedback : [];
    const preferences={...profile.style_preferences,suggestionFeedback:[entry,...previous].slice(0,30)};
    const {error}=await createClient().from("profiles").update({style_preferences:preferences}).eq("id",user.id);
    if(error){showToast("Could not save your style feedback.");return;}
    setProfile(old=>({...old,style_preferences:preferences}));
    showToast(signal==="love"?"Noted. I'll learn from this look.":"Saved your feedback. New ideas will take it into account.");
    if(signal!=="love") setGenerated(old=>old.filter(x=>x!==idea));
  }

  async function saveOutfit(idea: OutfitIdea, selectedOccasion = occasion, alsoLike = false) {
    if (!user || modalBusy) return;
    const validItems = idea.itemIds.filter(id => availableItems.some(item => item.id === id));
    if (validItems.length < 2) { showToast("Those pieces are no longer all available. Generate a fresh look."); return; }
    setModalBusy(true);
    try {
      const supabase = createClient();
      const { data: outfit, error } = await supabase.from("outfits").insert({
        user_id: user.id, title: idea.title.slice(0, 120), occasion: selectedOccasion, style_label: idea.style,
        recommendation_reason: idea.reason, status: "saved", source: stylingMethod === "wardrobe-rules" ? "manual" : "ai",
      }).select("*").single();
      if (error || !outfit) throw error || new Error("Couldn't save this look.");
      const { error: itemError } = await supabase.from("outfit_items").insert(validItems.map((id, position) => ({ user_id: user.id, outfit_id: outfit.id, wardrobe_item_id: id, position })));
      if (itemError) { await supabase.from("outfits").delete().eq("id", outfit.id).eq("user_id", user.id); throw itemError; }
      if (alsoLike) { await supabase.from("outfit_feedback").insert({ user_id: user.id, outfit_id: outfit.id, reaction: "like" }); }
      await loadData(user.id);
      setGenerated(previous => previous.filter(candidate => candidate !== idea));
      setLookMenu(null);
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

  async function shareLook(outfit: Outfit) {
    const shareText = "LOOKU style check: " + outfit.title + " · " + outfit.occasion + ". What do you think? #LOOKU";
    try {
      if (outfit.cover_url) {
        const response = await fetch(outfit.cover_url);
        if (response.ok) {
          const image = await response.blob();
          const file = new File([image], "looku-look." + (image.type === "image/png" ? "png" : "jpg"), { type: image.type || "image/jpeg" });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({ text: shareText, files: [file] });
            return;
          }
        }
      }
      if (navigator.share) { await navigator.share({ text: shareText }); return; }
      await navigator.clipboard.writeText(shareText);
      showToast("Your look description was copied. Paste it into your favorite social app.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      showToast("Sharing isn't supported here. You can still download and share your photo from your device.");
    }
  }

  async function reactToOutfit(outfit: Outfit, reaction: "like" | "dislike") {
    if (!user) return;
    const client = createClient();
    const alreadyLiked = reaction === "like" && likedOutfitIds.includes(outfit.id);
    const result = alreadyLiked
      ? await client.from("outfit_feedback").delete().eq("user_id", user.id).eq("outfit_id", outfit.id).eq("reaction", "like")
      : await client.from("outfit_feedback").insert({ user_id: user.id, outfit_id: outfit.id, reaction });
    if (result.error) {
      showToast("Feedback couldn't be saved.");
      return;
    }
    if (reaction === "like") {
      setLikedOutfitIds(previous => alreadyLiked ? previous.filter(id => id !== outfit.id) : previous.includes(outfit.id) ? previous : [outfit.id, ...previous]);
      showToast(alreadyLiked ? "Removed from liked looks." : "Saved to liked looks.");
    } else {
      showToast("Noted. I'll avoid leaning this way.");
    }
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
    const image = form.get("photo") as File | null;
    if (productUrl && !safeExternalUrl(productUrl)) { setModalError("Use a valid HTTPS product URL."); setModalBusy(false); return; }
    if (!name) { setModalError("Garment name is required."); setModalBusy(false); return; }
    if (image && image.size && (!["image/jpeg","image/png","image/webp"].includes(image.type) || image.size > 10 * 1024 * 1024)) {
      setModalError("Use a JPG, PNG or WebP image under 10 MB."); setModalBusy(false); return;
    }
    const supabase = createClient();
    let uploadedPath: string | null = null;
    try {
      if (image && image.size) {
        uploadedPath = user.id + "/" + crypto.randomUUID() + "-" + image.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(-70);
        const { error: uploadError } = await supabase.storage.from("wardrobe-private").upload(uploadedPath, image, { contentType:image.type, upsert:false });
        if (uploadError) throw uploadError;
      }
      const { error } = await supabase.from("wardrobe_items").update({
        name: name.slice(0,100), brand: brand || null, category, colors,
        formality: Math.min(10, Math.max(1, formality)),
        ...(uploadedPath ? { image_path: uploadedPath } : {}),
        attributes: { ...(editingGarment.attributes || {}), productUrl: productUrl || null, ...(uploadedPath ? { photo_pending:false } : {}), manualCorrection: true, correctedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }).eq("id", editingGarment.id).eq("user_id", user.id);
      if (error) throw error;
      if (uploadedPath && editingGarment.image_path) {
        await supabase.storage.from("wardrobe-private").remove([editingGarment.image_path]);
      }
      await loadData(user.id);
      setEditingGarment(null); setModal(null); showToast("Garment updated." + (uploadedPath ? " Your photo is now ready for previews." : ""));
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("wardrobe-private").remove([uploadedPath]);
      setModalError(error instanceof Error ? error.message : "Couldn't update this item.");
    } finally { setModalBusy(false); }
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
    if (!files.length && !productUrl) { setModalError("Choose photos, or supply the product link for a garment you own. You can also use Quick Closet without either."); setModalBusy(false); return; }
    if (!files.length && !enteredName) { setModalError("Name the garment you own before saving a product link."); setModalBusy(false); return; }
    if (files.length > 12) { setModalError("Add up to 12 garments per batch. You can repeat the process as your wardrobe grows."); setModalBusy(false); return; }
    if (productUrl && !safeExternalUrl(productUrl)) { setModalError("Use a valid HTTPS product URL."); setModalBusy(false); return; }
    if (productUrl && files.length > 1) { setModalError("Add a product link with one garment at a time, or leave it blank for a batch upload."); setModalBusy(false); return; }
    for (const file of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setModalError("Use JPG, PNG or WebP images. No items were uploaded."); setModalBusy(false); return; }
      if (file.size > 10 * 1024 * 1024) { setModalError("Each image must be smaller than 10 MB. No items were uploaded."); setModalBusy(false); return; }
    }
    if (files.length === 1 && !enteredName) { setModalError("Give this garment a name, or select several photos to use their file names as starting labels."); setModalBusy(false); return; }
    const supabase = createClient();
    if (!files.length && productUrl) {
      const { error } = await supabase.from("wardrobe_items").insert({
        user_id: user.id, name: enteredName.slice(0,100), category: fallbackCategory,
        brand: brand || null, colors: enteredColor ? [enteredColor] : [],
        formality, seasons: [], style_tags: [], status: "available", is_owned: true, image_path: null,
        attributes: { productUrl, source: "manual_product_link", photo_pending: true, user_confirmed_ownership: true },
      });
      if (error) { setModalError(error.message); setModalBusy(false); return; }
      await loadData(user.id);
      setModal(null); setScreen("Closet");
      showToast("Added from your product link. You can add a photo or correct details later.");
      setModalBusy(false);
      return;
    }
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
    const next = !Boolean(product[key]);
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
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || styling) return;
    if (availableItems.length < 2) {
      setChat(previous => [...previous, { role: "user", text }, { role: "assistant", text: "I’ve kept your request. To build a complete look from your real clothes, add at least two available wardrobe items with the + button. Your prompt is still in the box when you come back." }]);
      setChatInput(text);
      showToast("Your prompt is saved in the box. Add two wardrobe items to generate a look.");
      return;
    }
    setChat(previous => [...previous, { role: "user", text }]);
    setChatInput("");
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

  async function shareOutfitIdea(idea: OutfitIdea) {
    const labels = items.filter(item => idea.itemIds.includes(item.id)).map(item => item.name);
    const shareText = [idea.title, labels.join(" + "), idea.reason, "Styled with LOOKU · https://looku-ai-mvp.vercel.app/"].filter(Boolean).join("\n\n");
    try {
      if (navigator.share) await navigator.share({title: "My LOOKU outfit: " + idea.title, text: shareText});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(shareText); showToast("Outfit idea copied. Share it wherever you like."); }
      else showToast("Sharing isn't supported in this browser.");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") showToast("Unable to share. You can still save the look privately.");
    }
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
      <p className="tiny muted" style={{margin:"9px 0 0"}}>Sharing is optional. Only outfit names and styling text are shared; your wardrobe photos and account stay private.</p>
      <div className="tool-row" style={{ marginTop: 14 }}>
        <button className="button primary compact" disabled={modalBusy} onClick={() => void saveOutfit(idea)}><Bookmark size={14}/>Save this look</button><button className="button compact" onClick={()=>{ switchScreen("TryOn"); showToast("Choose an owned garment from this look to preview on your photo. Full multi-piece outfit rendering is not yet supported."); }}><Camera size={14}/>See on me</button>
        <button className="button compact" onClick={() => void shareOutfitIdea(idea)}><ExternalLink size={14}/>Share outfit idea</button><button className="button compact" onClick={()=>void recordSuggestionFeedback(idea,"love")}><Heart size={13}/>Love this</button><button className="button compact" onClick={()=>void recordSuggestionFeedback(idea,"not-me")}><ThumbsDown size={13}/>Not my style</button>
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
          <div><span className="badge neutral">Your item</span><p className="small muted" style={{lineHeight:1.6,margin:"8px 0 0"}}>Correct any garment details and optionally add a private photo. Existing photos remain private.</p></div>
        </div>
        <label className="field">Add or replace garment photo <small>Optional, up to 10 MB. Adding a photo makes this item eligible for single-garment virtual try-on.</small><input className="input" name="photo" type="file" accept="image/jpeg,image/png,image/webp"/></label><label className="field">Garment name<input className="input" name="name" required maxLength={100} defaultValue={editingGarment.name}/></label>
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
        <p className="small muted" style={{ lineHeight: 1.6, marginBottom: 17 }}>Select multiple gallery photos in one batch; AI can suggest attributes for each. Or skip photos entirely using Quick Closet. Your uploaded images stay private.</p>
        <div className="field"><span>Garment photographs</span><div className="upload-box"><Camera/><strong style={{ display: "block", fontSize: 12 }}>Choose one or several photos</strong><small>Optional if you add a product link · JPG, PNG or WebP · 12 per batch</small><input id="garment-photo" type="file" name="image" accept="image/jpeg,image/png,image/webp" multiple/><label htmlFor="garment-photo" className="button compact" style={{ marginTop: 12 }}>Browse photos</label></div></div>
        <label className="field">Item name <small>Required for one photo; batch uploads start with each file name</small><input className="input" name="name" maxLength={100} placeholder="e.g. Blue linen shirt"/></label>
        <div className="twocol">
          <label className="field">Category<select className="input" name="category" defaultValue="Tops">{categories.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="field">Main color<input className="input" name="color" placeholder="e.g. navy blue"/></label>
        </div>
        <label className="field">Brand (optional)<input className="input" name="brand" maxLength={120} placeholder="Brand or maker"/></label>
        <label className="field">Original product page (optional)<small>If you own the garment, you can add it using only its product URL and a name. LOOKU does not copy retailer photography without permission.</small><input className="input" name="product_url" type="url" placeholder="https://…"/></label>
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
    return <div className="looku-chat-home looku-quiet-home">
      {chat.length > 1 && <section className="looku-home-thread" aria-live="polite">
        {chat.slice(1).map((message, index) => <div key={index} className={"looku-home-message " + (message.role === "user" ? "user" : "")}>{message.text}</div>)}
      </section>}
      {styling && <p className="looku-thinking" role="status">Putting your look together…</p>}
      {aiError && <ErrorNotice>{aiError}</ErrorNotice>}
      {generated.length > 0 && <section className="looku-result-grid" aria-label="Your outfit suggestions">
        {generated.map((idea, index) => {
          const pieces = outfitItems(idea);
          return <article className="looku-result-card" key={idea.title + index}>
            <div className="looku-result-pieces">{pieces.slice(0, 4).map(piece => piece.image_url ? <img key={piece.id} src={piece.image_url} alt={piece.name}/> : <span key={piece.id}>{piece.name}</span>)}</div>
            <strong>{idea.title}</strong>
            <p>{idea.reason}</p>
            <div className="looku-result-actions">
              <button type="button" onClick={() => void saveOutfit(idea)}><Bookmark size={14}/>Save</button>
              <button type="button" onClick={() => setChatInput("Create a variation of " + idea.title + " for me.")}><RefreshCw size={14}/>Try another</button>
            </div>
          </article>;
        })}
      </section>}
    </div>;
  }

    function renderCloset() {
    return <>
      <div className="row" style={{ alignItems: "start" }}><div><span className="eyebrow">YOUR PERSONAL STYLE LIBRARY</span><h1 className="page-title serif">My closet.</h1><p className="page-subtitle">{items.length ? items.length+" pieces saved. Your wardrobe grows as you wear, photograph or describe outfits — no complete inventory needed." : "A wardrobe that builds itself around your real life. Start with an outfit photo or describe what you own. You don't need a complete list."}</p></div></div>
      {user && <WardrobeCapture userId={user.id} onImported={async()=>{await loadData(user.id);showToast("Your wardrobe is updated.");}} onScan={()=>setShowOutfitScanner(true)}/>}
      {showOutfitScanner && <div className="tool-row section"><button className="button compact" onClick={()=>setShowOutfitScanner(false)}><X size={14}/>Close outfit scanner</button></div>}
      {user && showOutfitScanner && <ScanOutfit userId={user.id} onImported={async()=>{await loadData(user.id);showToast("Confirmed garments added from your outfit photo.");}} onClose={()=>setShowOutfitScanner(false)}/>}

      <div className="stat-grid section"><div className="stat"><span className="stat-label">Wardrobe pieces</span><div className="stat-number">{items.length}</div><span className="stat-caption">Clothing you own</span></div><div className="stat"><span className="stat-label">Ready to wear</span><div className="stat-number">{availableItems.length}</div><span className="stat-caption">Available for styling</span></div><div className="stat"><span className="stat-label">Saved combinations</span><div className="stat-number">{savedLooks.length}</div><span className="stat-caption">Your personal outfit history</span></div></div>
      <div className="tool-row section" style={{ marginTop: 26 }}><div className="search-wrap"><Search/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, brand or color…" aria-label="Search wardrobe"/></div><button className="button" onClick={() => setFilter(filter==="All"?"Tops":"All")}><SlidersHorizontal size={14}/>{filter==="All"?"Filter":"Clear filter"}</button></div>
      <div className="filter-row">{categories.map(cat=><button key={cat} className={"filter-pill "+(filter===cat?"active":"")} onClick={()=>setFilter(cat)}>{cat}{cat==="All"?" ("+items.length+")":""}</button>)}</div>
      {loadingData ? <p className="muted small" role="status">Loading your wardrobe…</p> : filteredItems.length ? <div className="garment-grid">{filteredItems.map(item=><article className="garment-card" key={item.id}>
        {item.image_url ? <img className="garment-image" src={item.image_url} alt={item.name} loading="lazy"/> : <div className="garment-image" style={{ display: "grid", placeItems: "center" }}><Shirt size={35} color="#8c8f82"/></div>}
        <div className="garment-content"><div className="row" style={{ gap: 5 }}><h3 title={item.name}>{item.name}</h3><span className={"tag"}>{item.status==="available"?"Ready":item.status==="laundry"?"Laundry":"Retired"}</span></div><p>{item.brand ? item.brand+" · " : ""}{item.category} · {(item.colors||[]).join(", ")||"Color not set"}</p>{safeExternalUrl(String(item.attributes?.productUrl||""))&&<a className="text-action" style={{display:"inline-block",marginTop:7}} href={safeExternalUrl(String(item.attributes?.productUrl||""))||undefined} target="_blank" rel="noreferrer">Product source <ExternalLink size={11} style={{display:"inline"}}/></a>}<div className="tool-row"><button className="button compact" onClick={()=>{ setMood("Style the garment named "+item.name+" ("+item.category+"). Keep this piece in the outfit."); setScreen("Stylist"); void generateLooks("Style the garment named "+item.name+" and keep it in the outfit.", occasion); }}><Sparkles size={12}/>Style</button><button className="icon-button" title="Edit garment details" onClick={()=>openEditGarment(item)} style={{height:32,width:32}}><Pencil size={14}/></button><button className="icon-button" title={item.status==="available"?"Mark as in laundry":"Mark ready to wear"} onClick={()=>void toggleGarmentStatus(item)} style={{height:32,width:32}}>{item.status==="available"?<Clock3 size={14}/>:<Check size={14}/>}</button><button className="icon-button" title="Remove garment" onClick={()=>void removeGarment(item)} style={{height:32,width:32}}><Trash2 size={14}/></button></div></div>
      </article>)}</div> : <EmptyState icon={Shirt} title={search || filter!=="All" ? "No pieces match this view." : "Your closet should feel like yours."} body={search || filter!=="All" ? "Try another search or category." : "Add a few pieces you own to start building looks."} action={search || filter!=="All" ? "Clear filters" : "Add your first garment"} onAction={()=>search || filter!=="All" ? (setSearch(""),setFilter("All")) : openModal("garment")}/>}
      
    </>;
  }

  function renderStylist() {
    return <div className="looku-chat-home looku-stylist-page">
      <section className="looku-home-intro" style={{ textAlign: "left", marginLeft: 0 }}>
        <span className="eyebrow">NEW LOOK · YOUR PERSONAL STYLIST</span>
        <h1 className="looku-home-title">Let’s make a look.</h1>
        <p className="looku-home-subtitle" style={{ marginLeft: 0 }}>Describe the occasion, your mood, your budget, or one item you want to wear. I’ll work from the wardrobe and preferences you’ve shared.</p>
      </section>
      {chat.length > 1 ? <section className="looku-home-thread" aria-live="polite">
        {chat.slice(1).map((message, index) => <div key={index} className={"looku-home-message " + (message.role === "user" ? "user" : "")}>{message.text}</div>)}
        {styling && <div className="looku-home-message"><LoaderCircle size={14} className="spin-icon" style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }}/>Building a look from your available clothes…</div>}
      </section> : <div className="looku-shelf-empty"><div className="looku-shelf-empty-copy"><strong>Start with a real-life brief.</strong>Try “campus, warm weather, relaxed but put together” or “help me wear these black trousers differently.”</div><button type="button" className="button compact" onClick={() => switchScreen("Closet")}><Shirt size={13}/>My wardrobe</button></div>}
      {aiError && <div className="section"><ErrorNotice>{aiError}</ErrorNotice></div>}
      <div className="looku-prompt-chips" aria-label="Styling ideas">
        {[
          { label: "Everyday", prompt: "Create a comfortable, intentional everyday outfit for me.", occasion: "Everyday" },
          { label: "Date night", prompt: "Create a confident date-night look that still feels like me.", occasion: "Date night" },
          { label: "Job interview", prompt: "Build a polished interview look that is professional without feeling overdressed.", occasion: "Job interview" },
          { label: "Wear one item differently", prompt: "Give me a new way to style a favourite item from my wardrobe.", occasion: "Everyday" },
        ].map(chip => <button key={chip.label} className="looku-prompt-chip" type="button" onClick={() => { setOccasion(chip.occasion); setChatInput(chip.prompt); document.getElementById("looku-composer-input")?.focus(); }}>{chip.label}</button>)}
      </div>
      {generated.length > 0 && <section className="looku-section">
        <div className="looku-section-head"><div><h2>Your latest suggestions</h2><p>Save one, or adjust the brief below to explore a variation.</p></div><button type="button" className="looku-section-link" onClick={() => switchScreen("Today")}>Home <ArrowRight size={13}/></button></div>
        <div className="looku-shelf-row">{generated.map((idea, index) => {
          const pieces = outfitItems(idea);
          return <article className="looku-look-tile" key={idea.title + index}>
            <div className="looku-look-visual"><div className="looku-piece-mosaic">{pieces.slice(0, 4).map(piece => piece.image_url ? <img key={piece.id} src={piece.image_url} alt={piece.name}/> : <div key={piece.id} className="looku-piece-placeholder"><Shirt size={20}/></div>)}</div></div>
            <div className="looku-look-details"><strong>{idea.title}</strong><p>{idea.style}</p><p style={{ whiteSpace: "normal", maxHeight: "4.5em" }}>{idea.reason}</p>
              <div className="looku-card-actions"><button type="button" className="looku-card-action" disabled={modalBusy} onClick={() => void saveOutfit(idea)} aria-label={"Save " + idea.title} title="Save look"><Bookmark size={14}/></button><button type="button" className="looku-card-action" onClick={() => { setChatInput("Create a variation of " + idea.title + " while keeping the pieces that work."); document.getElementById("looku-composer-input")?.focus(); }} aria-label={"Create variation of " + idea.title} title="Create variation"><WandSparkles size={14}/></button><button type="button" className="looku-card-action" onClick={() => void shareOutfitIdea(idea)} aria-label={"Share " + idea.title} title="Share look"><ArrowUpRight size={14}/></button></div>
            </div>
          </article>;
        })}</div>
      </section>}
    </div>;
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
      {savedLooks.length ? <div className="look-grid">{savedLooks.map(outfit=>{const pieces=outfitItems(outfit);return <article className="look-card" key={outfit.id}><img src={outfit.cover_url||pieces.find(i=>i.image_url)?.image_url||heroImage} alt={outfit.title} loading="lazy"/><div className="look-info"><div className="row"><span className="badge neutral">{outfit.status==="worn"?"WORN":outfit.status==="planned"?"PLANNED":"SAVED"}</span><button className="icon-button" style={{width:30,height:30}} onClick={()=>void deleteOutfit(outfit)} aria-label="Delete look"><Trash2 size={13}/></button></div><strong style={{display:"block",marginTop:11}}>{outfit.title}</strong><p>{outfit.occasion} · {formatDate(outfit.worn_at||outfit.created_at)}</p>{pieces.length>0&&<p>{pieces.map(x=>x.name).join(" · ")}</p>}<div className="tool-row" style={{marginTop:12}}>{outfit.status!=="worn"&&<button className="button compact" onClick={()=>void markWorn(outfit)}><Check size={13}/>Wore this</button>}<button className="button compact" onClick={()=>void reactToOutfit(outfit,"like")} aria-label="Like look"><ThumbsUp size={13}/></button><button className="button compact" onClick={()=>void shareLook(outfit)} aria-label={"Share "+outfit.title}><ArrowUpRight size={13}/>Share</button>{outfit.cover_image_path&&<button className="button compact" onClick={()=>{setCommunityDraft({id:outfit.id,title:outfit.title,occasion:outfit.occasion,coverPath:outfit.cover_image_path!});switchScreen("Community");}}><Users size={13}/>Post in LOOKU</button>}<button className="button compact" onClick={()=>{switchScreen("TryOn");showToast("Choose a photographed garment for a single-piece virtual try-on.");}}><Camera size={13}/>Preview on me</button><button className="button compact" onClick={()=>void reactToOutfit(outfit,"dislike")} aria-label="Dislike look"><ThumbsDown size={13}/></button></div></div></article>})}</div> : <EmptyState icon={ImagePlus} title="Keep the looks you love." body="Save an AI-generated outfit or upload a real outfit photo. Over time this becomes a useful record of combinations you can repeat." action="Record a look" onAction={()=>openModal("look")}/>}
      <section className="section"><div className="section-head"><div><span className="eyebrow">THE IDEAS YOU'RE CONSIDERING</span><h2 className="section-title">Wishlist</h2><p className="section-note">Saved product links aren't owned clothing and won't be used in outfit generation.</p></div><button className="button compact" onClick={()=>openModal("wish")}><Plus size={13}/>Add idea</button></div>
      {wishlist.length ? <div className="stack">{wishlist.map(w=><div className="surface row" key={w.id}><div style={{minWidth:0}}><strong style={{fontSize:13}}>{w.title}</strong><p className="small muted" style={{margin:"5px 0 0"}}>{w.note||"Personal shopping idea"}{w.product_url&&safeHostname(w.product_url)?" · "+safeHostname(w.product_url):""}</p>{w.product_url&&safeExternalUrl(w.product_url)&&<a className="text-action" href={safeExternalUrl(w.product_url)||undefined} target="_blank" rel="noreferrer">Open retailer <ExternalLink size={11} style={{display:"inline"}}/></a>}</div><button className="icon-button" onClick={()=>void deleteWish(w)} aria-label="Remove wishlist idea"><Trash2 size={14}/></button></div>)}</div> : <div className="surface row"><div><strong style={{fontSize:12}}>Keep your future purchases intentional.</strong><p className="small muted" style={{margin:"5px 0 0"}}>Save a product URL and why it belongs in your wardrobe.</p></div><button className="button compact" onClick={()=>openModal("wish")}>Add wishlist idea</button></div>}
      </section>
    </>;
  }

  function renderShop() {
    return <>
      <div><span className="eyebrow">BUY WITH INTENTION</span><h1 className="page-title serif">The curated shop.</h1><p className="page-subtitle">Shop for a genuine gap in your wardrobe. Approved products appear when licensed merchant feeds are live; meanwhile, browse researched Kenyan retailers below.</p></div>
      
      {admin&&<section className="surface section"><div className="row"><div><span className="eyebrow">MERCHANT CATALOG ADMIN</span><h2 className="section-title">Manage product listings</h2><p className="section-note">Only your allow-listed admin account can manage these records.</p></div><button className="button primary" onClick={()=>openModal("product")}><Plus size={14}/>Add product</button></div>
        {adminProducts.length ? <div className="stack" style={{marginTop:15}}>{adminProducts.map(p=><div className="outfit-row" key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="avatar"><ShoppingBag size={16}/></div>}<div style={{flex:1,minWidth:0}}><strong>{p.title}</strong><small>{p.merchant} · {p.currency} {p.price ?? "price not set"}</small><div className="tool-row" style={{marginTop:7}}><button className="button compact" onClick={()=>void toggleProduct(p,"is_active")}>{p.is_active?"Hide":"Activate"}</button><button className="button compact" onClick={()=>void toggleProduct(p,"is_approved")}>{p.is_approved?"Unapprove":"Approve"}</button><button className="button compact" onClick={()=>void deleteProduct(p)}><Trash2 size={12}/>Delete</button></div></div><span className="badge neutral">{p.is_approved?"Approved":"Pending"}</span></div>)}</div> : <p className="small muted" style={{marginTop:12}}>No catalog items have been added yet.</p>}</section>}
      <section className="section"><div className="section-head"><div><span className="eyebrow">APPROVED PRODUCT CATALOGUE</span><h2 className="section-title">A considered edit, not endless scrolling.</h2></div></div>
        {products.length ? <div className="product-grid">{products.map(p=><article className="product-card" key={p.id}>{p.image_url&&safeExternalUrl(p.image_url)?<img src={p.image_url} alt={p.title} loading="lazy"/>:<div style={{height:210,background:"#efede6",display:"grid",placeItems:"center"}}><ShoppingBag size={30} color="#8a8f7f"/></div>}<div className="piece-info"><span className="badge neutral">{p.merchant}</span><strong style={{display:"block",marginTop:9}}>{p.title}</strong><div className="product-price">{p.price===null?"See merchant for price":p.currency+" "+Number(p.price).toLocaleString()}</div><p className="small muted" style={{lineHeight:1.55}}>{p.description||"Curated product listing."}</p><div className="tool-row"><a className="button compact primary" href={safeExternalUrl(p.affiliate_url)||safeExternalUrl(p.product_url)||undefined} target="_blank" rel="sponsored noopener noreferrer">View product <ArrowUpRight size={13}/></a><button className="button compact" onClick={()=>{openModal("wish");}}><Heart size={13}/></button></div></div></article>)}</div> : <EmptyState icon={ShoppingBag} title="We're curating the first collection." body="Retail listings will appear once merchants and product-image permissions are verified. You can still save individual product links to your wishlist." action="Save a shopping idea" onAction={()=>openModal("wish")}/>}
      </section>
      <RetailDiscover wardrobe={items} style={styleName} onSaveWishlist={saveOccasionWishlist}/>
      {user && <ShoppingJournal userId={user.id}/>}
      <section className="section surface soft"><div className="row" style={{alignItems:"start"}}><div><span className="eyebrow">ARE YOU A BRAND OR A SHOP?</span><h2 className="section-title">Make your products part of someone's style.</h2><p className="section-note" style={{maxWidth:490}}>Request a partnership to discuss a product feed, image permissions, stock updates and referral terms. We review all merchants before publishing.</p></div><Store size={27}/></div><button className="button" style={{marginTop:17}} onClick={()=>openModal("merchant")}>Apply as a merchant <ArrowRight size={14}/></button></section>
    </>;
  }

  function renderInsights() {
    return <StyleInsights
      items={items}
      outfits={outfits}
      integrationHealth={integrationHealth}
      calendarConnected={calendarStatus.connected}
      weatherConnected={Boolean(weather)}
      weatherCitySet={Boolean(weatherCity)}
      productCount={products.length}
      onStyleItem={(name) => {
        setMood("Build a look featuring " + name + ".");
        switchScreen("Stylist");
        void generateLooks("Build a look featuring " + name + ".", occasion);
      }}
    />;
  }

  async function saveOccasionWishlist(title: string, url: string, note: string): Promise<boolean> {
    if (!user) { showToast("Sign in to save a private wishlist."); return false; }
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) { showToast("Use a valid HTTPS product URL."); return false; }
    const { error } = await createClient().from("wishlist_items").insert({
      user_id: user.id,
      title: title.slice(0, 160),
      product_url: safeUrl,
      note: note.slice(0, 500) || null,
    });
    if (error) { showToast("Couldn't save that product link. Please try again."); return false; }
    await loadData(user.id);
    showToast("Product link saved to your private wishlist.");
    return true;
  }

  function renderOccasionStudio() {
    return <OccasionStudio
      items={items}
      products={products}
      generated={generated}
      styling={styling}
      onGenerate={(prompt, selectedOccasion) => { setOccasion(selectedOccasion); void generateLooks(prompt, selectedOccasion); }}
      onPlan={(date, title, selectedOccasion) => { setOccasion(selectedOccasion); openModal("plan", null, date); setModalPlanTitle(title); setModalPlanOccasion(selectedOccasion); }}
      onRenderLook={(idea, index) => renderOutfitIdea(idea, index)}
      onSaveWishlist={saveOccasionWishlist}
    />;
  }

    function renderTryOn() {
    return <TryOnRoom userId={user?.id || ""} items={items} configured={Boolean(integrationHealth?.tryOnConfigured)} />;
  }

  function renderCommunity() { return user?.id ? <StyleCommunity userId={user.id} defaultName={profile.full_name || user.name} draft={communityDraft} onDraftPublished={()=>setCommunityDraft(null)}/> : null; }

  function renderSettings() {
    const prefs=profile.style_preferences||{};
    return <>
      <div><span className="eyebrow">YOUR SPACE, YOUR RULES</span><h1 className="page-title serif">Preferences.</h1><p className="page-subtitle">Tell LOOKU what feels right. Your feedback and preferences guide recommendations, but you can change them whenever you like.</p></div>
      <section className="surface looku-theme-panel" aria-label="Appearance preferences">
        <div><h2>Appearance</h2><p>Looku opens in dark mode. You can switch to light mode any time.</p></div>
        <div className="looku-theme-options">
          <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setLookuTheme("dark")} aria-pressed={theme === "dark"}><Moon size={14}/>Dark</button>
          <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setLookuTheme("light")} aria-pressed={theme === "light"}><Sun size={14}/>Light</button>
        </div>
      </section>
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
          <div className="surface soft"><span className="eyebrow">YOUR AI ALLOWANCE</span><h3 style={{fontSize:23,fontWeight:500,margin:"10px 0 5px"}}>10 AI operations per day</h3><p className="small muted" style={{lineHeight:1.6}}>The backend applies a per-user daily limit to help control model costs. Image recognition and styling use the same allowance.</p></div>
          <div className="surface"><span className="eyebrow">PRIVACY AND CONTROL</span><p className="small muted" style={{lineHeight:1.7}}>You can remove wardrobe items, delete saved looks and export your metadata. You can delete your account from this screen. The secure server-side flow confirms your email, removes private photos, and deletes account records.</p><a className="text-action" href="https://www.odpc.go.ke/" target="_blank" rel="noreferrer">Kenya data protection authority <ExternalLink size={11} style={{display:"inline"}}/></a></div>
          {admin&&<div className="surface"><span className="eyebrow">INTERNAL TOOLS</span><h3 style={{margin:"8px 0",fontWeight:500}}>Catalog administration</h3><p className="small muted">You are allow-listed for catalog management. Add records, inspect review state and only publish products with authorized sources.</p><button className="button compact" onClick={()=>switchScreen("Shop")}>Open catalog tools</button></div>}
        </aside>
      </div>
    </>;
  }

  if (!ready) return null;

  if (!configured) return <main className="auth-shell"><div className="auth-card"><Link href="/" className="wordmark">looku<span className="dot">.</span></Link><h1 className="page-title serif">Looku is taking a short break.</h1><p className="page-subtitle">Your style space is temporarily unavailable. Please try again shortly.</p></div></main>;

  if (!user) return <main className="auth-shell"><aside className="auth-art"><img src={heroImage} alt="Fashion editorial inspiration"/><div className="auth-art-copy"><div className="eyebrow" style={{color:"#fff"}}>YOUR CLOSET, UNDERSTOOD</div><h1>Get dressed<br/>with intention.</h1><p style={{fontSize:13,lineHeight:1.7,maxWidth:360}}>Your clothes, your day, one thoughtful look. Start with what you already own.</p></div></aside><section className="auth-panel"><div className="wordmark">looku<span className="dot">.</span></div><p className="tagline">YOUR STYLE, UNDERSTOOD.</p><h2>Your personal style space.</h2><p className="auth-desc">Sign in to keep your wardrobe, outfit plans, saved looks and style preferences in one private place.</p><a className="button primary" href="/auth" style={{width:"100%",minHeight:48}}>Sign in <ArrowRight size={15}/></a><a className="button" href="/auth?mode=signup" style={{width:"100%",marginTop:10,minHeight:48}}>Create an account</a></section></main>;

  const currentNav = navItems.find(n => n.id === screen);
  const content = screen === "Today" ? renderToday() : screen === "Closet" ? renderCloset() : screen === "Stylist" ? renderStylist() : screen === "Occasion" ? renderOccasionStudio() : screen === "TryOn" ? renderTryOn() : screen === "Plan" ? renderPlanner() : screen === "Looks" ? renderLooks() : screen === "Community" ? renderCommunity() : screen === "Shop" ? renderShop() : screen === "Insights" ? renderInsights() : renderSettings();

  return <div className="app-shell app-shell-chat">
    <main className="main-area">
      <header className="topbar looku-topbar">
        <div className="topbar-left">
          <button className="icon-button looku-menu-button" type="button" onClick={() => setMoreOpen(value => !value)} aria-label="Open navigation"><Menu size={18}/></button>
          <div className="looku-brand"><div className="wordmark">looku<span className="dot">.</span></div></div>
        </div>
        <div className="topbar-right">
          <button className="button primary compact looku-new-look-button" type="button" onClick={startNewLook} aria-label="Start a new look" title="New Look"><Plus size={14}/>New Look</button>
          <button className="icon-button" type="button" onClick={() => switchScreen("Settings")} aria-label="Profile and preferences"><UserRound size={16}/></button>
        </div>
      </header>
      {loadingData && <div className="small muted" style={{ margin: "16px 0" }}><LoaderCircle size={13} className="spin-icon" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>Syncing your style space…</div>}
      {content}
      {screen !== "Today" && <footer className="looku-app-footer"><button type="button" className="text-action" onClick={() => switchScreen("Settings")}>Privacy & preferences</button><button type="button" className="text-action" onClick={() => switchScreen("Shop")}>Store</button></footer>}
    </main>

    {(screen === "Today" || screen === "Stylist") && <div className="looku-composer-dock">
      {screen === "Today" && chat.length <= 1 && generated.length === 0 && <div className="looku-mini-prompts" aria-label="Try a look">
        <button type="button" onClick={() => setChatInput("Style me for today using what I own.")}>Today</button>
        <button type="button" onClick={() => { setOccasion("Date night"); setChatInput("Help me put together a date-night outfit."); }}>Date night</button>
        <button type="button" onClick={() => { setShowOutfitScanner(true); switchScreen("Closet"); }}>Photo</button>
        <button type="button" onClick={() => switchScreen("Shop")}>Shop</button>
      </div>}
      <form className="looku-composer-form" onSubmit={sendChat}>
        <button className="looku-composer-tool" type="button" onClick={() => { setShowOutfitScanner(true); switchScreen("Closet"); }} aria-label="Add wardrobe photo" title="Add from a photo"><Plus size={20}/></button>
        <textarea id="looku-composer-input" className="looku-composer-input" rows={1} style={{ overflowY: chatInput.length > 180 ? "auto" : "hidden" }} maxLength={1000} value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="Describe the look you want…" aria-label="Describe the look you want"/>
        <div className="looku-composer-tools">
          <button className="looku-composer-tool" type="button" onClick={startVoiceInput} aria-label="Use voice input" title="Speak your prompt"><Mic size={18}/></button>
          <button className="looku-composer-send" type="submit" disabled={styling || !chatInput.trim()} aria-label="Create look" title="Create look"><ArrowRight size={18}/></button>
        </div>
      </form>
      
    </div>}

    {moreOpen && <div className="looku-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMoreOpen(false); }}>
      <aside className="looku-drawer" role="dialog" aria-modal="true" aria-label="Looku menu">
        <div className="looku-drawer-head"><div className="wordmark">looku<span className="dot">.</span></div><button type="button" className="icon-button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={16}/></button></div>
        <button type="button" className="button looku-drawer-new" onClick={startNewLook}><Plus size={15}/>New Look</button>
        <nav aria-label="Looku sections">
          {navItems.map(item => {
            const label = item.id === "Today" ? "Today’s selection" : item.id === "Closet" ? "Wardrobe" : item.id === "Plan" ? "Calendar" : item.id === "Looks" ? "Memories" : item.id === "Shop" ? "Store" : item.id === "Settings" ? "Profile & preferences" : item.id === "Stylist" ? "AI stylist chat" : item.label;
            return <div key={item.id}>
              {item.group && <div className="eyebrow looku-drawer-group">{item.group}</div>}
              <button type="button" className={"nav-link" + (screen === item.id ? " active" : "")} onClick={() => switchScreen(item.id)}><item.icon size={17}/><span>{label}</span>{item.id === "Closet" && items.length > 0 && <span style={{ marginLeft: "auto", fontSize: 10 }}>{items.length}</span>}</button>
            </div>;
          })}
        </nav>
        <button className="looku-drawer-profile" type="button" onClick={() => switchScreen("Settings")}><div className="avatar">{getInitials(profile.full_name || user.name)}</div><div style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", fontSize: 12 }}>{profile.full_name || user.name}</strong><span className="tiny muted">{user.email}</span></div><Settings size={15}/></button>
        <button type="button" className="nav-link" onClick={() => void signOut()}><LogOut size={16}/>Sign out</button>
      </aside>
    </div>}

    {renderModal()}
    {toastMessage && <div className="toast" role="status">{toastMessage}</div>}
  </div>;
}
