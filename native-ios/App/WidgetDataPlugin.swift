import Capacitor
import WidgetKit

/// Capacitor plugin that shares the relationship start date with the
/// TeenEffortWidget home-screen widget via the shared App Group container.
///
/// Setup (one time, in Xcode):
/// 1. Select the App target → Signing & Capabilities → + Capability → App Groups
///    → add `group.com.teeneffort.app`.
/// 2. Do the same on the TeenEffortWidget extension target.
@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTimeTogether", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.com.teeneffort.app"
    private let startDateKey = "relationship_start_date"

    @objc func setTimeTogether(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroup) else {
            call.reject("App Group container unavailable — enable App Groups in Xcode")
            return
        }
        if let startDate = call.getString("startDate"), !startDate.isEmpty {
            defaults.set(startDate, forKey: startDateKey)
        } else {
            defaults.removeObject(forKey: startDateKey)
        }
        // Tell WidgetKit to refresh the home-screen widget immediately.
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
