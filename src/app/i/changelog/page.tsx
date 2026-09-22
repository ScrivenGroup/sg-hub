import { redirect } from "next/navigation";
import { SG_HUB_CHANGELOG_HREF } from "@/core/kanban/development-hub";

/** Brief Internal href from the overall-glasses pass — Development owns this room. */
export default function SgHubChangelogInternalRedirect() {
  redirect(SG_HUB_CHANGELOG_HREF);
}
