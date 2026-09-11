import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";
import { sendMessengerMessage, type MessageTag } from "@/lib/meta-graph";

// ── Meta error code classification ───────────────────────────────────────────

// These error codes indicate a permanent failure — never retry
const PERMANENT_ERROR_CODES = new Set([
  551,   // "This person isn't available right now" (invalid/blocked PSID)
  200,   // "This message is sent outside of allowed window" (some regions report as 200)
  10,    // Outside 24-hour messaging window (general)
  190,   // Token expired / invalid
  368,   // Page temporarily blocked by Meta
  1545041, // messaging window expired (Meta internal code)
  2018109, // Message template rejected
]);

// These error codes indicate the 24-hour window is closed specifically
const WINDOW_CLOSED_CODES = new Set([10, 1545041, 200]);

// These indicate a transient rate-limit — back off and retry
const RATE_LIMIT_CODES = new Set([613, 80007, 17, 4]);

function classifyError(errorCode: number | null, httpStatus: number): "permanent" | "window_closed" | "rate_limit" | "transient" {
  if (errorCode !== null) {
    if (WINDOW_CLOSED_CODES.has(errorCode)) return "window_closed";
    if (PERMANENT_ERROR_CODES.has(errorCode)) return "permanent";
    if (RATE_LIMIT_CODES.has(errorCode)) return "rate_limit";
  }
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus >= 500) return "transient";
  return "permanent"; // unknown non-retryable
}

// ── Template rendering ────────────────────────────────────────────────────────

interface ContactVars {
  first_name: string;
  last_name: string;
  name: string;
  page_name: string;
  [key: string]: string;
}

function renderTemplate(
  raw: string,
  customVars: Record<string, string>,
  contactVars: ContactVars,
): string {
  const all = { ...customVars, ...contactVars }; // contact vars override custom
  return raw.replace(/\{\{(\w+)\}\}/g, (_, key: string) => all[key] ?? "");
}

// ── Worker constants ──────────────────────────────────────────────────────────

