import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var contactsService: ContactsService

    var body: some View {
        NavigationStack {
            WeekPlannerView()
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink {
                            ContactsSettingsView()
                        } label: {
                            Image(systemName: "person.crop.circle")
                        }
                    }
                }
                .task {
                    contactsService.refreshAuthorizationStatus()
                    if contactsService.authorizationStatus == .authorized {
                        await contactsService.loadContacts()
                    }
                }
        }
    }
}

struct ContactsSettingsView: View {
    @EnvironmentObject private var contactsService: ContactsService

    var body: some View {
        List {
            Section("Доступ к контактам") {
                switch contactsService.authorizationStatus {
                case .authorized:
                    Label("Доступ разрешён", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                case .denied, .restricted:
                    Text("Разрешите доступ в Настройки → Ежедневник → Контакты")
                        .foregroundStyle(.secondary)
                default:
                    Button("Разрешить доступ к контактам") {
                        Task { await contactsService.requestAccess() }
                    }
                }
            }

            if contactsService.authorizationStatus == .authorized {
                Section("Контакты (\(contactsService.contacts.count))") {
                    ForEach(contactsService.contacts, id: \.identifier) { contact in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(contact.fullName)
                            if let phone = contact.phoneNumbers.first?.value.stringValue {
                                Text(phone)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Контакты")
    }
}
