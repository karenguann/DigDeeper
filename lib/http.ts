import { NextResponse } from "next/server";

import { GameError } from "@/lib/errors";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(error: unknown) {
  if (error instanceof GameError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "The shaft collapsed." }, 500);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function tokenFrom(request: Request, body: Record<string, unknown>): string {
  if (typeof body.token === "string" && body.token) return body.token;
  return request.headers.get("x-player-token") ?? "";
}
