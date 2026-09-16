import { redirect } from "next/navigation";

export default function IdeasLeafRedirect() {
  redirect("/d?tab=inbox");
}
