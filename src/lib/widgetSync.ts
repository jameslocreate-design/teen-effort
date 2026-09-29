import { registerPlugin } from "@capacitor/core";
import { isNative, isIOS } from "@/lib/native";

/**
 * Bridge to the native WidgetData plugin (iOS). The plugin writes the
 * relationship start date into the shared App Group container so the
 * WidgetKit home-screen widget can read it. On web/Android this is a no-op.
 */
interface WidgetDataPlugin {
  setTimeTogether(options: { startDate: string | null }): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData");

/** Push the current relationship start date (yyyy-MM-dd or null) to the iOS widget. */
export async function syncTimeTogetherWidget(startDate: string | null) {
  if (!isNative() || !isIOS()) return;
  try {
    await WidgetData.setTimeTogether({ startDate });
  } catch {
    /* plugin not installed in this build yet — ignore */
  }
}
