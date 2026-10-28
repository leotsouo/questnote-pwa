import WidgetKit
import SwiftUI

// MARK: - Snapshot written by the app (src/widgetSnapshot.js → QuestNoteWidgetBridge)

struct WidgetTask: Decodable, Identifiable {
    let id: String
    let title: String
    let plannedDate: String?
    let dueDate: String?
    let priority: String?
}

struct WidgetSnapshot: Decodable {
    let schemaVersion: Int
    let today: String
    let unfinishedCount: Int
    let tasks: [WidgetTask]
}

enum SnapshotStore {
    static let appGroup = "group.io.github.leotsouo.questnote"
    static let snapshotKey = "widgetSnapshot"

    static func load() -> WidgetSnapshot? {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: snapshotKey) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}

// MARK: - Grouping (same order as src/widgetSnapshot.js, recomputed for the current day)

enum TaskGroup: Int {
    case overdue, today, upcoming, other
}

// Built once: a DateFormatter is costly and every redraw formats the day.
private let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

func localDateString(_ date: Date) -> String {
    dayFormatter.timeZone = .current
    return dayFormatter.string(from: date)
}

func group(of task: WidgetTask, today: String) -> TaskGroup {
    if let due = task.dueDate, due < today { return .overdue }
    if task.plannedDate == today || task.dueDate == today { return .today }
    if task.dueDate != nil { return .upcoming }
    return .other
}

func orderedTasks(_ tasks: [WidgetTask], today: String) -> [WidgetTask] {
    tasks.enumerated().sorted { a, b in
        let ga = group(of: a.element, today: today), gb = group(of: b.element, today: today)
        if ga != gb { return ga.rawValue < gb.rawValue }
        if ga == .upcoming, let da = a.element.dueDate, let db = b.element.dueDate, da != db { return da < db }
        return a.offset < b.offset
    }.map(\.element)
}

func dueLabel(_ task: WidgetTask, today: String) -> String? {
    switch group(of: task, today: today) {
    case .overdue: return "逾期"
    case .today: return "今天"
    case .upcoming:
        guard let due = task.dueDate else { return nil }
        let parts = due.split(separator: "-")
        guard parts.count == 3, let month = Int(parts[1]), let day = Int(parts[2]) else { return nil }
        return "\(month)/\(day)"
    case .other: return nil
    }
}

// MARK: - Links (read by parseWidgetLink in src/nativeBridge.js)

enum WidgetLink {
    static let tasks = URL(string: "questnote://tasks")!
    static let add = URL(string: "questnote://add")!

    static func task(_ id: String) -> URL {
        let encoded = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
        return URL(string: "questnote://task?id=\(encoded)") ?? tasks
    }
}

// MARK: - Timeline

struct TaskEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry(date: Date(), snapshot: WidgetSnapshot(schemaVersion: 1, today: localDateString(Date()), unfinishedCount: 3, tasks: [
            WidgetTask(id: "1", title: "買牛奶", plannedDate: nil, dueDate: nil, priority: nil),
            WidgetTask(id: "2", title: "繳電費", plannedDate: nil, dueDate: nil, priority: nil),
            WidgetTask(id: "3", title: "散步三十分鐘", plannedDate: nil, dueDate: nil, priority: nil),
        ]))
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : TaskEntry(date: Date(), snapshot: SnapshotStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> Void) {
        let now = Date()
        let snapshot = SnapshotStore.load()
        // A second entry at midnight moves tasks from "upcoming" to "today" / "overdue" without the app.
        let midnight = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now) ?? now)
        completion(Timeline(entries: [TaskEntry(date: now, snapshot: snapshot), TaskEntry(date: midnight, snapshot: snapshot)], policy: .atEnd))
    }
}

// MARK: - Views

private let navy = Color(red: 0.06, green: 0.12, blue: 0.22)
private let cream = Color(red: 0.96, green: 0.92, blue: 0.85)
private let gold = Color(red: 0.85, green: 0.65, blue: 0.36)
private let overdueRed = Color(red: 0.95, green: 0.55, blue: 0.48)

