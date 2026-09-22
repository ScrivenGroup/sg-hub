export const ROADMAP_SHAPE_KINDS = ["tools", "process", "tied"] as const;
export type RoadmapShapeKind = (typeof ROADMAP_SHAPE_KINDS)[number];

export const ROADMAP_PLACEMENTS = [
  "undeveloped",
  "waiting_sequence",
  "sequenced",
  "future",
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
};

export type RoadmapStream = {
  id: string;
  title: string;
  shapeKind: RoadmapShapeKind;
  /** Width of the stream on the canvas, in grid cells. */
  cols?: number;
  regions: RoadmapRegion[];
  chunks: RoadmapChunk[];
};
