import { NextResponse } from "next/server";
import { loadReferenceHtml } from "@/modules/funds-forecaster/load-reference-html";

export async function GET() {
  const html = await loadReferenceHtml();
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
