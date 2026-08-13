# Navigation

```text
LOGIN          /login  (only public page)
HOME           /home   (four Hub cards)
├── Work       /w
│   └── sub-hubs /w/{slug}
├── Projects   /p
│   └── sub-hubs /p/{slug}   e.g. /p/fueltracker
├── Internal   /i
│   ├── Ideas  /i/ideas
│   ├── Notes  /i/notes
│   └── Testing /i/testing
└── System     /s
    ├── Definition /s/definition  (site map, deps, changelog)
    └── Appearance /s/appearance
```

Chrome (authenticated): **Home**, **Site network** (fast-travel), **Profile**.

Site map depth (v1): Home → Hubs → sub-hubs (not inner pages).