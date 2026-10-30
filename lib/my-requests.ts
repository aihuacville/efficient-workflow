// "Your requests": tracking links remembered in this browser, so a customer who closed the tab
// can get back to their request. Stored only on this device (nothing goes to the server), and
// only the service and date, not the address, in case the device is shared. Browser storage can
// be blocked or cleared, so this is a backup: the request form still says "Save this link".

const KEY = "my-requests";
const MAX = 10;

export type RememberedRequest = { token: string; serviceType: string; sentAt: string };

export function readMyRequests(): RememberedRequest[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? (list as RememberedRequest[]) : [];
  } catch {
    return []; // Storage blocked (private browsing) or not valid JSON.
  }
}

/** Adds a request, or moves it to the top if it's already remembered. */
export function rememberRequest(request: RememberedRequest) {
  try {
    const others = readMyRequests().filter((r) => r.token !== request.token);
    localStorage.setItem(KEY, JSON.stringify([request, ...others].slice(0, MAX)));
  } catch {
    // Storage blocked or full: the customer still has the link on screen.
  }
}
