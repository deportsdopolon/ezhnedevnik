import CoreLocation
import Foundation

struct SunTimesService {
    static func times(for date: Date, latitude: Double = 55.7558, longitude: Double = 37.6173) -> (sunrise: String, sunset: String) {
        let times = calculateSunriseSunset(date: date, latitude: latitude, longitude: longitude)
        return (
            sunrise: formatTime(times.sunrise),
            sunset: formatTime(times.sunset)
        )
    }

    private static func formatTime(_ date: Date?) -> String {
        guard let date else { return "—" }
        let formatter = DateFormatter()
        formatter.dateFormat = "H:mm"
        return formatter.string(from: date)
    }

    private static func calculateSunriseSunset(
        date: Date,
        latitude: Double,
        longitude: Double
    ) -> (sunrise: Date?, sunset: Date?) {
        let calendar = Calendar.current
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: date) ?? 1
        let latRad = latitude * .pi / 180

        let solarDeclination = 23.45 * sin((360.0 / 365.0 * (Double(dayOfYear) - 81)) * .pi / 180)
        let declRad = solarDeclination * .pi / 180

        let hourAngle = acos(-tan(latRad) * tan(declRad))
        let solarNoon = 12.0 - longitude / 15.0
        let sunriseHour = solarNoon - hourAngle * 12 / .pi
        let sunsetHour = solarNoon + hourAngle * 12 / .pi

        let startOfDay = calendar.startOfDay(for: date)
        let sunrise = calendar.date(byAdding: .minute, value: Int(sunriseHour * 60), to: startOfDay)
        let sunset = calendar.date(byAdding: .minute, value: Int(sunsetHour * 60), to: startOfDay)
        return (sunrise, sunset)
    }
}

struct DayInfoBuilder {
    static func make(for date: Date) -> DayInfo {
        let calendar = Calendar.current
        let dayNumber = calendar.component(.day, from: date)
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: date) ?? 1
        let yearLength = calendar.range(of: .day, in: .year, for: date)?.count ?? 365
        let daysLeft = max(yearLength - dayOfYear, 0)

        let weekdayIndex = calendar.component(.weekday, from: date)
        let sun = SunTimesService.times(for: date)

        return DayInfo(
            date: date,
            dayNumber: dayNumber,
            weekdayRu: russianWeekday(for: weekdayIndex),
            weekdayEn: englishWeekday(for: weekdayIndex),
            dayOfYear: dayOfYear,
            daysLeftInYear: daysLeft,
            sunrise: sun.sunrise,
            sunset: sun.sunset
        )
    }

    private static func russianWeekday(for index: Int) -> String {
        ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"][index - 1]
    }

    private static func englishWeekday(for index: Int) -> String {
        ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index - 1]
    }
}
