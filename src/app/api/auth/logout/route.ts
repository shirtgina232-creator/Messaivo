import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSessionByRaw, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  try {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    if (raw) await deleteSessionByRaw(raw);
    jar.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/auth/logout]", e);
    return NextResponse.json({ ok: true }); // always succeed client-side
  }
}
