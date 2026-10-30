"use client";

import { useEffect, useState } from "react";

/**
 * A date and time in the viewer's own time zone. The server runs in UTC, so this formats in
 * the browser after the page loads; until then it's empty, which avoids a hydration mismatch.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(
      new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
