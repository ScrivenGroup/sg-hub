import { redirect } from "next/navigation";
import { DEVELOPMENT_INBOX_HREF } from "@/core/kanban/development-hub";

export default function FeedbackLeafRedirect() {
  redirect(DEVELOPMENT_INBOX_HREF);
}
