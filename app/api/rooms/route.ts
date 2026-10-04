import { fail, json, readJson } from "@/lib/http";
import { createRoom, createSoloRoom } from "@/lib/rooms";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (body.solo === true) {
      const { token, view } = await createSoloRoom();
      return json({ token, ...view });
    }
    const role: Role = body.role === "geologist" ? "geologist" : "digger";
    const { token, view } = await createRoom(role);
    return json({ token, ...view });
  } catch (error) {
    return fail(error);
  }
}
