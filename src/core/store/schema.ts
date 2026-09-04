import { pgTable, text } from "drizzle-orm/pg-core";

/** Simple hub registers only. MRT / mtg-buylist / kanban stay on JSON. */

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  pageHref: text("page_href").notNull(),
  pageTitle: text("page_title").notNull(),
  message: text("message").notNull(),
  submittedBy: text("submitted_by").notNull(),
});

export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull(),
});

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const changelogs = pgTable("changelogs", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  createdAt: text("created_at").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind"),
  version: text("version"),
});

export const dependencies = pgTable("dependencies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  expiresAt: text("expires_at"),
  externalUrl: text("external_url"),
  notes: text("notes").notNull(),
});

export const devChoices = pgTable("dev_choices", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  layer: text("layer").notNull(),
  status: text("status").notNull(),
  decision: text("decision").notNull(),
  why: text("why"),
});
