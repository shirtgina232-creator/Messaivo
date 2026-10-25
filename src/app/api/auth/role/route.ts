import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(raw);
  if (!user) return NextResponse.json({ role: null }, { status: 401 });
  return NextResponse.json({ role: user.role });
}
