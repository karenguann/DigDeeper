import { fail, json } from "@/lib/http";
import { createRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const { token, view } = createRoom();
    return json({ token, ...view });
  } catch (error) {
    return fail(error);
  }
}
