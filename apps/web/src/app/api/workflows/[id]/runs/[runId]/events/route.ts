export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("event: message\ndata: " + JSON.stringify({ type: "run_complete" }) + "\n\n", {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
