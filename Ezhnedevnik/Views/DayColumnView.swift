import SwiftUI

struct DayColumnView: View {
    let date: Date
    let hours: [Int]
    let compact: Bool

    @EnvironmentObject private var plannerStore: PlannerStore
    @State private var editingEntry: PlannerEntry?

    private var dayInfo: DayInfo {
        DayInfoBuilder.make(for: date)
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            dayHeader

            if !compact {
                hourGrid
            } else {
                compactNotes
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isToday ? Color.accentColor : Color(.separator), lineWidth: isToday ? 1.5 : 0.5)
                )
        )
        .sheet(item: $editingEntry) { entry in
            EntryEditorSheet(entry: entry) { updated in
                plannerStore.save(entry: updated)
            }
        }
    }

    private var dayHeader: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .top) {
                Text("\(dayInfo.dayNumber)")
                    .font(.system(size: compact ? 22 : 28, weight: .bold, design: .rounded))
                Spacer()
                Text("\(dayInfo.dayOfYear)/\(dayInfo.daysLeftInYear)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text("\(dayInfo.weekdayRu) / \(dayInfo.weekdayEn)")
                .font(compact ? .caption2 : .caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            HStack(spacing: 8) {
                Label(dayInfo.sunrise, systemImage: "sunrise.fill")
                Label(dayInfo.sunset, systemImage: "sunset.fill")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .labelStyle(.titleAndIcon)
        }
    }

    private var hourGrid: some View {
        VStack(spacing: 0) {
            ForEach(hours, id: \.self) { hour in
                HourRowView(
                    hour: hour,
                    entry: plannerStore.entry(for: dayInfo.dateKey, hour: hour)
                ) {
                    editingEntry = plannerStore.entry(for: dayInfo.dateKey, hour: hour)
                }
            }
        }
    }

    private var compactNotes: some View {
        VStack(spacing: 4) {
            ForEach(hours.prefix(4), id: \.self) { hour in
                HourRowView(
                    hour: hour,
                    entry: plannerStore.entry(for: dayInfo.dateKey, hour: hour),
                    compact: true
                ) {
                    editingEntry = plannerStore.entry(for: dayInfo.dateKey, hour: hour)
                }
            }
        }
    }
}

struct HourRowView: View {
    let hour: Int
    let entry: PlannerEntry
    var compact: Bool = false
    let onTap: () -> Void

    @EnvironmentObject private var contactsService: ContactsService

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .center, spacing: 6) {
                Text("\(hour)")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .frame(width: 18, alignment: .trailing)

                VStack(alignment: .leading, spacing: 1) {
                    if let name = contactsService.displayName(for: entry.contactIdentifier) {
                        Text(name)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                    }
                    if !entry.text.isEmpty {
                        Text(entry.text)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(compact ? 1 : 2)
                    } else if entry.contactIdentifier == nil {
                        Rectangle()
                            .fill(Color(.separator))
                            .frame(height: 0.5)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: compact ? 18 : 22)
        }
        .buttonStyle(.plain)
    }
}
