import { prisma } from "@ew/db";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@ew/extraction";
import { HAPPY_PATH, STATUS_LABELS } from "@ew/workflow";
import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Address = { line1: string; line2: string | null; city: string; state: string; postalCode: string };

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const address = order.address as Address;
  const activeStep = HAPPY_PATH.indexOf(order.status);
  const reachedAt = new Map(order.events.map((e) => [e.toStatus, e.createdAt]));

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h2" component="h1">
            {SERVICE_TYPE_LABELS[order.serviceTypeId as ServiceType] ?? order.serviceTypeId}
          </Typography>
          <Typography color="text.secondary">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state}{" "}
            {address.postalCode}
          </Typography>
        </div>

        {order.status === "SUBMITTED" && (
          <Alert severity="success">
            We received your request. We&apos;ll send updates by{" "}
            {order.notifyPref === "SMS" ? "text" : "email"}.
          </Alert>
        )}
        {order.status === "CANCELLED" && <Alert severity="warning">This request was cancelled.</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {HAPPY_PATH.map((status) => {
              const at = reachedAt.get(status);
              return (
                <Step key={status} completed={activeStep >= 0 && HAPPY_PATH.indexOf(status) <= activeStep}>
                  <StepLabel optional={at && <Typography variant="caption">{at.toLocaleString()}</Typography>}>
                    {STATUS_LABELS[status]}
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </Paper>

        <Typography variant="body2" color="text.secondary">
          Reference: {order.id}
          {order.dueDate && ` · Due ${order.dueDate.toISOString().slice(0, 10)}`}
        </Typography>
      </Stack>
    </Container>
  );
}
