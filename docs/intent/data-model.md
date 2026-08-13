# Data model

## Addressing

| Field | Example | Notes |
| ----- | ------- | ----- |
| hubPrefix | `p` | `w` Work, `p` Projects, `i` Internal, `s` System |
| slug | `fueltracker` | URL path segment |
| title | Fuel Tracker | Human display |
| code | `A3F91C` | Opaque 6-hex; badge colour `#A3F91C` only |

## Access modes

`shared` | `restricted` | `per_user` — see business-rules.

## Status

`sketched` | `building` | `live`

## Dependencies (System → Definition)

name, type, expiresAt, externalUrl, notes → RAG (amber ≤3 months, red ≤14 days / expired).