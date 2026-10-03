import { fail, json } from "@/lib/http";
import { joinGeologist } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const { token, view } = await joinGeologist(code);
    return json({ token, ...view });
  } catch (error) {
    return fail(error);
  }
}
