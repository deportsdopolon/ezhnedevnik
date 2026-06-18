import Contacts
import SwiftUI

struct EntryEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var contactsService: ContactsService

    @State private var entry: PlannerEntry
    @State private var showContactPicker = false

    let onSave: (PlannerEntry) -> Void

    init(entry: PlannerEntry, onSave: @escaping (PlannerEntry) -> Void) {
        _entry = State(initialValue: entry)
        self.onSave = onSave
    }

    private var hourLabel: String {
        String(format: "%02d:00", entry.hour)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Время") {
                    Text(hourLabel)
                }

                Section("Заметка") {
                    TextField("Что запланировано?", text: $entry.text, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Контакт") {
                    if contactsService.authorizationStatus != .authorized {
                        Button("Разрешить доступ к контактам") {
                            Task { await contactsService.requestAccess() }
                        }
                    } else {
                        if let name = contactsService.displayName(for: entry.contactIdentifier) {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(name)
                                    if let phone = contactsService.phoneNumber(for: entry.contactIdentifier) {
                                        Text(phone)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                Button("Убрать", role: .destructive) {
                                    entry.contactIdentifier = nil
                                }
                            }
                        }

                        Button(entry.contactIdentifier == nil ? "Выбрать контакт" : "Сменить контакт") {
                            showContactPicker = true
                        }
                    }
                }
            }
            .navigationTitle("Запись")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        onSave(entry)
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showContactPicker) {
                ContactPickerView { contact in
                    entry.contactIdentifier = contact.identifier
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

struct ContactPickerView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var contactsService: ContactsService
    @State private var searchText = ""

    let onSelect: (CNContactWrapper) -> Void

    private var filteredContacts: [CNContact] {
        guard !searchText.isEmpty else { return contactsService.contacts }
        return contactsService.contacts.filter {
            $0.fullName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            List(filteredContacts, id: \.identifier) { contact in
                Button {
                    onSelect(CNContactWrapper(contact: contact))
                    dismiss()
                } label: {
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
            .searchable(text: $searchText, prompt: "Поиск контакта")
            .navigationTitle("Контакты")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                }
            }
        }
    }
}

struct CNContactWrapper: Identifiable {
    let contact: CNContact
    var id: String { contact.identifier }
    var identifier: String { contact.identifier }
}
