export type ResearchSource = {
  id: string;
  title: string;
  publisher: string;
  year: string;
  url: string;
  takeaway: string;
  application: string;
  limitation: string;
};

export const STYLE_RESEARCH_REVIEWED = "2026-10-26";

export const STYLE_RESEARCH_SOURCES: ResearchSource[] = [
  {
    id: "usu-design-principles",
    title: "Design Principles for Clothing and Textiles",
    publisher: "Utah State University Extension",
    year: "2016",
    url: "https://extension.usu.edu/research/principles-of-design",
    takeaway: "Clothing design uses balance, proportion, emphasis, rhythm and visual harmony. Color, line and texture contribute to the overall ensemble.",
    application: "LOOKU checks the overall combination rather than rating one garment in isolation. Recommendations consider color, category, available item attributes and the occasion.",
    limitation: "Harmony is partly subjective. The user's comfort, culture, personal style and feedback override generic aesthetic heuristics.",
  },
  {
    id: "moderate-color-coordination",
    title: "The Science of Style: In Fashion, Colors Should Match Only Moderately",
    publisher: "PLOS ONE · Gray, Schmitt, Strohminger & Kassam",
    year: "2014",
    url: "https://doi.org/10.1371/journal.pone.0102772",
    takeaway: "Experiments reported a quadratic relationship between color coordination and perceived fashionability in the studied palettes: both extreme matching and extreme contrast could perform worse than moderate coordination.",
    application: "Color matching is a soft ranking signal, not a rigid rule. LOOKU should offer both coordinated and more expressive alternatives when the wardrobe supports them.",
    limitation: "The study does not establish a universal rule for every culture, garment, trend or individual. It must not be treated as a prescription.",
  },
  {
    id: "interactive-garment-recommendation",
    title: "Interactive Garment Recommendation with User in the Loop",
    publisher: "ACM Transactions on Multimedia Computing, Communications and Applications",
    year: "2024",
    url: "https://doi.org/10.1145/3702327",
    takeaway: "The paper explores outfit recommendation that updates a user preference profile from their reactions as complementary items are presented.",
    application: "LOOKU treats likes, dislikes, swaps and wear feedback as user-specific signals that can refine future suggestions instead of assuming a generic style profile.",
    limitation: "Research results do not guarantee individual recommendation quality; LOOKU should keep feedback editable, explain recommendations and allow users to reset personalization.",
  },
  {
    id: "unep-textile-circularity",
    title: "Sustainability and Circularity in the Textile Value Chain: A Global Roadmap",
    publisher: "United Nations Environment Programme",
    year: "2023",
    url: "https://wedocs.unep.org/handle/20.500.11822/42580",
    takeaway: "The roadmap describes the need for systemic changes across textile design, consumption and value chains to support more sustainable and circular textile use.",
    application: "LOOKU is wardrobe-first: reuse existing garments, log wear, reveal new combinations and identify a genuine wardrobe gap before recommending a new purchase.",
    limitation: "The report is a sector-level roadmap; it does not prove that any single app feature produces an environmental benefit. LOOKU should measure reuse rather than claim impact without data.",
  },
  {
    id: "whering-wardrobe-practices",
    title: "Digital wardrobe, outfit planning and wardrobe-use features",
    publisher: "Whering · Official product information",
    year: "2026",
    url: "https://www.whering.co/",
    takeaway: "A leading wardrobe app publicly describes cataloguing owned clothes, planning outfits, understanding wear patterns and using wishlists to reconsider purchases.",
    application: "LOOKU should meet baseline expectations for wardrobe search, outfit planning and wear history while differentiating through occasion-first planning, explicit shopping gaps and transparent integrations.",
    limitation: "Competitor marketing is not independent evidence of outcomes. It is used for feature benchmarking, not as proof that a feature improves sustainability or user satisfaction.",
  },
  {
    id: "unep-fashion-business",
    title: "Transforming the Textile Industry: Creating Circular, Socially Conscious Businesses",
    publisher: "United Nations Environment Programme",
    year: "2025",
    url: "https://wedocs.unep.org/handle/20.500.11822/48706",
    takeaway: "UNEP describes a largely linear fashion model and the economic and environmental importance of moving toward circular practices and more durable use.",
    application: "The marketplace should complement a user's wardrobe, not push endless purchasing. Product suggestions must be optional, transparent and linked to a verified merchant.",
    limitation: "LOOKU must not claim that an affiliate suggestion is sustainable merely because it matches a wardrobe gap; product-specific evidence is required.",
  },
  {
    id: "fashion-compatibility-explanations",
    title: "Deciphering Compatibility Relationships with Textual Descriptions via Extraction and Explanation",
    publisher: "AAAI Conference on Artificial Intelligence",
    year: "2024",
    url: "https://doi.org/10.1609/aaai.v38i8.28764",
    takeaway: "This paper introduces the Pair Fashion Explanation dataset and a two-stage method for generating descriptions of why fashion items complement one another.",
    application: "LOOKU should name observable reasons such as category balance and recorded color coordination rather than relying on vague claims like 'perfectly stylish'.",
    limitation: "A published benchmark does not validate a user's fit, taste, cultural requirements or event details. Explanations must remain grounded in known garment attributes.",
  },
  {
    id: "personalized-coordination-preferences",
    title: "Personalized Fashion Outfit Generation with User Coordination Preference Learning",
    publisher: "Information Processing & Management",
    year: "2023",
    url: "https://doi.org/10.1016/j.ipm.2023.103434",
    takeaway: "The study models user preferences for category combinations alongside item compatibility when generating personalized outfits.",
    application: "LOOKU should separate general outfit plausibility from personal taste: saved preferences, likes, dislikes, swaps and wear feedback can affect the ordering of workable looks.",
    limitation: "The reported results use research datasets and may not transfer directly to a wardrobe-first app or Kenyan users. User control and varied alternatives remain necessary.",
  },
  {
    id: "multimodal-outfit-recommendation",
    title: "A Comparative Study of Outfit Recommendation Methods with a Focus on Attention-based Fusion",
    publisher: "Information Processing & Management",
    year: "2020",
    url: "https://doi.org/10.1016/j.ipm.2020.102316",
    takeaway: "This comparative study examines how visual and textual garment features can be combined to capture complementary information for outfit recommendation.",
    application: "LOOKU's garment records combine user-correctable attributes with image recognition. The app must not treat one photo or a generic embedding as reliable evidence of fit, fabric or personal suitability.",
    limitation: "Benchmark gains are not a guarantee of individual recommendation quality. Image quality, category coverage and local preferences still need real-user evaluation.",
  },
  {
    id: "fashion-zero-party-preferences",
    title: "Development of a Fashion Recommendation System with Consumers' Zero-Party Data Applying the CART Decision-Tree Model",
    publisher: "Journal of Fashion Marketing and Management",
    year: "2026",
    url: "https://doi.org/10.1108/JFMM-07-2024-0284",
    takeaway: "This research studies whether self-reported consumer data can support a fashion recommendation model, using a decision-tree approach for product preference prediction.",
    application: "LOOKU asks users directly about style, comfort and budget instead of inferring personal traits. Only preferences relevant to the requested styling task should influence a recommendation.",
    limitation: "The study focuses on sock preferences and its purchasing context may differ from LOOKU. Self-reported preferences can change, so users must be able to edit or clear them.",
  },
  {
    id: "fashion-explanation-experience",
    title: "LLM-generated Content-based Explanations for User Experience in Fashion Recommender Systems",
    publisher: "Fashion and Textiles · Springer Nature",
    year: "2026",
    url: "https://doi.org/10.1186/s40691-026-00464-z",
    takeaway: "A 2026 study with 211 participants reports that informative, detailed content-based explanations improved recommendation satisfaction and trust in its tested fashion-commerce interface.",
    application: "LOOKU should explain suggestions using the actual item categories, recorded colors, stated preferences and occasion requirements. Give the user enough evidence to judge the look rather than implying the model cannot be wrong.",
    limitation: "The findings come from one study interface and product-recommendation setting; they do not prove that LOOKU recommendations are accurate or universally preferred.",
  }
];

