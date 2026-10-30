import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/LocalDateTime";
import { OrderRating } from "@/components/OrderRating";
import type { OrderStatus } from "@/lib/generated/prisma/enums";
import { getTrackedOrder } from "@/lib/orders/queries";
import { trackingTimeline } from "@/lib/orders/tracking";

// The link is private, so keep it out of search engines.
export const metadata: Metadata = { title: "Track your request", robots: { index: false } };

/** What's happening now, shown under the current step. */
function currentHint(status: OrderStatus, businessName: string) {
  switch (status) {
    case "NEW":
    case "OFFERED":
      return "We're finding a qualified business for you, usually within a day.";
    case "ACCEPTED":
      return `${businessName} will schedule a visit soon.`;
    case "SCHEDULED":
      return "The technician will be on the way on the day of the visit.";
    case "ON_THE_WAY":
      return "The technician is on the way.";
    case "IN_PROGRESS":
      return "The work is in progress.";
    case "DONE":
      return "Check the work. Soon you'll be able to confirm it here.";
    default:
      return "";
  }
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const order = await getTrackedOrder((await params).token);
  if (!order) notFound();

  const timeline = trackingTimeline(order);
  // The highlighted step. When every step is done, pointing past the end marks them all complete.
  const current = timeline?.findIndex((s) => s.state === "current") ?? -1;
  const activeStep = current === -1 ? (timeline?.length ?? 0) : current;
  const businessName = order.business?.name ?? "The business";
  const technician = order.technician?.name.split(" ")[0];

  /** Extra detail under a finished step, once it's known. */
  const detail = (label: string) => {
    if (label === "Business assigned") return order.business?.name;
    if (label === "Visit scheduled" && order.visitStart) {
      return (
        <>
          Visit: <LocalDateTime iso={order.visitStart.toISOString()} />
          {technician && ` with ${technician}`}
        </>
      );
    }
    return null;
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h1">Your request</Typography>

        <Paper sx={{ p: 3 }}>
          <Typography fontWeight={600}>{order.serviceType}</Typography>
          <Typography color="text.secondary">{order.address}</Typography>
          {order.dueDate && (
            <Typography color="text.secondary">
              Deadline: {/* Saved as noon UTC, so format in UTC to show the date as entered. */}
              {order.dueDate.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
            </Typography>
          )}
        </Paper>

        {order.status === "CANCELLED" && (
          <Alert severity="error">This request was cancelled.</Alert>
        )}
        {order.status === "PROBLEM_REPORTED" && (
          <Alert severity="warning">
            You reported a problem. {businessName} will contact you to arrange a return visit.
          </Alert>
        )}

        {timeline && (
          <Paper sx={{ p: 3 }}>
            <Stepper orientation="vertical" activeStep={activeStep}>
              {timeline.map((step) => {
                const extra = step.state === "done" ? detail(step.label) : null;
                return (
                  <Step
                    key={step.label}
                    aria-current={step.state === "current" ? "step" : undefined}
                  >
                    <StepLabel
                      optional={
                        step.state === "done" ? (
                          <Typography variant="body2" color="text.secondary" component="div">
                            {step.at && <LocalDateTime iso={step.at.toISOString()} />}
                            {extra && <div>{extra}</div>}
                          </Typography>
                        ) : undefined
                      }
                    >
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography color="text.secondary">
                        {currentHint(order.status, businessName)}
                      </Typography>
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
          </Paper>
        )}

        {order.status === "CONFIRMED" && order.business && (
          <OrderRating
            trackingToken={order.trackingToken}
            businessName={order.business.name}
            rating={order.rating}
          />
        )}

        {order.status !== "CANCELLED" && (
          <Typography variant="body2" color="text.secondary">
            Bookmark this page to check progress. Reload it to see the latest.
          </Typography>
        )}
      </Stack>
    </Container>
  );
}
