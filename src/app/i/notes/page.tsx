import { redirect } from "next/navigation";

export default function NotesLeafRedirect() {
  redirect("/d?tab=notes");
}
