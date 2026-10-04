import { fail, json, readJson } from "@/lib/http";
import { joinDigger, joinGeologist } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await readJson(request);
    const joined = body.role === "digger" ? await joinDigger(code) : await joinGeologist(code);
    return json({ token: joined.token, ...joined.view });
  } catch (error) {
    return fail(error);
  }
}
