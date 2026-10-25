# Project Architecture Rules

- Keep public web pages outside AuthProvider/AppShell; /app owns account entry and native / keeps the installed-app flow, so public browsing never requires birthday verification.

- Smart Recommendations reuse DateResults and DatePickerDialog and save to the existing date tables so suggested dates follow the same saved-list and shared-calendar flows as Date Planner.

- Build generated venue links through the server-side venue-links helper using venue names and locality, never activity titles or user coordinates, because prose searches can return no results.

- Keep the static public/sitemap.xml synchronized with public, indexable routes only; omit account, admin, invite, and callback routes to avoid advertising private flows.

- Let Capacitor resize the iOS web view for the software keyboard; never add keyboard height to page or safe-area padding, because that double-resizes the interface.
- All AI edge functions must import supabase/functions/_shared/content-safety.ts: add SAFETY_PROMPT, sanitize user text, filter OSM venues, check output with one retry then safe defaults — because the app is 13+ for everyone and the client cannot be trusted.
- Synchronize iOS widgets from an app-entry owner into the existing App Group plugin/extension; clear snapshots on account changes and keep auth tokens and GPS out of snapshots to protect account privacy.
- Preparation checklists are personal, device-local and keyed by user/date; use shared timing helpers and editable travel estimates because no routing service or shared checklist storage is configured.
- Date generation refreshes location and applies profile precision centrally; venues come from Google Places via the connector gateway (Overpass/OSM is the backup), and the server returns only exact verified venue matches inside the selected radius, with canonical venue/locality copy, because AI prose is not geographic proof. When no live venue data is available but the city is known, return generic activity-type ideas in the user's own city only (fallback: true, Maps search links), never a different city and never invented business names.
