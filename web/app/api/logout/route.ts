import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  return NextResponse.redirect(new URL("/login", request.url));
}
