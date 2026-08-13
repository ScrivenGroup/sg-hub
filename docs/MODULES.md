# Adding a sub-hub (desktop or mobile framing)

1. Add a `RegistryNode` in `src/core/registry/seed.ts` (hubPrefix, slug, title, 6-hex code, accessMode, status).  
2. Add route under `src/app/{w|p|i|s}/...`.  
3. Use `SubHubShell` for sketched products; put development plan in changelog seed / `data/changelogs.json`.  
4. Site map + Site network pick up children via registry automatically.  
5. Run change checklist in `src/core/checklist.md`.

Do not invent one-off chrome. Theme via Appearance tokens; hex colours the badge only.