struct TaskRow: View {
    let task: WidgetTask
    let today: String

    var body: some View {
        HStack(spacing: 6) {
            Circle().stroke(cream.opacity(0.7), lineWidth: 1.5).frame(width: 10, height: 10)
            Text(task.title).font(.subheadline).foregroundStyle(cream).lineLimit(1)
            Spacer(minLength: 4)
            if let label = dueLabel(task, today: today) {
                Text(label).font(.caption2.weight(.semibold))
                    .foregroundStyle(group(of: task, today: today) == .overdue ? overdueRed : gold)
            }
        }
    }
}

struct HomeWidgetView: View {
    let entry: TaskEntry
    let limit: Int
    /// A small widget has one tap target, so rows and the add button link from medium up.
    let linksRows: Bool

    var body: some View {
        let today = localDateString(entry.date)
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text("待辦").font(.caption.weight(.semibold)).foregroundStyle(gold)
                Spacer()
                Text("\(entry.snapshot?.unfinishedCount ?? 0)").font(.title2.weight(.bold)).foregroundStyle(cream)
                if linksRows {
                    Link(destination: WidgetLink.add) {
                        Image(systemName: "plus.circle.fill").font(.title3).foregroundStyle(gold)
                    }
                    .accessibilityLabel("新增任務")
                }
            }
            if let snapshot = entry.snapshot {
                if snapshot.tasks.isEmpty {
                    Spacer()
                    Text("全部完成了").font(.subheadline).foregroundStyle(cream.opacity(0.8))
                    Spacer()
                } else {
                    ForEach(orderedTasks(snapshot.tasks, today: today).prefix(limit)) { task in
                        if linksRows {
                            Link(destination: WidgetLink.task(task.id)) { TaskRow(task: task, today: today) }
                        } else {
                            TaskRow(task: task, today: today)
                        }
                    }
                    Spacer(minLength: 0)
                }
            } else {
                Spacer()
                Text("打開 QuestNote 一次，就會顯示待辦").font(.caption).foregroundStyle(cream.opacity(0.8))
                Spacer()
            }
        }
        .containerBackground(navy, for: .widget)
        .widgetURL(WidgetLink.tasks)
    }
}

struct CircularWidgetView: View {
    let entry: TaskEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Text("\(entry.snapshot?.unfinishedCount ?? 0)").font(.title2.weight(.bold))
                Text("待辦").font(.caption2)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

struct RectangularWidgetView: View {
    let entry: TaskEntry

    var body: some View {
        let today = localDateString(entry.date)
        let first = entry.snapshot.flatMap { orderedTasks($0.tasks, today: today).first }
        VStack(alignment: .leading, spacing: 2) {
            Text("QuestNote 待辦 \(entry.snapshot?.unfinishedCount ?? 0) 項").font(.headline).widgetAccentable()
            Text(first?.title ?? "全部完成了").font(.caption).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .containerBackground(.clear, for: .widget)
    }
}

struct QuestNoteWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TaskEntry

    var body: some View {
        switch family {
        case .accessoryCircular: CircularWidgetView(entry: entry).widgetURL(WidgetLink.tasks)
        case .accessoryRectangular: RectangularWidgetView(entry: entry).widgetURL(WidgetLink.tasks)
        case .systemLarge: HomeWidgetView(entry: entry, limit: 8, linksRows: true)
        case .systemMedium: HomeWidgetView(entry: entry, limit: 4, linksRows: true)
        default: HomeWidgetView(entry: entry, limit: 2, linksRows: false)
        }
    }
}

@main
struct QuestNoteWidget: Widget {
    let kind = "QuestNoteTodo"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            QuestNoteWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("QuestNote 待辦")
        .description("顯示還沒完成的待辦，逾期和今天的排在最前面。點一項就打開那項任務。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
    }
}
