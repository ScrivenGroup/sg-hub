import { redirect } from "next/navigation";
import { TRAIN_CHANGELOG_HREF } from "@/core/train/version";

export default function TrainChangelogRedirect() {
  redirect(TRAIN_CHANGELOG_HREF);
}
