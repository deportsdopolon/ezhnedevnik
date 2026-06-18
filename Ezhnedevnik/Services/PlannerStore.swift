import Foundation

@MainActor
final class PlannerStore: ObservableObject {
    @Published private(set) var entries: [String: PlannerEntry] = [:]
    @Published var selectedWeekStart: Date

    private let storageKey = "planner.entries"

    init() {
        selectedWeekStart = Calendar.current.startOfWeek(for: Date())
        load()
    }

    func entry(for dateKey: String, hour: Int) -> PlannerEntry {
        let key = compositeKey(dateKey: dateKey, hour: hour)
        if let existing = entries[key] {
            return existing
        }
        return PlannerEntry(dateKey: dateKey, hour: hour)
    }

    func save(entry: PlannerEntry) {
        let key = compositeKey(dateKey: entry.dateKey, hour: entry.hour)
        if entry.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           entry.contactIdentifier == nil {
            entries.removeValue(forKey: key)
        } else {
            entries[key] = entry
        }
        persist()
    }

    func moveWeek(by weeks: Int) {
        guard let newDate = Calendar.current.date(
            byAdding: .weekOfYear,
            value: weeks,
            to: selectedWeekStart
        ) else { return }
        selectedWeekStart = Calendar.current.startOfWeek(for: newDate)
    }

    func jumpToToday() {
        selectedWeekStart = Calendar.current.startOfWeek(for: Date())
    }

    private func compositeKey(dateKey: String, hour: Int) -> String {
        "\(dateKey)-\(hour)"
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? JSONDecoder().decode([String: PlannerEntry].self, from: data)
        else { return }
        entries = decoded
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}

extension Calendar {
    func startOfWeek(for date: Date) -> Date {
        let components = dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return self.date(from: components) ?? date
    }

    func weekNumber(for date: Date) -> Int {
        component(.weekOfYear, from: date)
    }

    func daysInMonth(for date: Date) -> [Date] {
        guard
            let interval = dateInterval(of: .month, for: date),
            let dayCount = range(of: .day, in: .month, for: date)?.count
        else { return [] }

        return (0..<dayCount).compactMap { offset in
            date(byAdding: .day, value: offset, to: interval.start)
        }
    }
}
