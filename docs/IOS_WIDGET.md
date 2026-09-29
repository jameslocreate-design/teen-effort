# iOS Home Screen Widget ("Time Together")

The app now ships everything needed for an iPhone home-screen widget that shows
how many days the couple has been together. The web side is done; the native
side is wired up once in Xcode.

## What's already in the repo

- `src/lib/widgetSync.ts` — sends the relationship start date to the phone
  whenever it loads or changes (called from `TimeTogether.tsx`).
- `native-ios/App/WidgetDataPlugin.swift` + `WidgetDataPlugin.m` — Capacitor
  plugin that stores the date in the shared App Group container and tells
  iOS to refresh the widget.
- `native-ios/TeenEffortWidget/TeenEffortWidget.swift` — the widget itself
  (small home-screen size, dark "Midnight & Rose" styling).

## One-time setup in Xcode (on your Mac)

1. `git pull`, `npm install`, `npm run build`, `npx cap sync ios`, then open
   the project: `npx cap open ios`.
2. **Add the plugin files:** in Finder, drag `native-ios/App/WidgetDataPlugin.swift`
   and `WidgetDataPlugin.m` into Xcode's `App/App` folder (check "Copy items if
   needed", target: **App**).
3. **Create the widget target:** Xcode → File → New → Target → **Widget Extension**
   → name it `TeenEffortWidget` (uncheck "Include Configuration App Intent" if
   offered) → Finish → Activate scheme when asked.
4. **Replace the generated widget code:** delete the Swift file Xcode generated
   inside the `TeenEffortWidget` folder and drag in
   `native-ios/TeenEffortWidget/TeenEffortWidget.swift` (target:
   **TeenEffortWidget** only — do NOT also add it to the App target).
5. **Enable App Groups on both targets:**
   - App target → Signing & Capabilities → + Capability → **App Groups** → add
     `group.com.teeneffort.app`.
   - TeenEffortWidget target → same steps, same group name.
6. Build and run on your phone (Product → Run).

## Using the widget

On the iPhone: long-press the home screen → tap **+** (top left) → search
"Teen Effort" → add the **Time Together** widget. It updates at midnight and
immediately whenever the start date is set or changed in the app.

## Notes

- The widget only reads a date string from the shared container — no account
  data, no location, nothing else leaves the app.
- Lock-screen widgets can be added later by adding `.accessoryRectangular` etc.
  to `supportedFamilies` in `TeenEffortWidget.swift`.
