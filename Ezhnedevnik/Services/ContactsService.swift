import Contacts
import SwiftUI

@MainActor
final class ContactsService: ObservableObject {
    @Published private(set) var authorizationStatus: CNAuthorizationStatus = .notDetermined
    @Published private(set) var contacts: [CNContact] = []

    private let store = CNContactStore()

    init() {
        refreshAuthorizationStatus()
    }

    func refreshAuthorizationStatus() {
        authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
    }

    func requestAccess() async -> Bool {
        do {
            let granted = try await store.requestAccess(for: .contacts)
            refreshAuthorizationStatus()
            if granted {
                await loadContacts()
            }
            return granted
        } catch {
            refreshAuthorizationStatus()
            return false
        }
    }

    func loadContacts() async {
        guard authorizationStatus == .authorized else { return }

        let keys: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactIdentifierKey as CNKeyDescriptor
        ]

        let request = CNContactFetchRequest(keysToFetch: keys)
        request.sortOrder = .givenName

        var loaded: [CNContact] = []
        do {
            try store.enumerateContacts(with: request) { contact, _ in
                loaded.append(contact)
            }
            contacts = loaded
        } catch {
            contacts = []
        }
    }

    func displayName(for identifier: String?) -> String? {
        guard let identifier else { return nil }
        return contacts.first(where: { $0.identifier == identifier })?.fullName
    }

    func phoneNumber(for identifier: String?) -> String? {
        guard
            let identifier,
            let contact = contacts.first(where: { $0.identifier == identifier }),
            let phone = contact.phoneNumbers.first?.value.stringValue
        else { return nil }
        return phone
    }
}

extension CNContact {
    var fullName: String {
        let name = [givenName, familyName]
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return name.isEmpty ? "Без имени" : name
    }
}
