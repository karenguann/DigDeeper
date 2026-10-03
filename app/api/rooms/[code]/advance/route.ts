import { fail, json, readJson, tokenFrom } from "@/lib/http";
import { advance } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await readJson(request);
    return json(await advance(code, tokenFrom(request, body)));
  } catch (error) {
    return fail(error);
  }
}
