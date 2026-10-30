import Chip from "@mui/material/Chip";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { type Column, DataList } from "@/components/DataList";
import { LocalDateTime } from "@/components/LocalDateTime";
import { OrderActions } from "@/components/OrderActions";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { SwitchAccountPrompt } from "@/components/SwitchAccountPrompt";
import { VisitCard } from "@/components/VisitCard";
import { listVisitors } from "@/lib/businesses";
import { formatDate, timeAgo } from "@/lib/format";
import { listBusinessOrders, listTechnicianOrders } from "@/lib/orders/queries";
import { type Actor, nextActions, STAFF_STATUS_LABELS } from "@/lib/orders/status";
import { getCurrentUser, type SessionUser, toActor } from "@/lib/session";

export const metadata: Metadata = { title: "My jobs" };

type Job = Awaited<ReturnType<typeof listBusinessOrders>>[number];
type Visit = Awaited<ReturnType<typeof listTechnicianOrders>>[number];

// Columns shared by the sections below. `Pick` lets them work for both kinds of job list.
const service: Column<Pick<Job, "serviceType">> = {
  label: "Service",
  render: (o) => o.serviceType,
  primary: true,
};
const address: Column<Pick<Job, "address">> = { label: "Address", render: (o) => o.address };
const due: Column<Pick<Job, "dueDate">> = {
  label: "Deadline",
  render: (o) => (o.dueDate ? formatDate(o.dueDate) : "None given"),
};
const visit: Column<Pick<Job, "visitStart">> = {
  label: "Visit",
  render: (o) => (o.visitStart ? <LocalDateTime iso={o.visitStart.toISOString()} /> : "Not set"),
};
const customer: Column<Pick<Job, "customer">> = {
  label: "Customer",
  render: (o) => (o.customer ? `${o.customer.name}, ${o.customer.phone}` : "Shown once you accept"),
};
const status: Column<Pick<Job, "status">> = {
  label: "Status",
  render: (o) => (
    <Chip
      size="small"
      label={STAFF_STATUS_LABELS[o.status]}
      color={o.status === "PROBLEM_REPORTED" ? "warning" : "default"}
    />
  ),
};

export default async function JobsPage() {
  const user = await getCurrentUser();
  if (user?.role === "OWNER" && user.businessId) {
    return <OwnerJobs user={user} businessId={user.businessId} />;
  }
  if (user?.role === "TECHNICIAN") return <TechnicianJobs user={user} />;
  return (
    <>
      <PageHeader title="My jobs" />
      <SwitchAccountPrompt who="business owners and technicians (for example Omar Hassan or Alex Kim)" />
    </>
  );
}

/** The owner's view: every job for their business, grouped by what needs doing next. */
async function OwnerJobs({ user, businessId }: { user: SessionUser; businessId: string }) {
  const [jobs, people] = await Promise.all([
    listBusinessOrders(businessId),
    listVisitors(businessId),
  ]);
  const actor = toActor(user);
  const actions = (o: Job) => (
    <OrderActions
      orderId={o.id}
      serviceType={o.serviceType}
      actions={nextActions(o, actor)}
      people={people}
    />
  );
  const byStatus = (...statuses: Job["status"][]) =>
    jobs.filter((o) => statuses.includes(o.status));
  const offers = byStatus("OFFERED");
  const toSchedule = byStatus("ACCEPTED");
  const scheduled = byStatus("SCHEDULED", "ON_THE_WAY", "IN_PROGRESS");
  const waiting = byStatus("DONE", "PROBLEM_REPORTED");
  const finished = byStatus("CONFIRMED").reverse();

  return (
    <>
      <PageHeader
        title="My jobs"
        subtitle={`${user.business?.name}: ${offers.length} offers, ${toSchedule.length} to schedule, ${scheduled.length} scheduled`}
      />
      <Stack spacing={4}>
        <Section title="Offers" hint="Jobs the dispatcher offered you. Accept or decline.">
          <DataList
            rows={offers}
            getKey={(o) => o.id}
            empty="No offers right now."
            columns={[
              service,
              address,
              due,
              { label: "Offered", render: (o) => timeAgo(o.updatedAt) },
              { label: "Notes", render: (o) => o.notes ?? "None" },
            ]}
            actions={actions}
          />
        </Section>

        <Section title="To schedule" hint="Accepted. Choose who goes, and when.">
          <DataList
            rows={toSchedule}
            getKey={(o) => o.id}
            empty="Nothing to schedule."
            columns={[service, address, due, customer]}
            actions={actions}
          />
        </Section>

        <Section title="Scheduled" hint="Upcoming and active visits.">
          <DataList
            rows={scheduled}
            getKey={(o) => o.id}
            empty="No visits scheduled."
            columns={[
              service,
              address,
              visit,
              { label: "Technician", render: (o) => o.technician?.name },
              status,
              customer,
            ]}
            actions={actions}
          />
        </Section>

        <Section
          title="Waiting for the customer"
          hint="Done. The customer confirms, or reports a problem."
        >
          <DataList
            rows={waiting}
            getKey={(o) => o.id}
            empty="Nothing waiting."
            columns={[
              service,
              address,
              status,
              {
                label: "Problem",
                render: (o) =>
                  o.status === "PROBLEM_REPORTED" ? (o.events[0]?.note ?? "") : "None",
              },
              customer,
            ]}
            actions={actions}
          />
        </Section>

        <Section title="Finished" hint="Confirmed by the customer in the last 30 days.">
          <DataList
            rows={finished}
            getKey={(o) => o.id}
            empty="No finished jobs yet."
            columns={[
              service,
              address,
              { label: "Confirmed", render: (o) => timeAgo(o.updatedAt) },
              {
                label: "Rating",
                render: (o) =>
                  o.rating ? (
                    <Rating value={o.rating.stars} readOnly size="small" />
                  ) : (
                    "Not rated yet"
                  ),
              },
            ]}
          />
        </Section>
      </Stack>
    </>
  );
}

/**
 * The technician's page, made for a phone: jobs under way first, then upcoming visits, each as a
 * card with tap-to-call, tap-for-directions and one big button for the next step.
 */
async function TechnicianJobs({ user }: { user: SessionUser }) {
  const visits = (await listTechnicianOrders(user.id)).filter(
    (v): v is Visit & { customer: NonNullable<Visit["customer"]> } => v.customer !== null,
  );
  const actor: Actor = toActor(user);
  const now = visits.filter((v) => v.status === "ON_THE_WAY" || v.status === "IN_PROGRESS");
  const upcoming = visits.filter((v) => v.status === "SCHEDULED");
  const cards = (list: typeof visits) => (
    <Stack spacing={2}>
      {list.map((v) => (
        <VisitCard key={v.id} visit={v} actions={nextActions(v, actor)} />
      ))}
    </Stack>
  );

  return (
    <>
      <PageHeader title="My jobs" subtitle={`${user.name}, ${user.business?.name}`} />
      <Stack spacing={4} sx={{ maxWidth: 560 }}>
        {now.length > 0 && (
          <Section title="Now" hint="On the way or in progress.">
            {cards(now)}
          </Section>
        )}
        <Section title="Upcoming" hint="Your scheduled visits, soonest first.">
          {upcoming.length > 0 ? (
            cards(upcoming)
          ) : (
            <Typography color="text.secondary">No upcoming visits.</Typography>
          )}
        </Section>
      </Stack>
    </>
  );
}
