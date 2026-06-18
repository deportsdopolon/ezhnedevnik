import Foundation

struct PlannerEntry: Identifiable, Codable, Hashable {
    let id: UUID
    let dateKey: String
    let hour: Int
    var text: String
    var contactIdentifier: String?

    init(
        id: UUID = UUID(),
        dateKey: String,
        hour: Int,
        text: String = "",
        contactIdentifier: String? = nil
    ) {
        self.id = id
        self.dateKey = dateKey
        self.hour = hour
        self.text = text
        self.contactIdentifier = contactIdentifier
    }
}

struct DayInfo {
    let date: Date
    let dayNumber: Int
    let weekdayRu: String
    let weekdayEn: String
    let dayOfYear: Int
    let daysLeftInYear: Int
    let sunrise: String
    let sunset: String

    var dateKey: String {
        DateFormatters.dateKey.string(from: date)
    }
}

enum DateFormatters {
    static let dateKey: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let monthYearRu: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "LLLL"
        return formatter
    }()

    static let monthYearEn: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMMM"
        return formatter
    }()
}