export const RECOMMENDATION_RULES = [
  "Hard constraints first: available owned pieces, event dress code, comfort and explicit user constraints outrank aesthetic preferences.",
  "Weather is a contextual signal, not a guess. Use current provider data when configured; otherwise say weather is unknown rather than inventing a forecast.",
  "Visual harmony is multi-factor: combine category logic with color, pattern, silhouette and texture only when the item's data supports those signals.",
  "Color coordination is a preference, not a universal rule. Offer some variety and adapt to the user's saved likes, dislikes and past outfit feedback.",
  "Use wardrobe history carefully: reduce repetition of recently worn pieces unless the user asks for a familiar outfit.",
  "Explain recommendations in plain language using observable garment attributes. Never invent a brand, garment, fabric, fit, weather condition or body measurement.",
  "Shopping is the last step, not the default answer. Explain the wardrobe gap and show a real approved product source; if no approved products exist, do not fabricate inventory.",
  "Return a small, distinct shortlist: one strong default and up to two meaningfully different alternatives. The user remains in control.",
];

export const INTEGRATION_GUIDES = [
  {
    id: "ai",
    name: "AI Gateway",
    purpose: "Wardrobe photo recognition and personalized outfit reasoning.",
    status: "code-ready",
    required: "AI_GATEWAY_API_KEY, or supported Vercel-native Gateway authentication",
    setup: "https://vercel.com/docs/ai-gateway/getting-started",
    note: "Model calls can incur usage costs. LOOKU validates returned garment IDs and enforces a daily account limit.",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    purpose: "Read upcoming events and help the user plan suitable outfits.",
    status: "optional-credentials",
    required: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALENDAR_TOKEN_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY",
    setup: "https://developers.google.com/workspace/calendar/api/auth",
    note: "Requests read-only event access only. Google may require OAuth app verification before public launch; the user connects the calendar explicitly.",
  },
  {
    id: "weather",
    name: "WeatherAPI",
    purpose: "Temperature, feels-like conditions, precipitation and wind for clothing context.",
    status: "optional-credentials",
    required: "WEATHERAPI_KEY and a city saved in preferences",
    setup: "https://www.weatherapi.com/docs/",
    note: "The key stays server-side. If the provider is not configured or fails, weather-dependent styling is labelled unavailable rather than guessed.",
  },
  {
    id: "tryon",
    name: "FASHN Virtual Try-On",
    purpose: "Generate a visual preview of an owned or catalog garment on a user-provided photo.",
    status: "optional-paid-provider",
    required: "FASHN_API_KEY",
    setup: "https://docs.fashn.ai/api-reference/tryon-max",
    note: "This is a paid external inference service. A user must explicitly start a try-on and agree that the selected photos are sent to the provider. Results are illustrative, not fit or sizing guarantees.",
  },
  {
    id: "retail",
    name: "Retailer and affiliate catalog",
    purpose: "Show genuine items, current merchant destinations and transparent affiliate links.",
    status: "merchant-onboarding",
    required: "Authorized merchant product feed or explicit catalog permission",
    setup: "https://www.cj.com/",
    note: "LOOKU has catalog approval controls; products stay hidden until an administrator verifies the source and image permissions. No invented stock, pricing or commissions.",
  },
];

export function getResearchPrompt(): string {
  return [
    "LOOKU STYLE RESEARCH LAYER (curated guidance, not universal rules):",
    ...RECOMMENDATION_RULES.map((rule, i) => (i + 1) + ". " + rule),
    "Evidence notes (curated sources, not universal fashion laws):",
    ...STYLE_RESEARCH_SOURCES.filter(source => source.id !== "whering-wardrobe-practices").map(source => source.publisher + " (" + source.year + "): " + source.application + " Source: " + source.url),
    "Do not claim research proves that one outfit is objectively best. Personal feedback, comfort, culture, event requirements and available garment data take precedence. Do not invent citations or imply a live internet search occurred."
  ].join("\n");
}
