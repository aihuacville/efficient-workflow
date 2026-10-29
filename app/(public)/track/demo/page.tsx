import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { RatingDemo } from "./RatingDemo";

export const metadata: Metadata = { title: "Track your request" };

// Sample tracking page to try the rating. The real one, /track/[id], arrives on Wednesday.
export default function TrackDemoPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h1" gutterBottom>
        Your request
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Sample data. The real tracking page arrives on Wednesday.
      </Alert>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography fontWeight={600}>Fire safety inspection</Typography>
        <Typography color="text.secondary">12 Main St, Springfield, IL</Typography>
        <Typography color="text.secondary">ABC Fire Safety · Work done, confirmed by you</Typography>
      </Paper>
      <RatingDemo />
    </Container>
  );
}
