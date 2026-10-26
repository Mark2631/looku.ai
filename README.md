# LOOKU

LOOKU is a mobile-first personal fashion platform: a private digital wardrobe, an AI stylist grounded in real owned items, an outfit planner, a personal lookbook, and a curated shopping layer.

## Technology

- Next.js App Router and TypeScript, deployed on Vercel.
- Supabase Auth (cookie-based SSR sessions), PostgreSQL, Row Level Security and private Storage.
- Vercel AI Gateway / AI SDK for image classification and wardrobe-aware outfit generation.
- Embedded style-research library with cited design principles, wardrobe-first circularity and explicit limitations.
- Optional FASHN virtual try-on integration with a user-controlled photo upload, private output storage, and a two-per-day quota.
- Optional, read-only Google Calendar OAuth with encrypted server-side tokens.
- Optional WeatherAPI current conditions based on a city the user chooses.
- Responsive PWA shell with private user data excluded from offline caching.
- Catalog admin API restricted by a server-only email allowlist.

## Local development

1. Install Node.js 20.9+ (Node 24 is recommended) and npm.
2. Copy .env.example to .env.local.
3. Create a dedicated Supabase project for LOOKU. Do not reuse CampusTrader or Galaxy Cakes production data.
4. Apply supabase/migrations/202610260001_initial_schema.sql in the Supabase SQL editor or using the Supabase CLI.
5. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Set SUPABASE_SERVICE_ROLE_KEY only on the server for secure admin catalog management and account deletion.
6. Connect an AI Gateway account/key. Set AI_GATEWAY_API_KEY and optionally change LOOKU_AI_MODEL. Model API calls have provider costs; the API enforces an initial limit of 20 AI operations per user per UTC day.
7. Add the app URL to Supabase Auth's site URL and allowed redirect URLs, including /auth/callback.
8. Run npm install, npm run dev, npm run typecheck, and npm run build.

## Environment variables

See .env.example. Never commit .env.local, provider secrets or the Supabase service-role key. NEXT_PUBLIC_ values are public browser configuration, not secrets.

## Data and security

- Every personal table enables RLS and filters ownership using auth.uid().
- Wardrobe and lookbook photographs are held in the private wardrobe-private bucket, in per-user UUID folders. The UI obtains short-lived signed URLs only after authentication.
- AI routes require a real session, read only that user's available owned items, validate model output against valid wardrobe item UUIDs, and apply an atomic per-user daily quota.
- The service-role key is never used in browser code. Catalog writes require an authenticated user whose email is included in LOOKU_ADMIN_EMAILS, plus server-side admin credentials.
- Products are not shown to shoppers until the record is both active and approved. The application intentionally does not seed fabricated retailer products, prices, stock or affiliate relationships.
- Account deletion clears private images and then deletes the authenticated user (and cascading personal rows); the route requires an exact email confirmation and a server-side service-role key.
- Calendar and retailer integrations are optional. They must be enabled only after OAuth scopes and merchant permissions are configured.
- The initial MVP has no virtual try-on model included. Add only a model/provider whose commercial terms and data handling have been reviewed.

## Deployment

Import Mark2631/looku.ai into the intended Vercel team. Add the environment variables from .env.example to the appropriate Vercel environments, run the migration, and configure Supabase Auth redirect URLs for the deployed app. The /api/health endpoint reports configuration flags without exposing secret values.

## Research and integrations

The Style Intelligence screen presents the source, takeaway, product application and limitations of each research item. Research is injected into the stylist prompt as guidance; it is not treated as a universal fashion law. Recommendation logic prioritizes available owned garments, occasion and personal constraints, then balances color/category and wear-history signals. Actual weather and calendar context are sent only when configured, available and user-authorized.

The virtual fitting room uses a paid FASHN API only after the user submits a photo and chooses a garment. It uses a small daily quota, short-lived image URLs and private result storage. Generated previews are illustrative and are not fit/sizing guarantees. Review current provider terms, image handling and pricing before enabling the key. No paid credentials are committed to GitHub.

## Product boundaries

The app does not invent store inventory. Until approved retailer data is onboarded, the shop displays an honest empty state and lets each user save private wishlist links. AI should never substitute imaginary clothing for a user's actual wardrobe.
