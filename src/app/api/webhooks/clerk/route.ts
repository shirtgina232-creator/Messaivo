import { Webhook } from "svix";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type ClerkEmailAddress = { id: string; email_address: string };

type ClerkUserPayload = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserPayload;
};

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;

  const getPrimaryEmail = (d: ClerkUserPayload) =>
    (d.email_addresses.find((e) => e.id === d.primary_email_address_id) ?? d.email_addresses[0])
      ?.email_address ?? "";

  const getFullName = (d: ClerkUserPayload) =>
    [d.first_name, d.last_name].filter(Boolean).join(" ") || null;

  if (type === "user.created") {
    const email = getPrimaryEmail(data);
    const name = getFullName(data);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          clerkId: data.id,
          email,
          name,
          avatarUrl: data.image_url,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          userId: user.id,
          name: name ? `${name.split(" ")[0]}'s Workspace` : "My Workspace",
          planId: "lite",
        },
      });

      await tx.creditLedger.create({
        data: {
          workspaceId: workspace.id,
          monthlyAllocation: 30_000,
          bonusCredits: 0,
          usedThisPeriod: 0,
          periodStart: new Date(),
          periodEnd,
        },
      });
    });
  }

  if (type === "user.updated") {
    const email = getPrimaryEmail(data);
    const name = getFullName(data);

    await prisma.user.updateMany({
      where: { clerkId: data.id },
      data: {
        ...(email && { email }),
        ...(name !== undefined && { name }),
        ...(data.image_url !== undefined && { avatarUrl: data.image_url }),
      },
    });
  }

  if (type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId: data.id } });
  }

  return new Response("OK", { status: 200 });
}
