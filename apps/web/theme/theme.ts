"use client";

import { createTheme } from "@mui/material/styles";

/** Width of the laptop sidebar; the app shell and page layouts share it. */
export const SIDEBAR_WIDTH = 240;

/** Height of the phone bottom navigation bar. */
export const BOTTOM_NAV_HEIGHT = 64;

// Placeholder brand tokens; swap once there's a design. Keep components token-driven.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1f5fbf" },
        secondary: { main: "#0f8a6c" },
        background: { default: "#f6f7f9", paper: "#ffffff" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#7aa7f0" },
        secondary: { main: "#4fc7a5" },
        background: { default: "#0f1115", paper: "#171a21" },
      },
    },
  },
  // xs: phone, sm: large phone / small tablet, md: tablet, lg: laptop, xl: desktop
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700, "@media (min-width:900px)": { fontSize: "2.25rem" } },
    h2: { fontSize: "1.375rem", fontWeight: 600, "@media (min-width:900px)": { fontSize: "1.5rem" } },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (t) => ({
        a: { color: t.vars?.palette.primary.main ?? t.palette.primary.main },
      }),
    },
    // Touch targets: at least 44px tall on every device.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44 }, sizeSmall: { minHeight: 36 } },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiPaper: { defaultProps: { variant: "outlined" } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
  },
});
