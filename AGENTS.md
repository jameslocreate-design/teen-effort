# Project Architecture Rules

- Keep public web pages outside AuthProvider/AppShell; /app owns account entry and native / keeps the installed-app flow, so public browsing never requires birthday verification.

- Smart Recommendations reuse DateResults and DatePickerDialog and save to the existing date tables so suggested dates follow the same saved-list and shared-calendar flows as Date Planner.

- Build generated venue links through the server-side venue-links helper using venue names and locality, never activity titles or user coordinates, because prose searches can return no results.

- Keep the static public/sitemap.xml synchronized with public, indexable routes only; omit account, admin, invite, and callback routes to avoid advertising private flows.

- Let Capacitor resize the iOS web view for the software keyboard; never add keyboard height to page or safe-area padding, because that double-resizes the interface.- All AI edge functions must import supabase/functions/_shared/content-safety.ts: add SAFETY_PROMPT, sanitize user text, filter OSM venues, check output with one retry then safe defaults — because the app is 13+ for everyone and the client cannot be trusted.
