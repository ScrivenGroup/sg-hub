import { SubHubShell } from "@/core/shell/SubHubShell";
import { getNotes } from "@/core/store/json-store";

export default async function NotesPage() {
  const notes = await getNotes();
  return (
    <SubHubShell
      href="/i/notes"
      extra={
        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">Notes</h2>
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="sg-card">
                <h3 className="font-medium">{note.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{note.body}</p>
              </li>
            ))}
          </ul>
        </section>
      }
    />
  );
}
