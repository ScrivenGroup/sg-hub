export type HubPrefix = "w" | "p" | "i" | "s";
export type AccessMode = "shared" | "restricted" | "per_user";
export type NodeStatus = "sketched" | "building" | "live";
export type NodeKind = "hub" | "subhub" | "tool";

export type RegistryNode = {
  id: string;
  hubPrefix: HubPrefix;
  slug: string;
  title: string;
  /** Opaque 6-hex identity; badge fill only */
  code: string;
  kind: NodeKind;
  parentId: string | null;
  href: string;
  accessMode: AccessMode;
  status: NodeStatus;
  hasNetworkMap: boolean;
  description?: string;
  order: number;
};

export type ChangelogEntry = {
  id: string;
  nodeId: string;
  createdAt: string;
  title: string;
  body: string;
};

export type DependencyRecord = {
  id: string;
  name: string;
  type: string;
  expiresAt: string | null;
  externalUrl: string | null;
  notes: string;
};

export type RagLevel = "green" | "amber" | "red" | "none";

export type IdeaRecord = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  status: "inbox" | "active" | "parked" | "done";
};

export type NoteRecord = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

export type FeedbackKind = "bug" | "idea" | "housekeeping" | "other";
export type FeedbackStatus = "open" | "triaged" | "done";

export type FeedbackRecord = {
  id: string;
  createdAt: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  pageHref: string;
  pageTitle: string;
  message: string;
  submittedBy: string;
};
