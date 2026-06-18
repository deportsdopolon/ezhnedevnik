import SwiftUI

struct MiniCalendarView: View {
    let referenceDate: Date

    private var monthDays: [Date] {
        Calendar.current.daysInMonth(for: referenceDate)
    }

    private var weekdaySymbols: [String] {
        ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(monthTitle)
                .font(.caption.weight(.semibold))

            HStack(spacing: 0) {
                ForEach(weekdaySymbols, id: \.self) { symbol in
                    Text(symbol)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            let leadingPadding = leadingEmptyCells
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 4) {
                ForEach(0..<leadingPadding, id: \.self) { _ in
                    Color.clear.frame(height: 20)
                }
                ForEach(monthDays, id: \.self) { day in
                    Text("\(Calendar.current.component(.day, from: day))")
                        .font(.caption2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 2)
                        .background(
                            Calendar.current.isDateInToday(day)
                                ? Circle().fill(Color.accentColor.opacity(0.2))
                                : nil
                        )
                }
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemBackground))
        )
    }

    private var monthTitle: String {
        let ru = DateFormatters.monthYearRu.string(from: referenceDate).capitalized
        let en = DateFormatters.monthYearEn.string(from: referenceDate)
        return "\(ru) / \(en)"
    }

    private var leadingEmptyCells: Int {
        guard let first = monthDays.first else { return 0 }
        let weekday = Calendar.current.component(.weekday, from: first)
        return (weekday + 5) % 7
    }
}
