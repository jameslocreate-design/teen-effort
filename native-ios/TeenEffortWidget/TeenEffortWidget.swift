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
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: Date())) ?? Date().addingTimeInterval(3600)
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

// Only derived distance and calendar/checklist data are shared, never GPS or auth.
private struct DashboardSnapshot: Decodable {
    let distance: String?
    let dates: [String]
    let preparation: PreparationSnapshot?
}
private struct PreparationSnapshot: Decodable {
    let title: String
    let date: String
    let eventTime: String?
    let tasks: [PreparationItem]
}
private struct PreparationItem: Decodable {
    let label: String
    let at: Double?
    let completed: Bool
}
struct DashboardEntry: TimelineEntry {
    let date: Date
    fileprivate let snapshot: DashboardSnapshot?
}
struct DashboardProvider: TimelineProvider {
    func placeholder(in context: Context) -> DashboardEntry { DashboardEntry(date: Date(), snapshot: nil) }
    private func entry(at date: Date) -> DashboardEntry {
        let text = UserDefaults(suiteName: appGroup)?.string(forKey: "dashboard_snapshot")
        let snapshot = text?.data(using: .utf8).flatMap { try? JSONDecoder().decode(DashboardSnapshot.self, from: $0) }
        return DashboardEntry(date: date, snapshot: snapshot)
    }
    func getSnapshot(in context: Context, completion: @escaping (DashboardEntry) -> Void) { completion(entry(at: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DashboardEntry>) -> Void) {
        let now = Date()
        let current = entry(at: now)
        var times = [now]
        if let tasks = current.snapshot?.preparation?.tasks {
            times += tasks.compactMap { item in item.at.map { Date(timeIntervalSince1970: $0 / 1000) } }.filter { $0 > now }
        }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(3600)
        times.append(tomorrow)
        completion(Timeline(entries: times.sorted().map { entry(at: $0) }, policy: .after(tomorrow)))
    }
}
private func weeklyStreak(_ dates: [String], now: Date) -> Int {
    var calendar = Calendar.current
    calendar.firstWeekday = 2
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    var streak = 0
    for offset in 0..<104 {
        guard let week = calendar.date(byAdding: .weekOfYear, value: -offset, to: now),
              let interval = calendar.dateInterval(of: .weekOfYear, for: week),
              let end = calendar.date(byAdding: .day, value: -1, to: interval.end) else { break }
        let startISO = formatter.string(from: interval.start)
        let endISO = formatter.string(from: end)
        if dates.contains(where: { $0 >= startISO && $0 <= endISO }) { streak += 1 }
        else if offset > 0 { break }
    }
    return streak
}
struct DashboardWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: DashboardEntry
    let metric: String
    private var icon: String { metric == "distance" ? "location.fill" : metric == "streak" ? "flame.fill" : "checklist" }
    private var heading: String { metric == "distance" ? "Partner Distance" : metric == "streak" ? "Date Streak" : "Date Prep" }
    private var preparation: PreparationSnapshot? {
        guard let prep = entry.snapshot?.preparation else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard prep.date >= formatter.string(from: entry.date) else { return nil }
        if let time = prep.eventTime, let target = formatterWithTime().date(from: "\(prep.date) \(time.prefix(5))"), target < entry.date { return nil }
        return prep
    }
    private func formatterWithTime() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter
    }
    private var summary: String {
        if metric == "distance" { return entry.snapshot?.distance ?? "Set both home cities" }
        if metric == "streak" { return "\(weeklyStreak(entry.snapshot?.dates ?? [], now: entry.date)) week streak" }
        guard let prep = preparation else { return "No upcoming date" }
        let task = prep.tasks.first { !$0.completed && ($0.at.map { $0 / 1000 >= entry.date.timeIntervalSince1970 } ?? true) }
        return task?.label ?? "Ready for your date"
    }
    var body: some View {
        Group {
            if family == .accessoryInline {
                Label(summary, systemImage: icon)
            } else if family == .accessoryCircular {
                VStack(spacing: 2) {
                    Image(systemName: icon)
                    if metric == "streak" {
                        Text("\(weeklyStreak(entry.snapshot?.dates ?? [], now: entry.date))").font(.headline)
                    } else { Text(summary).font(.system(size: 9)).multilineTextAlignment(.center).lineLimit(3).minimumScaleFactor(0.7) }
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Label(heading, systemImage: icon).font(.caption).foregroundStyle(roseColor)
                    Text(summary).font(.headline).lineLimit(2).minimumScaleFactor(0.8)
                    if metric == "preparation", let prep = preparation {
                        Text(prep.title).font(.caption2).lineLimit(1)
                        if family == .systemMedium {
                            ForEach(Array(prep.tasks.enumerated()), id: \.offset) { _, task in
                                HStack(spacing: 5) {
                                    Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                                    Text(task.label).lineLimit(1)
                                    Spacer()
                                    if let at = task.at { Text(Date(timeIntervalSince1970: at / 1000), style: .time) }
                                }.font(.caption2)
                            }
                        }
                    }
                }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
        .widgetURL(URL(string: "https://teeneffort.app/app?tab=\(metric == "preparation" ? "calendar" : "planner")"))
        .widgetBackground(family == .systemSmall || family == .systemMedium ? midnightBackground : .clear)
    }
}
struct PartnerDistanceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PartnerDistanceWidget", provider: DashboardProvider()) { DashboardWidgetView(entry: $0, metric: "distance") }
            .configurationDisplayName("Partner Distance").description("Distance between your saved home cities, not live locations.")
            .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
struct DateStreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DateStreakWidget", provider: DashboardProvider()) { DashboardWidgetView(entry: $0, metric: "streak") }
            .configurationDisplayName("Date Streak").description("Consecutive weeks with a date on your calendar.")
            .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
struct DatePreparationWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DatePreparationWidget", provider: DashboardProvider()) { DashboardWidgetView(entry: $0, metric: "preparation") }
            .configurationDisplayName("Date Prep").description("Your next date's getting-ready checklist and estimated departure time.")
            .supportedFamilies([.systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

// All widgets ship in the same existing extension.
@main
struct TeenEffortWidgetBundle: WidgetBundle {
    var body: some Widget {
        TeenEffortWidget()
        PartnerDistanceWidget()
        DateStreakWidget()
        DatePreparationWidget()
        if #available(iOS 16.1, *) {
            TeenEffortLockScreenWidget()
        }
    }
}
