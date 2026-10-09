import { redirect } from "next/navigation";
import { ROADMAP_HREF } from "@/core/roadmap/tabs";

export default function RoadmapMoved() {
  redirect(ROADMAP_HREF);
}
