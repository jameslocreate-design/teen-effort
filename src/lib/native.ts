import { Capacitor } from "@capacitor/core";

/** True only when running inside the Capacitor native shell (iOS/Android). */
export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === "ios";

/**
 * Apple forbids selling digital subscriptions outside In-App Purchase
 * (App Store Guideline 3.1.1), so every Stripe checkout / billing-portal
 * entry point must be hidden inside the native iOS shell.
 */
export const purchasesBlocked = () => isNative() && isIOS();

/**
 * Opens a URL. On native iOS we use the in-app SFSafariViewController so users
 * stay inside the app (App Review dislikes hard bounces to Safari); on web we
 * fall back to a normal new tab.
 */
export async function openExternal(url: string) {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

/** Light haptic tap for primary actions (no-op on web). */
export async function tapHaptic() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/**
 * Opens the native iOS share sheet (partner invites, date ideas). Falls back to
 * the Web Share API, then to copying the text to the clipboard.
 */
export async function shareContent(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: opts.title, text: opts.text, url: opts.url }).catch(() => {});
    return;
  }
  if (navigator.share) {
    await navigator.share(opts).catch(() => {});
    return;
  }
  await navigator.clipboard.writeText(opts.url ?? opts.text ?? "").catch(() => {});
}


/**
 * One-time native bootstrap: status bar styling, splash hide, hardware back
 * handling and keyboard behaviour. Safe to call on web — it exits immediately.
 */
export async function initNative() {
  if (!isNative()) return;

  const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
    import("@capacitor/app"),
    import("@capacitor/keyboard"),
  ]);

  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* status bar unavailable */
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch {
    /* keyboard plugin unavailable */
  }

  // Reflect keyboard height so fixed bottom bars stay above it.
  Keyboard.addListener("keyboardWillShow", (info) => {
    document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
    document.body.classList.add("keyboard-open");
  });
  Keyboard.addListener("keyboardWillHide", () => {
    document.documentElement.style.setProperty("--keyboard-height", "0px");
    document.body.classList.remove("keyboard-open");
  });

  // iOS has no hardware back button, but this keeps Android parity later.
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  document.body.classList.add("is-native", isIOS() ? "is-ios" : "is-android");

  await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
}
