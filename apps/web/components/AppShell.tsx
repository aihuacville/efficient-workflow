"use client";

import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_HEIGHT, SIDEBAR_WIDTH } from "@/theme/theme";
import { NAV_ITEMS } from "./nav";

/**
 * Responsive app frame. Laptop (md and up): permanent sidebar on the left.
 * Phone (below md): top bar with the page name, and a bottom tab bar within thumb reach.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Toolbar>
          <Brand />
        </Toolbar>
        <List component="nav" aria-label="Main" sx={{ px: 1 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={active?.href === href}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" sx={{ display: { md: "none" }, borderBottom: 1, borderColor: "divider" }}>
          <Toolbar>
            <Brand />
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, md: 4 },
            py: { xs: 2, md: 4 },
            // Keep content clear of the bottom bar and the iPhone home indicator.
            pb: {
              xs: `calc(${BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom))`,
              md: 4,
            },
          }}
        >
          {children}
        </Box>
      </Box>

      <Paper
        component="nav"
        aria-label="Main"
        square
        sx={{
          display: { md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderLeft: 0,
          borderRight: 0,
          borderBottom: 0,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation showLabels value={active?.href ?? false} sx={{ height: BOTTOM_NAV_HEIGHT }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <BottomNavigationAction key={href} component={Link} href={href} value={href} label={label} icon={<Icon />} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

function Brand() {
  return (
    <Typography component={Link} href="/" fontWeight={700} sx={{ color: "inherit", textDecoration: "none" }}>
      Efficient Workflow
    </Typography>
  );
}
