import SwiftUI

@main
struct EzhnedevnikApp: App {
    @StateObject private var plannerStore = PlannerStore()
    @StateObject private var contactsService = ContactsService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(plannerStore)
                .environmentObject(contactsService)
        }
    }
}
