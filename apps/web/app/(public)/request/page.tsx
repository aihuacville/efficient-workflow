import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New request" };

export default function RequestPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h1" gutterBottom>
        New service request
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">The request form arrives on Wednesday.</Typography>
      </Paper>
    </Container>
  );
}
