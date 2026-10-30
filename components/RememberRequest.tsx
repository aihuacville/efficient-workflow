"use client";

import { useEffect } from "react";
import { rememberRequest } from "@/lib/my-requests";

/** Remembers this tracking page in "Your requests", for opening links from another device. */
export function RememberRequest(props: { token: string; serviceType: string; sentAt: string }) {
  const { token, serviceType, sentAt } = props;
  useEffect(() => rememberRequest({ token, serviceType, sentAt }), [token, serviceType, sentAt]);
  return null;
}
