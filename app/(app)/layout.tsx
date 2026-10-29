import { AppShell } from "@/components/AppShell";

/** Dispatcher and business-owner pages: sidebar on laptops, bottom bar on phones. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
