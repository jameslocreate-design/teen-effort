import WidgetKit
import SwiftUI

/// Home-screen and lock-screen widgets showing how long the couple has
/// been together. Reads the relationship start date from the shared App
/// Group container (written by the main app via the WidgetData Capacitor
/// plugin).

private let appGroup = "group.com.teeneffort.app"
private let startDateKey = "relationship_start_date"

private let roseColor = Color(red: 0.94, green: 0.45, blue: 0.6)
private let midnightBackground = Color(red: 0.08, green: 0.07, blue: 0.12)

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

// MARK: - Shared helpers

private func daysTogether(_ start: Date?) -> Int? {
    guard let start else { return nil }
    return Calendar.current.dateComponents([.day], from: start, to: Date()).day
}

private func breakdown(_ start: Date?) -> String? {
    guard let start else { return nil }
    let c = Calendar.current.dateComponents([.year, .month, .day], from: start, to: Date())
    var parts: [String] = []
    if let y = c.year, y > 0 { parts.append("\(y) yr") }
    if let m = c.month, m > 0 { parts.append("\(m) mo") }
    parts.append("\(c.day ?? 0) days")
    return parts.joined(separator: " ")
}

// MARK: - Home-screen widget

struct TimeTogetherWidgetView: View {
    let entry: TimeTogetherEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .foregroundColor(roseColor)
                Text("Time Together")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            if let days = daysTogether(entry.startDate), let text = breakdown(entry.startDate) {
                Text("\(days)")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Text(days == 1 ? "day together" : "days together")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(text)
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
        .widgetBackground(midnightBackground)
    }
}

// containerBackground only exists on iOS 17+; fall back to a plain
// background on iOS 16 so the widget builds for the 16.6 deployment target.
extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

// MARK: - Lock-screen widgets

struct TimeTogetherAccessoryView: View {
    @Environment(\.widgetFamily) var family
    let entry: TimeTogetherEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "heart.fill")
                        .font(.caption2)
                        .foregroundStyle(roseColor)
                    if let days = daysTogether(entry.startDate) {
                        Text("\(days)")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                    } else {
                        Image(systemName: "calendar.badge.plus")
                            .font(.caption)
                    }
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .foregroundStyle(roseColor)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Time Together")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if let days = daysTogether(entry.startDate) {
                        Text(days == 1 ? "1 day together" : "\(days) days together")
                            .font(.headline)
                    } else {
                        Text("Set your start date in the app")
                            .font(.caption)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default: // .accessoryInline
            if let days = daysTogether(entry.startDate) {
                Label(days == 1 ? "1 day together" : "\(days) days together", systemImage: "heart.fill")
            } else {
                Label("Set your start date", systemImage: "heart.fill")
            }
        }
    }
}

// MARK: - Widget configuration

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

@available(iOS 16.1, *)
struct TeenEffortLockScreenWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TeenEffortLockScreenWidget", provider: TimeTogetherProvider()) { entry in
            TimeTogetherAccessoryView(entry: entry).widgetBackground(.clear)
        }
        .configurationDisplayName("Time Together")
        .description("Your day count on your Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// Both widgets ship in one extension, so they must be listed in a bundle.
@main
struct TeenEffortWidgetBundle: WidgetBundle {
    var body: some Widget {
        TeenEffortWidget()
        if #available(iOS 16.1, *) {
            TeenEffortLockScreenWidget()
        }
    }
}
