import { prisma } from "@ew/db";
import { NextResponse } from "next/server";
import { OrderRequestSchema } from "@/lib/order-schema";

export const runtime = "nodejs";

const orNull = (s: string) => (s === "" ? null : s);

export async function POST(req: Request) {
  const parsed = OrderRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        status: "SUBMITTED",
        serviceTypeId: v.serviceType,
        contactName: v.contactName,
        contactEmail: orNull(v.contactEmail),
        contactPhone: orNull(v.contactPhone),
        notifyPref: v.notifyPref,
        address: { ...v.address, line2: orNull(v.address.line2) },
        dueDate: v.dueDate ? new Date(v.dueDate) : null,
        notes: orNull(v.notes),
        extractedData: v.extraction
          ? { ...v.extraction, issuingAuthority: orNull(v.issuingAuthority), noticeId: orNull(v.noticeId) }
          : { issuingAuthority: orNull(v.issuingAuthority), noticeId: orNull(v.noticeId) },
      },
      select: { id: true },
    });
    await tx.orderEvent.create({
      data: { orderId: created.id, fromStatus: null, toStatus: "SUBMITTED" },
    });
    return created;
  });

  return NextResponse.json({ id: order.id }, { status: 201 });
}
