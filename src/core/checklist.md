# Change checklist

1. Correct Hub (Work / Projects / Development / Internal / System)?  
2. Sub-hub registered (slug + 6-hex code + access)? Cycle: dummy → `sketched` shell → `building` skeleton → `live`?  
3. Home + Site network + Feedback + Profile intact?  
4. Theme tokens; hex on badge only unless ThemeContract? Starting classes `sg-card` / `sg-btn-*`? Can’t follow the kit → Hold note on `/s/standards`, do not rewrite the library.  
5. Site / Hub map updated (registry → Site network)?  
6. Leaf Development: changelog (+ notes when not sketched)? Shipping version number + datetime?  
7. Deps touched → Definition + RAG + externalUrl?  
8. Preview: this desk’s localhost port (station `:3000`, wip `:3001+`). `AUTH_URL` must match. Live only when the user says make it live.  
9. Store: same types as production; do not add a parallel DB or a new HTML stack. Kanban Online = Neon **rows** with `node_id` (JSON fallback mirrors those columns). Standards picks/holds = Neon `standards_choices` / `standards_holds`. Not one JSONB blob per leaf.  
10. Development suite chrome: short header; one tab strip Inbox \| All Kanban \| Later+Open \| … \| Changelog \| Notes \| Design spec; Leafs dropdown on row 2 (global `/d`, tagged leaves only); capture is chrome Feedback (not an in-tab Raise); Layout is a side-by-side toggle on KanBan tabs; More options is a `ShellModal`.  
