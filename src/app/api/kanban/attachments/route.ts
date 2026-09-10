import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, isMrtGuest } from "@/auth";
import {
  ATTACHMENT_MAX_BYTES,
  resolveAttachmentMime,
} from "@/core/kanban/attachments";
import { addKanbanAttachment, getKanbanIdeaById } from "@/core/store/json-store";

export const runtime = "nodejs";

async function requireStaff(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user) && !isMrtGuest(session);
}

export async function POST(request: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ ok: false, error: "Staff sign-in required" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read upload body" }, { status: 400 });
  }

  const ideaId = String(form.get("ideaId") || "").trim();
  const file = form.get("file");
  if (!ideaId) {
    return NextResponse.json({ ok: false, error: "ideaId required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File is over 8 MB" }, { status: 400 });
  }

  const mime = resolveAttachmentMime(file.name, file.type);
  if (!mime) {
    return NextResponse.json(
      { ok: false, error: "Allowed: png/jpeg/webp/gif, pdf, txt/md/html/json/csv" },
      { status: 400 },
    );
  }

  const idea = await getKanbanIdeaById(ideaId);
  if (!idea) {
    return NextResponse.json({ ok: false, error: "Inbox note not found" }, { status: 404 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const meta = await addKanbanAttachment({
      ideaId,
      filename: file.name,
      mimeType: mime,
      bytes,
    });
    revalidatePath("/d");
    return NextResponse.json({
      ok: true,
      attachment: {
        id: meta.id,
        filename: meta.filename,
        mimeType: meta.mimeType,
        byteSize: meta.byteSize,
        createdAt: meta.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
