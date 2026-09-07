# Change checklist

1. Correct Hub (Work / Projects / Internal / System)?  
2. Sub-hub registered (slug + 6-hex code + access)? Cycle: dummy → `sketched` shell → `building` skeleton → `live`?  
3. Home + Site network + Feedback + Profile intact?  
4. Theme tokens; hex on badge only unless ThemeContract? Starting classes `sg-card` / `sg-btn-*`?  
5. Site / Hub map updated (registry → Site network)?  
6. Leaf Development: changelog (+ notes when not sketched)? Shipping version number + datetime?  
7. Deps touched → Definition + RAG + externalUrl?  
8. Preview: localhost; live only when the user says make it live.  
9. Store: same types as production; do not add a parallel DB or a new HTML stack. Kanban Online = Neon **rows** with `node_id` (JSON fallback mirrors those columns). Not one JSONB blob per leaf.  
10. Kanban Online chrome: short header; one tab strip Inbox \| All Kanban \| Later+Open \| …; Leafs dropdown on row 2 (Internal, tagged leaves only); Raise an idea on every tab; Layout is a side-by-side toggle on KanBan tabs; More options is a `ShellModal`.  
