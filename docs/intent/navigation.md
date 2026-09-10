# Navigation

```text
LOGIN          /login  (only public page)
HOME           /home   (five Hub cards)
├── Work       /w
│   └── sub-hubs /w/{slug}
├── Projects   /p
│   └── sub-hubs /p/{slug}   e.g. /p/fueltracker
├── Development /d   (suite: Inbox | Kanban | Changelog | Notes | Design spec)
├── Internal   /i
│   ├── Testing /i/testing
│   └── Development choices /i/dev-choices
└── System     /s
    ├── Definition /s/definition  (site map, deps, changelog)
    └── Appearance /s/appearance
```

Chrome (authenticated): **Home**, **Site network** (fast-travel), **Feedback**, **Profile**.

Site map depth (v1): Home → Hubs → sub-hubs (not inner pages). Development `/d` is the suite itself.
