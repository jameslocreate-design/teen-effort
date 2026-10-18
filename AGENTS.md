# Project Architecture Rules

- Keep the static public/sitemap.xml synchronized with public, indexable routes only; omit account, admin, invite, and callback routes to avoid advertising private flows.

- Let Capacitor resize the iOS web view for the software keyboard; never add keyboard height to page or safe-area padding, because that double-resizes the interface.- All AI edge functions must import supabase/functions/_shared/content-safety.ts: add SAFETY_PROMPT, sanitize user text, filter OSM venues, check output with one retry then safe defaults — because the app is 13+ for everyone and the client cannot be trusted.
