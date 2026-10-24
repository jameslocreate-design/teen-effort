import { registerPlugin } from "@capacitor/core";
import { isNative, isIOS } from "@/lib/native";

/**
 * Bridge to the native WidgetData plugin (iOS). The plugin writes the
 * relationship start date into the shared App Group container so the
 * WidgetKit home-screen widget can read it. On web/Android this is a no-op.
 */
interface WidgetDataPlugin {
  setTimeTogether(options: { startDate: string | null }): Promise<void>;
  setDashboard(options: { snapshot: string | null }): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData");

export interface WidgetSnapshot {
  distance: string | null;
  dates: string[];
  preparation: { title: string; date: string; eventTime: string | null; tasks: { label: string; at: number | null; completed: boolean }[] } | null;
}

export async function syncDashboardWidgets(snapshot: WidgetSnapshot | null) {
  if (!isNative() || !isIOS()) return;
  try { await WidgetData.setDashboard({ snapshot: snapshot ? JSON.stringify(snapshot) : null }); }
  catch (err) { console.warn("Widget sync failed:", err); }
}

/** Push the current relationship start date (yyyy-MM-dd or null) to the iOS widget. */
export async function syncTimeTogetherWidget(startDate: string | null) {
  if (!isNative() || !isIOS()) return;
  try {
    await WidgetData.setTimeTogether({ startDate });
  } catch (err) {
    // Most often: App Group not enabled in Xcode on the App target, or the
    // WidgetData plugin wasn't added to this build. Log so it's diagnosable.
    console.warn("Widget sync failed:", err);
  }
}
