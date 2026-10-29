import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";

/** Customer-facing pages: a plain top bar, no app navigation. Mostly used on phones. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar>
          <Typography
            component={Link}
            href="/"
            fontWeight={700}
            sx={{ color: "inherit", textDecoration: "none" }}
          >
            Efficient Workflow
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, pb: "env(safe-area-inset-bottom)" }}>
        {children}
      </Box>
    </Box>
  );
}
