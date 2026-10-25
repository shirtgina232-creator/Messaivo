import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-helpers";
import { testSmtpConnection, sendMail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { to?: string };
  const to = body.to?.trim();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 });
  }

  const verify = await testSmtpConnection();
  if (!verify.ok) {
    return NextResponse.json({ ok: false, error: verify.error ?? "SMTP connection failed" });
  }

  try {
    await sendMail({
      to,
      subject: "Messaivo SMTP Test",
      html: `<p>This is a test email from your Messaivo SMTP configuration.</p><p>If you received this, SMTP is working correctly.</p>`,
      text: "This is a test email from your Messaivo SMTP configuration. If you received this, SMTP is working correctly.",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send test email";
    return NextResponse.json({ ok: false, error: msg });
  }
}
