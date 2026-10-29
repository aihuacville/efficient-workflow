import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getTrackedOrder } from "@/lib/orders/queries";
import { STATUS_LABELS } from "@/lib/orders/status";
import { RatingDemo } from "./RatingDemo";

export const metadata: Metadata = { title: "Track your request" };

// Read the database on every visit, not once at build time.
export const dynamic = "force-dynamic";

// Sample tracking page for the demo job from `pnpm db:seed`. The real one, /track/<link>, comes next.
export default async function TrackDemoPage() {
  const order = await getTrackedOrder("demo");

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h1" gutterBottom>
        Your request
      </Typography>
      {!order?.business ? (
        <Alert severity="warning">
          There's no demo job in the database yet. Run <code>pnpm db:seed</code>, then reload.
        </Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Demo job. The real tracking page arrives soon.
          </Alert>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography fontWeight={600}>{order.serviceType}</Typography>
            <Typography color="text.secondary">{order.address}</Typography>
            <Typography color="text.secondary">
              {order.business.name} · {STATUS_LABELS[order.status]}
            </Typography>
          </Paper>
          <RatingDemo trackingToken={order.trackingToken} business={order.business} />
        </>
      )}
    </Container>
  );
}
