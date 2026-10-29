import type { Metadata } from "next";
import { DataList } from "@/components/DataList";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "My jobs" };

export default function JobsPage() {
  return (
    <>
      <PageHeader title="My jobs" subtitle="Offers and active jobs for your business" />
      <DataList
        rows={[]}
        getKey={() => ""}
        columns={[{ label: "Service", render: () => null }]}
        empty="Job offers will show up here. Coming on Friday."
      />
    </>
  );
}
