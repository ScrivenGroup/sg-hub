import type { AssignmentPlan, PlanTask } from "../schema";
import { resizePlanToWeekCount } from "./assignment";

const TEMPLATE_WEEKS = 13;

function leaf(
  id: string,
  name: string,
  start: number,
  dur: number,
  assign: Record<string, number[]>,
): PlanTask {
  return { id, name, level: 1, parent: null, start, dur, assign };
}

/** Role-keyed Prepare / Inspect / Report template, then resized to the lane window. */
export function prepareInspectReportPlan(weekCount: number): AssignmentPlan {
  const plan: AssignmentPlan = {
    weekCount: TEMPLATE_WEEKS,
    tasks: [
      leaf("t-prepare", "Prepare", 2, 5, {
        Lead: [8, 8, 8, 0, 0],
        Support: [40, 40, 40, 40, 0],
      }),
      leaf("t-inspect", "Inspect", 4, 7, {
        Engineer: [40, 40, 40, 40, 40, 40, 0],
        Lead: [4, 4, 4, 4, 4, 4, 0],
      }),
      leaf("t-report", "Report", 8, 4, {
        Engineer: [20, 20, 0, 0],
        Support: [20, 20, 20, 20],
      }),
    ],
  };
  const target = Math.max(1, weekCount || TEMPLATE_WEEKS);
  if (target !== TEMPLATE_WEEKS) {
    resizePlanToWeekCount(plan, TEMPLATE_WEEKS, target);
  }
  return plan;
}
