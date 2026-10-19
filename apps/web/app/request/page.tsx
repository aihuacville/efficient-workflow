import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { RequestFlow } from "./RequestFlow";

export const metadata: Metadata = { title: "New request · Efficient Workflow" };

export default function RequestPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h2" component="h1" gutterBottom>
        New service request
      </Typography>
      <RequestFlow />
    </Container>
  );
}
