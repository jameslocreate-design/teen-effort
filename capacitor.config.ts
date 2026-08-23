import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Set CAP_LIVE_RELOAD=1 before `npx cap sync` to point the native shell at the
 * Lovable preview (fast iteration). Leave it unset for any build you ship to
 * TestFlight or the App Store — release builds must load the bundled `dist`.
 */
const useLiveReload = process.env.CAP_LIVE_RELOAD === "1";

const config: CapacitorConfig = {
  // MUST match the Bundle ID in App Store Connect / RevenueCat, or StoreKit
  // returns zero products ("None of the products ... could be fetched").
  appId: "com.teeneffort.app",
  appName: "Teen Effort",
  webDir: "dist",
  ...(useLiveReload
    ? {
        server: {
          url: "https://c5b6102f-3f27-4c69-a5ad-0fff55b1d1e0.lovableproject.com?forceHideBadge=true",
          cleartext: true,
        },
      }
    : {}),
  /**
   * Location: after `npx cap add ios`, add these keys to ios/App/App/Info.plist
   * or the location prompt never appears:
   *   NSLocationWhenInUseUsageDescription =
   *     "Teen Effort uses your location to suggest date ideas and venues nearby."
   */
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0c10",
    preferredContentMode: "mobile",
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0c10",
      showSpinner: true,
      spinnerColor: "#f53e6a",
      splashFullScreen: true,
      splashImmersive: true,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0c10",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },

  },
};

export default config;
