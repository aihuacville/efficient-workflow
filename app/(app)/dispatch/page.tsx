import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import type { Metadata } from "next";
import { DataList } from "@/components/DataList";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Dispatch" };

// Sample rows to check the responsive layout. Replaced by real orders on Thursday.
const SAMPLE = [
  { id: "1", service: "Fire safety inspection", address: "12 Main St, Springfield, IL", due: "Nov 15", status: "New" },
  { id: "2", service: "Backflow testing", address: "88 Oak Ave, Springfield, IL", due: "Nov 20", status: "Offered" },
  { id: "3", service: "Fire safety inspection", address: "5 Elm Ct, Springfield, IL", due: "Dec 1", status: "New" },
];

export default function DispatchPage() {
  return (
    <>
      <PageHeader title="Dispatch" subtitle="New requests waiting for a business" />
      <Alert severity="info" sx={{ mb: 2 }}>
        Sample data. The real queue arrives on Thursday.
      </Alert>
      <DataList
        rows={SAMPLE}
        getKey={(r) => r.id}
        empty="Nothing to dispatch."
        columns={[
          { label: "Service", render: (r) => r.service, primary: true },
          { label: "Address", render: (r) => r.address },
          { label: "Due", render: (r) => r.due },
          {
            label: "Status",
            render: (r) => <Chip size="small" label={r.status} color={r.status === "New" ? "primary" : "default"} />,
          },
        ]}
        actions={() => (
          <Button variant="contained" size="small">
            Offer job
          </Button>
        )}
      />
    </>
  );
}
