# iOS location setup (required before App Store submission)

The app code is complete — these steps live in the native project and App Store Connect,
so they must be done after `npx cap add ios`.

## 1. Info.plist usage string (required, or iOS silently skips the prompt)

Open `ios/App/App/Info.plist` and add inside the top-level `<dict>`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Teen Effort uses your location to suggest date ideas, venues, and weather near you.</string>
```

Do NOT add `NSLocationAlwaysAndWhenInUseUsageDescription` — the app only uses
foreground location, and requesting "always" triggers extra App Review scrutiny.

## 2. App Store Connect → App Privacy

Declare:

- Data type: **Location → Precise Location**
- Used for: **App Functionality**
- Linked to the user: **No**
- Used for tracking: **No**

Apple cross-checks this against the frameworks in your binary, so a missing
declaration is a common rejection.

## 3. How the runtime flow works

1. User opens the app; `LocationPermissionPrompt` shows an in-app explainer.
2. "Allow location" calls `requestLocationAccess()` → iOS shows the system dialog.
3. If granted, `getCurrentCoords()` returns coordinates for date ideas and weather.
4. If denied, iOS never prompts again — the banner switches to "Location is turned off"
   with an **Open Settings** button (`app-settings:` deep link).
5. When the app returns to the foreground, permission is re-checked automatically,
   so granting it in Settings clears the banner without a restart.

## 4. Web fallback

On the web build there is no native prompt: the browser's own geolocation dialog is
used, and users who decline can enter a city manually.
