"use client";

import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/session";

const ROLE_LABELS = { DISPATCHER: "Dispatcher", OWNER: "Owner", TECHNICIAN: "Technician" } as const;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

/** Demo only: switch between the demo accounts, with no password. */
export function AccountSwitcher({
  user,
  accounts,
}: {
  user: SessionUser | null;
  accounts: SessionUser[];
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [error, setError] = useState("");

  async function switchTo(id: string) {
    setAnchor(null);
    setError("");
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const data = (await res.json().catch(() => ({}))) as { home?: string; error?: string };
    if (!res.ok || !data.home) {
      setError(data.error ?? "Couldn't switch accounts.");
      return;
    }
    router.push(data.home);
    // Pages read the account on the server, so ask them to render again for the new person.
    router.refresh();
  }

  // Group the menu: platform staff first, then each business's people under its name.
  const groups = new Map<string, SessionUser[]>();
  for (const account of accounts) {
    const group = account.business?.name ?? "Platform";
    groups.set(group, [...(groups.get(group) ?? []), account]);
  }

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        color="inherit"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        startIcon={
          <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: "primary.main" }}>
            {user ? initials(user.name) : "?"}
          </Avatar>
        }
        sx={{ textTransform: "none", justifyContent: "flex-start", minWidth: 0 }}
      >
        <ListItemText
          primary={error || (user ? user.name : "Choose an account")}
          secondary={user && !error ? ROLE_LABELS[user.role] : "Demo account switcher"}
          slotProps={{
            primary: { noWrap: true, color: error ? "error" : undefined },
            secondary: { noWrap: true },
          }}
          sx={{ m: 0, textAlign: "left" }}
        />
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {[...groups].flatMap(([group, people]) => [
          <ListSubheader key={group}>{group}</ListSubheader>,
          ...people.map((person) => (
            <MenuItem
              key={person.id}
              selected={person.id === user?.id}
              onClick={() => switchTo(person.id)}
            >
              <ListItemText primary={person.name} secondary={ROLE_LABELS[person.role]} />
            </MenuItem>
          )),
        ])}
        <Divider />
        <MenuItem component={Link} href="/request" onClick={() => setAnchor(null)}>
          <ListItemText primary="Customer" secondary="Send a request (no sign-in)" />
        </MenuItem>
      </Menu>
    </>
  );
}
