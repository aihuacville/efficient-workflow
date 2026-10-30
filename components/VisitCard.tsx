import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { LocalDateTime } from "@/components/LocalDateTime";
import { OrderActions } from "@/components/OrderActions";
import type { Action, OrderState } from "@/lib/orders/status";
import { STAFF_STATUS_LABELS } from "@/lib/orders/status";

type Visit = OrderState & {
  id: string;
  serviceType: string;
  address: string;
  notes: string | null;
  visitStart: Date | null;
  customer: { name: string; phone: string };
};

/**
 * One visit on the technician's phone: when, what, where (tap for directions), who (tap to
 * call), and one big button for the next step.
 */
export function VisitCard({
  visit,
  actions,
}: {
  visit: Visit;
  actions: { action: Action; label: string }[];
}) {
  const active = visit.status === "ON_THE_WAY" || visit.status === "IN_PROGRESS";
  return (
    <Paper sx={{ p: 2.5, borderColor: active ? "primary.main" : undefined }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>
            {visit.visitStart ? (
              <LocalDateTime iso={visit.visitStart.toISOString()} />
            ) : (
              "No time set"
            )}
          </Typography>
          <Chip
            size="small"
            label={STAFF_STATUS_LABELS[visit.status]}
            color={active ? "primary" : "default"}
          />
        </Stack>
        <Typography variant="h3" component="h3">
          {visit.serviceType}
        </Typography>
        {/* Opens the maps app on phones (or Google Maps in a browser) with directions. */}
        <Link
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.address)}`}
          target="_blank"
          rel="noopener"
          underline="always"
        >
          {visit.address}
        </Link>
        <Typography>
          {visit.customer.name} ·{" "}
          <Link href={`tel:${visit.customer.phone.replace(/[^\d+]/g, "")}`} underline="always">
            Call {visit.customer.phone}
          </Link>
        </Typography>
        {visit.notes && (
          <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            Note: {visit.notes}
          </Typography>
        )}
        <OrderActions
          orderId={visit.id}
          serviceType={visit.serviceType}
          actions={actions}
          size="large"
        />
      </Stack>
    </Paper>
  );
}
