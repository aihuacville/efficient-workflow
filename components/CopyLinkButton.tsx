"use client";

import Button from "@mui/material/Button";
import { useState } from "react";

/**
 * Copies a customer's tracking link, for staff to send when a customer has lost theirs. Only
 * after confirming who's asking: the link shows the job's address and progress.
 */
export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/track/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard needs https (or localhost): show the link to copy by hand instead.
      window.prompt("Copy the customer's tracking link:", url);
    }
  }

  return (
    <Button size="small" variant="text" onClick={copy} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
