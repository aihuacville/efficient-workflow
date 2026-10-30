import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getCurrentUser, listAccounts } from "@/lib/session";

/** Staff pages: sidebar on laptops, bottom bar on phones, and the demo account switcher. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, accounts] = await Promise.all([getCurrentUser(), listAccounts()]);
  return (
    <AppShell user={user} accounts={accounts}>
      {/* New requests and offers appear without reloading. */}
      <AutoRefresh seconds={30} />
      {children}
    </AppShell>
  );
}
