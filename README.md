# OJS Modulith

A reusable, independent Node.js modular-monolith toolkit, including **OJS ORM** and an example SupportDesk application.

> Early development: not security audited for production. All security guarantees require threat-specific tests and review.

## Workspace

- `packages/modulith` — dependency graph and lifecycle for named modules
- `packages/orm` — SQLite repository layer with parameterized values and schema-controlled identifiers
- `examples/supportdesk` — migration target for the Sentinel X SupportDesk sample
- `docs/SECURITY-AUDIT.md` — scoped audit findings, remediation and verification tracking

The original SupportDesk pedagogical vulnerabilities must not be silently represented as safe. Keep attack exercises on an isolated local test instance.
