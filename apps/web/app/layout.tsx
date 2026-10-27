import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Metadata, Viewport } from "next";
import { theme } from "@/theme/theme";

export const metadata: Metadata = {
  title: { default: "Efficient Workflow", template: "%s · Efficient Workflow" },
  description: "Snap a notice. Confirm the form. Get it serviced.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets content extend under the iPhone home indicator; layouts pad with safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
