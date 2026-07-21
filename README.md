# The Questionable Magic Items Shop

A fictional RPG item shop built to demonstrate REST API design, workflow automation, and integration engineering — end to end, from database to a public-facing storefront.

Every item is genuinely magical. Every side effect is real. No refunds.

**Live:**
- Shop &mdash; `https://mshop.eitikobata.com`
- Restock Wagon (admin/demo tool) &mdash; `https://wagon.eitikobata.com`

---

## What this project demonstrates

This isn't just a CRUD demo. It's built as a small, self-contained case study in the kind of work that sits between support/CX operations and automation engineering:

- **API design without a traditional backend framework** &mdash; the REST API is built entirely in [n8n](https://n8n.io), using webhooks, conditional branching, and a Postgres integration, instead of Express/Django/etc.
- **System-to-system integration** &mdash; a standalone script reads raw seed data and populates the API the way a real migration or integration job would, rather than seeding the database directly.
- **Operational resilience for a public demo** &mdash; a scheduled n8n workflow wipes and restores the dataset every hour, so the API can stay public and testable without manual maintenance or requiring authentication.
- **A batch operation, both ways** &mdash; the storefront's cart checkout (`DELETE`) and the Wagon's bulk import (`POST`) are the same integration pattern in mirror image: loop over a list, call the API once per item, report success/failure.

## Architecture

```
seed.sql ──▶ import-seed.js ──▶ POST /items ──┐
                                                ├──▶ n8n API ──▶ Postgres (items table)
     Restock Wagon (browser) ──▶ POST /items ──┘         ▲
                                                           │
                              Shop (browser) ──▶ GET/DELETE /items
                                                           │
                         Scheduled reset (n8n, hourly) ────┘
                         wipes + re-seeds the table automatically
```

Four independent pieces, connected only by HTTP and a shared JSON shape (`name`, `price`, `rarity`, `side_effect`). None of them know the others exist beyond that contract — which is the point: it mirrors how real systems integrate.

## Project structure

```
questionable-magic-items-shop/
├── frontend/          The shop storefront (GET, cart, checkout via DELETE)
│   └── assets/        Banner image + background music
├── wagon/              The Restock Wagon (browser-based bulk POST tool)
│   └── assets/         Banner image
├── import/              import-seed.js (Node.js one-off seeding script)
│   └── seed.sql         The 50 items
└── workflow/            n8n workflow exports + the canonical seed.sql
    ├── rpg-shop-api-workflow.json    The REST API (POST/GET/PUT/DELETE)
    └── reset-items-hourly.json       Scheduled wipe + reseed
```

## Tech stack

| Layer | Tool |
|---|---|
| API | n8n (webhooks, Postgres node, conditional logic) |
| Database | PostgreSQL |
| Scheduled maintenance | n8n (Schedule Trigger) |
| Storefront & Wagon | Vanilla HTML / CSS / JavaScript (no framework, no build step) |
| Import tooling | Node.js (native `fetch`, zero dependencies) |
| Hosting | EasyPanel (Docker/NixPacks), static per-project deploys under subdomains |

No frontend framework was used on purpose &mdash; the goal of this project is to demonstrate integration and API thinking, not frontend engineering. Keeping the client side to plain HTML/CSS/JS keeps that focus honest.

## Design decisions worth knowing about

**The API is REST-shaped, not strictly RESTful.** Resource identifiers are passed via query string (`?id=`) rather than as part of the URL path (`/items/5`). This is a common simplification in low-code API tooling like n8n, and a deliberate trade-off, not an oversight.

**There's no authentication on the write endpoints.** Instead of a login gate, the dataset self-heals: a scheduled workflow wipes and reseeds the table every hour. This removes the friction of a demo needing credentials, while keeping the underlying data safe from permanent corruption. It also means the write endpoints are intentionally rate-limited by dataset size, not by user identity.

**The cart (shop) and the bulk importer (Wagon) share one pattern.** Both take a list, loop over it, and call the API once per item with a running success/failure count. It's the same integration logic used in the opposite direction &mdash; a small detail, but a deliberate one.

## Running it yourself

1. **API** &mdash; import `workflow/rpg-shop-api-workflow.json` into your own n8n instance, connect a Postgres credential, activate the workflow.
2. **Reset schedule** &mdash; import `workflow/reset-items-hourly.json` the same way. Adjust the interval in the Schedule Trigger node if you don't want hourly resets.
3. **Seed the database** &mdash; either run the Postgres `CREATE TABLE` node manually once, or run `import/import-seed.js` (`node import-seed.js --dry-run` first, then for real) against your webhook URL.
4. **Frontend** &mdash; open `frontend/index.html` directly, or deploy the folder as a static site. Update `API_URL` at the top of `frontend/script.js` first.
5. **Wagon** &mdash; same idea, `wagon/index.html`, `API_URL` in `wagon/script.js`.

## Author

Built by Eiti Kobata as a portfolio project, transitioning from 18 years in customer experience toward CX Ops, Support Ops, and automation engineering roles.

- GitHub: [@eitikobata](https://github.com/eitikobata)
- LinkedIn: https://www.linkedin.com/in/eiti-kobata-ab5ba7214/
