// Small formatting helpers for server-rendered pages.

/** A date-only value (like a notice deadline), saved as noon UTC. Formats in UTC so it shows as entered. */
export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "5 minutes ago", "yesterday", "3 days ago". Doesn't depend on time zones. */
export function timeAgo(date: Date, now = new Date()) {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}
