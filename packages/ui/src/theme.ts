"use client";

import { createTheme } from "@mui/material/styles";

// Placeholder tokens until the Figma export lands; keep component code token-driven.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1f5fbf" },
        secondary: { main: "#0f8a6c" },
        background: { default: "#f7f8fa" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#7aa7f0" },
        secondary: { main: "#4fc7a5" },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: "2.25rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
});
