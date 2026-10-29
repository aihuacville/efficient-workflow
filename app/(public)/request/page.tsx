import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "New request" };

export default function RequestPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h1" gutterBottom>
        New service request
      </Typography>
      <RequestForm />
    </Container>
  );
}
