# Change checklist

1. Correct Hub (Work / Projects / Development / Internal / System)?  
2. Sub-hub registered (slug + 6-hex code + access)? Cycle: dummy → `sketched` shell → `building` skeleton → `live`?  
3. Home + Train version + Site network + Feedback + Profile intact? WIP desks show the yellow `WIP_DESK` badge; station/Azure do not.  
4. Theme tokens; hex on badge only unless ThemeContract? Starting classes `sg-card` / `sg-btn-*`? Can’t follow the kit → Hold note on `/s/standards`, do not rewrite the library.  
5. Site / Hub map updated (registry → Site network)?  
6. Leaf Development: changelog X.Y.Z + datetime? Train stays vX.Y in chrome (Hotfix chip only on hotfix), not on the leaf row.  
7. Deps touched → Definition + RAG + externalUrl?  
8. Preview: this desk’s localhost port (station `:3000`, wip `:3001+`). `AUTH_URL` must match. WIP desks set `WIP_DESK` (yellow chrome badge). Live only when the user says make it live.  
9. Store: same types as production; do not add a parallel DB or a new HTML stack. Kanban Online = Neon **rows** with `node_id` (JSON fallback mirrors those columns). Standards picks/holds = Neon `standards_choices` / `standards_holds`. Not one JSONB blob per leaf.  
10. Development hub Layout 1: `/d` is cards. Leaf Layout 2: Inbox \| Kanban \| Changelog \| Notes. Kanban checkbox row above buckets (default Later+Open). Capture is chrome Feedback. More options is a `ShellModal`.  
