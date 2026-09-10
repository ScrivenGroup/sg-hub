import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, isMrtGuest } from "@/auth";
import { deleteKanbanAttachment, getKanbanAttachment } from "@/core/store/json-store";

export const runtime = "nodejs";

async function requireStaff(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user) && !isMrtGuest(session);
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ ok: false, error: "Staff sign-in required" }, { status: 401 });
  }
  const { id } = await context.params;
  const row = await getKanbanAttachment(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.meta.mimeType,
      "Content-Length": String(row.bytes.length),
      "Content-Disposition": contentDisposition(row.meta.filename),
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ ok: false, error: "Staff sign-in required" }, { status: 401 });
  }
  const { id } = await context.params;
  const ok = await deleteKanbanAttachment(id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
  revalidatePath("/d");
  return NextResponse.json({ ok: true });
}