const RATE_LIMIT_DELAY_MS = 100;        // 100ms between Meta API calls
const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 min
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;   // reschedule 2 min later on 429

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify Vercel Cron secret (auto-set by Vercel in production; must be provided manually in dev)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerId = `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // ── 1. Release stale locks ──────────────────────────────────────────────
    const staleThreshold = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS);
    const released = await prisma.broadcastJob.updateMany({
      where: {
        status: "processing",
        lockedAt: { lt: staleThreshold },
      },
      data: {
        status: "queued",
        lockedAt: null,
        lockedBy: null,
        lastError: "Reset: stale lock detected",
      },
    });

    if (released.count > 0) {
      console.log(`[broadcast-worker] Released ${released.count} stale lock(s)`);
    }

    // ── 2. Claim the next queued job (optimistic concurrency) ───────────────
    const candidate = await prisma.broadcastJob.findFirst({
      where: {
        status: "queued",
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json({ ok: true, message: "No queued jobs" });
    }

    // Claim only if it's still queued (guards against rare concurrent cron fires)
    const claimed = await prisma.broadcastJob.updateMany({
      where: { id: candidate.id, status: "queued" },
      data: {
        status: "processing",
        lockedAt: new Date(),
        lockedBy: workerId,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json({ ok: true, message: "Job already claimed" });
    }

    // Re-read the full job record now that we own it
    const job = await prisma.broadcastJob.findUnique({
      where: { id: candidate.id },
    });

    if (!job) {
      return NextResponse.json({ ok: true, message: "Job disappeared after claim" });
    }

    // ── 3. Load the broadcast and its page ─────────────────────────────────
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: job.broadcastId },
      select: {
        id: true,
        workspaceId: true,
        status: true,
        pageId: true,
        message: true,
        messageTemplateId: true,
        fieldValues: true,
        allowSubscriberSend: true,
        messagingTag: true,
        totalRecipients: true,
        sent: true,
        failed: true,
        ineligibleCount: true,
        skippedCount: true,
        creditsUsed: true,
      },
    });

    if (!broadcast || broadcast.status !== "sending") {
      await prisma.broadcastJob.update({
        where: { id: job.id },
        data: { status: "cancelled", lockedAt: null, lockedBy: null, lastError: "Broadcast not in sending state" },
      });
      return NextResponse.json({ ok: true, message: "Broadcast not in sending state — job cancelled" });
    }

    if (!broadcast.pageId) {
      await failJob(job.id, "No page associated with broadcast");
      await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "failed", completedAt: new Date() } });
      return NextResponse.json({ ok: true, message: "No page — broadcast failed" });
    }

    const page = await prisma.facebookPage.findFirst({
      where: { id: broadcast.pageId, workspaceId: broadcast.workspaceId },
      select: { id: true, pageId: true, pageName: true, accessToken: true, isActive: true },
    });

    if (!page || !page.isActive) {
      await failJob(job.id, "Page not found or inactive");
      await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "failed", completedAt: new Date() } });
      return NextResponse.json({ ok: true, message: "Page inactive — broadcast failed" });
    }

    const plainToken = decryptToken(page.accessToken);

    // ── 4. Check credit balance for this batch ──────────────────────────────
    const ledger = await prisma.creditLedger.findUnique({ where: { workspaceId: broadcast.workspaceId } });
    const available = !ledger
      ? 0
      : ledger.unlimitedCredits
        ? Infinity
        : Math.max(0, ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod);

    if (available === 0) {
      // No credits — fail remaining pending recipients and complete the broadcast
      await prisma.broadcastRecipient.updateMany({
        where: { broadcastId: broadcast.id, status: "pending" },
        data: { status: "failed", failureReason: "Insufficient credits" },
      });
      const remainingCount = await prisma.broadcastRecipient.count({
        where: { broadcastId: broadcast.id, status: "failed", failureReason: "Insufficient credits" },
      });
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "failed", completedAt: new Date(), failed: { increment: remainingCount } },
      });
      await prisma.broadcastJob.update({
        where: { id: job.id },
        data: { status: "failed", lockedAt: null, lockedBy: null, lastError: "Insufficient credits" },
      });
      return NextResponse.json({ ok: true, message: "No credits — broadcast failed" });
    }

    // ── 5. Load the next batch of pending recipients ────────────────────────
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId: broadcast.id, status: "pending" },
      include: {
        contact: {
          select: {
            id: true,
            metaUserId: true,
            isSubscribed: true,
            lastMessageAt: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      take: job.batchSize,
      orderBy: { id: "asc" },
    });

    if (recipients.length === 0) {
      // No more pending — broadcast is done
      await completeBroadcast(job.id, broadcast.id);
      return NextResponse.json({ ok: true, message: "All recipients processed — broadcast complete" });
    }

    // ── 6. Determine message content / template type ────────────────────────
    const isUserTemplate = !!broadcast.messageTemplateId;
    const rawTemplate = isUserTemplate ? broadcast.message : null;
    const customFieldValues = (broadcast.fieldValues ?? {}) as Record<string, string>;

    // Determine sending method for this broadcast:
    //   RESPONSE    — standard conversational reply; requires 24-hour window
    //   MESSAGE_TAG — out-of-window utility notification; requires tag + compliant content
    const useMessageTag = broadcast.allowSubscriberSend && !!broadcast.messagingTag;
    const messageTagValue = (broadcast.messagingTag ?? undefined) as MessageTag | undefined;

    // ── 7. Process each recipient ───────────────────────────────────────────
    const windowCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let sentCount = 0;
    let failedCount = 0;
    let ineligibleCount = 0;
    let skippedCount = 0;
    let creditsToDeduct = 0;
    let hitRateLimit = false;

    const sentAt = new Date();
    const recipientUpdates: Array<{
      id: string;
      status: string;
      metaMessageId?: string | null;
      failureReason?: string;
      sentAt?: Date;
    }> = [];

    // Track how many credits remain for this batch
    let creditsLeft = available === Infinity ? Infinity : available;

    for (const recipient of recipients) {
      // Skip unsubscribed contacts
      if (!recipient.contact.isSubscribed) {
        skippedCount++;
        failedCount++;
        recipientUpdates.push({
          id: recipient.id,
          status: "failed",
          failureReason: "Contact is unsubscribed",
        });
        continue;
      }

      // Enforce messaging window rules based on selected method:
      //   RESPONSE mode  → requires an inbound message within the last 24 hours
      //   MESSAGE_TAG    → no 24-hour window restriction; any subscribed contact is eligible
      const inWindow = recipient.contact.lastMessageAt && recipient.contact.lastMessageAt >= windowCutoff;
      if (!inWindow && !useMessageTag) {
        ineligibleCount++;
        failedCount++;
        recipientUpdates.push({
          id: recipient.id,
          status: "failed",
          failureReason: "Outside 24-hour messaging window — recipient must message the Page first",
        });
        continue;
      }

      // Check per-send credit availability
      if (creditsLeft <= 0) {
        recipientUpdates.push({
          id: recipient.id,
          status: "failed",
          failureReason: "Insufficient credits",
        });
        failedCount++;
        continue;
      }

      // Render message for this recipient
      let messageToSend = broadcast.message;
      if (isUserTemplate && rawTemplate) {
        const contact = recipient.contact;
        const contactVars: ContactVars = {
          first_name: contact.firstName ?? contact.name?.split(" ")[0] ?? "",
          last_name: contact.lastName ?? (contact.name?.split(" ").slice(1).join(" ") ?? ""),
          name: contact.name ?? [contact.firstName, contact.lastName].filter(Boolean).join(" ") ?? "",
          page_name: page.pageName,
        };
        messageToSend = renderTemplate(rawTemplate, customFieldValues, contactVars);
      }

      // Call Meta Send API with the appropriate messaging_type and tag
      const result = await sendMessengerMessage(
        plainToken,
        page.pageId,
        recipient.contact.metaUserId,
        messageToSend,
        useMessageTag ? "MESSAGE_TAG" : "RESPONSE",
        useMessageTag ? messageTagValue : undefined,
      );

      // Rate-limit delay between API calls (Meta compliance)
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS));

      if (result.error) {
        const classification = classifyError(result.errorCode, 0);

        if (classification === "rate_limit") {
          // Don't mark recipient as failed — keep pending for retry
          // Stop processing this batch immediately
          hitRateLimit = true;
          console.log(`[broadcast-worker] Rate limit hit (code ${result.errorCode}) — stopping batch`);
          break;
        } else if (classification === "window_closed") {
          ineligibleCount++;
          failedCount++;
          recipientUpdates.push({
            id: recipient.id,
            status: "failed",
            failureReason: `Outside 24-hour messaging window (Meta error: ${result.error.slice(0, 300)})`,
          });
        } else {
          // permanent or transient-but-unknown — mark failed
          failedCount++;
          recipientUpdates.push({
            id: recipient.id,
            status: "failed",
            failureReason: result.error.slice(0, 500),
          });

          // If the page token is expired, mark all remaining recipients failed too
          if (result.errorCode === 190) {
            console.error(`[broadcast-worker] Page token expired for page ${page.pageId} — stopping batch`);
            break;
          }
        }
      } else {
        sentCount++;
        creditsLeft === Infinity ? null : creditsLeft--;
        creditsToDeduct++;
        recipientUpdates.push({
          id: recipient.id,
          status: "sent",
          metaMessageId: result.messageId,
          sentAt,
        });
      }
    }

    // ── 8. Persist recipient statuses ───────────────────────────────────────
    if (recipientUpdates.length > 0) {
      await prisma.$transaction(
        recipientUpdates.map(u =>
          prisma.broadcastRecipient.update({
            where: { id: u.id },
            data: {
              status: u.status,
              ...(u.metaMessageId !== undefined && { metaMessageId: u.metaMessageId }),
              ...(u.sentAt && { sentAt: u.sentAt }),
              ...(u.failureReason && { failureReason: u.failureReason }),
            },
          })
        )
      );
    }

    // ── 9. Update broadcast counters ────────────────────────────────────────
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        sent: { increment: sentCount },
        failed: { increment: failedCount },
        ineligibleCount: { increment: ineligibleCount },
        skippedCount: { increment: skippedCount },
        creditsUsed: { increment: creditsToDeduct },
      },
    });

    // ── 10. Deduct credits for this batch ───────────────────────────────────
    if (creditsToDeduct > 0 && ledger && !ledger.unlimitedCredits) {
      const newUsed = ledger.usedThisPeriod + creditsToDeduct;
      const balanceAfter = Math.max(0, ledger.monthlyAllocation + ledger.bonusCredits - newUsed);
      await prisma.$transaction([
        prisma.creditLedger.update({
          where: { workspaceId: broadcast.workspaceId },
          data: { usedThisPeriod: { increment: creditsToDeduct } },
        }),
        prisma.creditTransaction.create({
          data: {
            workspaceId: broadcast.workspaceId,
            type: "DEDUCTION",
            operation: "BROADCAST_SEND",
            amount: -creditsToDeduct,
            balanceAfter,
            pageId: page.id,
            broadcastId: broadcast.id,
          },
        }),
      ]);
    }

    // ── 11. Check if there are more pending recipients ──────────────────────
    const remainingCount = await prisma.broadcastRecipient.count({
      where: { broadcastId: broadcast.id, status: "pending" },
    });

    if (remainingCount === 0) {
      await completeBroadcast(job.id, broadcast.id);
    } else if (hitRateLimit) {
      // Back off before retrying
      const nextRun = new Date(Date.now() + RATE_LIMIT_BACKOFF_MS);
      await prisma.broadcastJob.update({
        where: { id: job.id },
        data: {
          status: "queued",
          lockedAt: null,
          lockedBy: null,
          scheduledFor: nextRun,
          lastError: "Rate limit hit — backing off",
        },
      });
    } else {
      // More recipients remain — re-queue immediately
      await prisma.broadcastJob.update({
        where: { id: job.id },
        data: {
          status: "queued",
          lockedAt: null,
          lockedBy: null,
          scheduledFor: new Date(),
          lastError: null,
        },
      });
    }

    console.log(
      `[broadcast-worker] id=${job.id} broadcast=${broadcast.id} ` +
      `sent=${sentCount} failed=${failedCount} ineligible=${ineligibleCount} ` +
      `skipped=${skippedCount} remaining=${remainingCount}`
    );

    return NextResponse.json({
      ok: true,
      broadcastId: broadcast.id,
      batchSent: sentCount,
      batchFailed: failedCount,
      batchIneligible: ineligibleCount,
      batchSkipped: skippedCount,
      remaining: remainingCount,
    });

  } catch (e) {
    console.error("[broadcast-worker] Unhandled error", e);
    return NextResponse.json({ error: "Worker error" }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function failJob(jobId: string, reason: string) {
  await prisma.broadcastJob.update({
    where: { id: jobId },
    data: { status: "failed", lockedAt: null, lockedBy: null, lastError: reason },
  });
}

async function completeBroadcast(jobId: string, broadcastId: string) {
  const final = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    select: { sent: true },
  });
  const finalStatus = (final?.sent ?? 0) > 0 ? "completed" : "failed";

  await prisma.$transaction([
    prisma.broadcastJob.update({
      where: { id: jobId },
      data: { status: "completed", lockedAt: null, lockedBy: null },
    }),
    prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: finalStatus, completedAt: new Date() },
    }),
  ]);
}
