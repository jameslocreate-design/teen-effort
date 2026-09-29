import WidgetKit
import SwiftUI

/// Home-screen widget showing how long the couple has been together.
/// Reads the relationship start date from the shared App Group container
/// (written by the main app via the WidgetData Capacitor plugin).

private let appGroup = "group.com.teeneffort.app"
private let startDateKey = "relationship_start_date"

struct TimeTogetherEntry: TimelineEntry {
    let date: Date
    let startDate: Date?
}

struct TimeTogetherProvider: TimelineProvider {
    private func currentEntry() -> TimeTogetherEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        var start: Date? = nil
        if let iso = defaults?.string(forKey: startDateKey) {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            start = formatter.date(from: iso)
        }
        return TimeTogetherEntry(date: Date(), startDate: start)
    }

    func placeholder(in context: Context) -> TimeTogetherEntry { currentEntry() }
    func getSnapshot(in context: Context, completion: @escaping (TimeTogetherEntry) -> Void) {
        completion(currentEntry())
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TimeTogetherEntry>) -> Void) {
        let entry = currentEntry()
        // Refresh just after midnight so the day count stays correct.
        let tomorrow = Calendar.current.startOfDay(for: Date()).addingTimeInterval(86400 + 60)
        completion(Timeline(entries: [entry], policy: .after(tomorrow)))
    }
}

struct TimeTogetherWidgetView: View {
    let entry: TimeTogetherEntry

    private var daysTogether: Int? {
        guard let start = entry.startDate else { return nil }
        return Calendar.current.dateComponents([.day], from: start, to: Date()).day
    }

    private var breakdown: String? {
        guard let start = entry.startDate else { return nil }
        let c = Calendar.current.dateComponents([.year, .month, .day], from: start, to: Date())
        var parts: [String] = []
        if let y = c.year, y > 0 { parts.append("\(y) yr") }
        if let m = c.month, m > 0 { parts.append("\(m) mo") }
        parts.append("\(c.day ?? 0) days")
        return parts.joined(separator: " ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .foregroundColor(Color(red: 0.94, green: 0.45, blue: 0.6))
                Text("Time Together")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            if let days = daysTogether, let breakdown {
                Text("\(days)")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Text(days == 1 ? "day together" : "days together")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(breakdown)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            } else {
                Text("Set your start date in the app 💕")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(Color(red: 0.08, green: 0.07, blue: 0.12), for: .widget)
    }
}

@main
struct TeenEffortWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TeenEffortWidget", provider: TimeTogetherProvider()) { entry in
            TimeTogetherWidgetView(entry: entry)
        }
        .configurationDisplayName("Time Together")
        .description("See how many days you and your partner have been together.")
        .supportedFamilies([.systemSmall])
    }
}
