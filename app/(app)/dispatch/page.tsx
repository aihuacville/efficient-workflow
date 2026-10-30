import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { Metadata } from "next";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { type Column, DataList } from "@/components/DataList";
import { OrderActions } from "@/components/OrderActions";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { SwitchAccountPrompt } from "@/components/SwitchAccountPrompt";
import { listBusinesses } from "@/lib/businesses";
import { formatDate, timeAgo } from "@/lib/format";
import { listOpenOrders } from "@/lib/orders/queries";
import { nextActions, STAFF_STATUS_LABELS } from "@/lib/orders/status";
import { getCurrentUser, toActor } from "@/lib/session";

export const metadata: Metadata = { title: "Dispatch" };

type Order = Awaited<ReturnType<typeof listOpenOrders>>[number];

const service: Column<Order> = { label: "Service", render: (o) => o.serviceType, primary: true };
const address: Column<Order> = { label: "Address", render: (o) => o.address };
const due: Column<Order> = {
  label: "Deadline",
  render: (o) => (o.dueDate ? formatDate(o.dueDate) : "None given"),
};

export default async function DispatchPage() {
  const user = await getCurrentUser();
  if (user?.role !== "DISPATCHER") {
    return (
      <>
        <PageHeader title="Dispatch" />
        <SwitchAccountPrompt who="dispatchers (Dana Lee in the demo)" />
      </>
    );
  }

  const [orders, businesses] = await Promise.all([listOpenOrders(), listBusinesses()]);
  const actor = toActor(user);
  const newRequests = orders.filter((o) => o.status === "NEW");
  const offered = orders.filter((o) => o.status === "OFFERED");
  const inProgress = orders.filter((o) => o.status !== "NEW" && o.status !== "OFFERED");

  // The buttons come from the workflow rules, so the page never offers a move the server refuses.
  const actions = (o: Order) => (
    <>
      <OrderActions
        orderId={o.id}
        serviceType={o.serviceType}
        actions={nextActions(o, actor)}
        businesses={businesses}
      />
      {/* For when a customer calls having lost their link. */}
      <CopyLinkButton token={o.trackingToken} />
    </>
  );

  return (
    <>
      <PageHeader
        title="Dispatch"
        subtitle={`${newRequests.length} new, ${offered.length} waiting for a business, ${inProgress.length} in progress`}
      />
      <Stack spacing={4}>
        <Section title="New requests" hint="Oldest first. Offer each one to a business.">
          <DataList
            rows={newRequests}
            getKey={(o) => o.id}
            empty="No new requests. They show up here when customers send them."
            columns={[
              service,
              address,
              due,
              { label: "Received", render: (o) => timeAgo(o.createdAt) },
              { label: "Notes", render: (o) => o.notes ?? "None" },
            ]}
            actions={actions}
          />
        </Section>

        <Section title="Waiting for a business" hint="Offered, not accepted yet.">
          <DataList
            rows={offered}
            getKey={(o) => o.id}
            empty="No offers waiting."
            columns={[
              service,
              address,
              due,
              { label: "Offered to", render: (o) => o.business?.name },
              { label: "Offered", render: (o) => timeAgo(o.updatedAt) },
            ]}
            actions={actions}
          />
        </Section>

        <Section title="In progress" hint="Accepted by a business, until the customer confirms.">
          <DataList
            rows={inProgress}
            getKey={(o) => o.id}
            empty="Nothing in progress."
            columns={[
              service,
              address,
              { label: "Business", render: (o) => o.business?.name },
              {
                label: "Status",
                render: (o) => (
                  <Chip
                    size="small"
                    label={STAFF_STATUS_LABELS[o.status]}
                    color={o.status === "PROBLEM_REPORTED" ? "warning" : "default"}
                  />
                ),
              },
            ]}
            actions={actions}
          />
        </Section>
      </Stack>
    </>
  );
}
