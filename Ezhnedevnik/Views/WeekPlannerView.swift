import SwiftUI

struct WeekPlannerView: View {
    @EnvironmentObject private var plannerStore: PlannerStore

    private let hours = Array(8...19)

    private var weekDays: [Date] {
        (0..<7).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: offset, to: plannerStore.selectedWeekStart)
        }
    }

    private var monthTitle: String {
        guard let firstDay = weekDays.first else { return "" }
        let ru = DateFormatters.monthYearRu.string(from: firstDay).capitalized
        let en = DateFormatters.monthYearEn.string(from: firstDay)
        let lastDay = weekDays.last ?? firstDay
        let ruLast = DateFormatters.monthYearRu.string(from: lastDay).capitalized
        let enLast = DateFormatters.monthYearEn.string(from: lastDay)

        if ru == ruLast {
            return "\(ru) / \(en)"
        }
        return "\(ru) — \(ruLast) / \(en) — \(enLast)"
    }

    private var weekNumber: Int {
        Calendar.current.weekNumber(for: plannerStore.selectedWeekStart)
    }

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    weekHeader

                    if geometry.size.width > geometry.size.height {
                        landscapeLayout
                    } else {
                        portraitLayout
                    }

                    MiniCalendarView(referenceDate: plannerStore.selectedWeekStart)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 16)
                }
            }
            .background(Color(.systemGroupedBackground))
        }
    }

    private var weekHeader: some View {
        HStack {
            Button {
                plannerStore.moveWeek(by: -1)
            } label: {
                Image(systemName: "chevron.left")
            }

            VStack(spacing: 2) {
                Text(monthTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Неделя \(weekNumber) week")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Button {
                plannerStore.moveWeek(by: 1)
            } label: {
                Image(systemName: "chevron.right")
            }

            Button("Сегодня") {
                plannerStore.jumpToToday()
            }
            .font(.caption)
            .buttonStyle(.bordered)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private var landscapeLayout: some View {
        VStack(spacing: 8) {
            HStack(alignment: .top, spacing: 6) {
                ForEach(Array(weekDays.prefix(3)), id: \.self) { date in
                    DayColumnView(date: date, hours: hours, compact: false)
                }
            }
            HStack(alignment: .top, spacing: 6) {
                ForEach(Array(weekDays.dropFirst(3).prefix(3)), id: \.self) { date in
                    DayColumnView(date: date, hours: hours, compact: false)
                }
                if let sunday = weekDays.last {
                    DayColumnView(date: sunday, hours: hours, compact: true)
                        .frame(maxWidth: 120)
                }
            }
        }
        .padding(.horizontal, 8)
    }

    private var portraitLayout: some View {
        VStack(spacing: 8) {
            ForEach(weekDays, id: \.self) { date in
                let isSunday = Calendar.current.component(.weekday, from: date) == 1
                DayColumnView(date: date, hours: hours, compact: isSunday)
            }
        }
        .padding(.horizontal, 8)
    }
}
