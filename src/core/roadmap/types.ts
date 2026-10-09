export const ROADMAP_SHAPE_KINDS = ["tools", "process", "tied"] as const;
export type RoadmapShapeKind = (typeof ROADMAP_SHAPE_KINDS)[number];

export const ROADMAP_PLACEMENTS = [
  "undeveloped",
  "waiting_sequence",
  "sequenced",
  "future",
  "completed",
] as const;
export type RoadmapPlacement = (typeof ROADMAP_PLACEMENTS)[number];

export type RoadmapRegion = {
  id: string;
  title: string;
  order: number;
};

export type RoadmapChunk = {
  id: string;
  streamId: string;
  title: string;
  intent: string;
  scope: "stream" | string;
  placement: RoadmapPlacement;
  col: number;
  row: number;
  w: number;
  h: number;
  /** When true, col/row/size stay put. Grip and resize are inert. */
  locked?: boolean;
  completedAt?: string;
  /** Dummy assignee id / label. */
  assignee?: string;
  /** Free text for dummy testing. */
  notes?: string;
};

export type RoadmapStream = {
  id: string;
  title: string;
  shapeKind: RoadmapShapeKind;
  /** Width of the section grid, in cells. */
  cols?: number;
  /** Top-left of the stream on the playground grid. */
  canvasCol?: number;
  canvasRow?: number;
  /** Large-block mode: hide sections, keep a movable tile. */
  collapsed?: boolean;
  /** Collapsed frame size in cells. Collapse button resets to 12×5. */
  collapsedCols?: number;
  collapsedRows?: number;
  /** Extra expanded frame height in cells (content may overflow). */
  frameRows?: number;
  /** Per-section body size in cells. */
  bandRows?: Partial<Record<"wip" | "seq" | "future" | "done", number>>;
  bandCols?: Partial<Record<"wip" | "seq" | "future" | "done", number>>;
  regions: RoadmapRegion[];
  chunks: RoadmapChunk[];
};
