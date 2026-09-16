import { redirect } from "next/navigation";

export default function FeedbackLeafRedirect() {
  redirect("/d?tab=inbox");
}
