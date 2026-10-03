import { fail, json } from "@/lib/http";
import { getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const token = new URL(request.url).searchParams.get("token") ?? request.headers.get("x-player-token");
    return json(getRoom(code, token));
  } catch (error) {
    return fail(error);
  }
}
