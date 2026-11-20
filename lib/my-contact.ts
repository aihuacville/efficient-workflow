// The customer's name and phone, remembered in this browser after they send a request, so the
// next request from the same phone is quicker. Stored only on this device (nothing goes to the
// server), and only the name and phone: not the email or address, in case the device is shared.
// Browser storage can be blocked or cleared, so the form must work without it.
// If you change what's stored, update the privacy page (app/(public)/privacy/page.tsx).

const KEY = "my-contact";

export type RememberedContact = { name: string; phone: string };

/** The remembered name and phone, or null if there's none (or storage is blocked or corrupt). */
export function readContact(): RememberedContact | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (typeof saved !== "object" || saved === null) return null;
    const { name, phone } = saved as Record<string, unknown>;
    if (typeof name !== "string" || typeof phone !== "string" || !name || !phone) return null;
    return { name, phone };
  } catch {
    return null; // Storage blocked (private browsing) or not valid JSON.
  }
}

export function rememberContact(contact: RememberedContact) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ name: contact.name.trim(), phone: contact.phone.trim() }),
    );
  } catch {
    // Storage blocked or full: the customer types them next time.
  }
}

export function forgetContact() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: there's nothing stored to forget.
  }
}
