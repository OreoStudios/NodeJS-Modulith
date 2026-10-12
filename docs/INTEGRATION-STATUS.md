# OJS / Sentinel X integration status

## Implemented in the current feature branch
- Independent, reusable @ojs/modulith and @ojs/orm packages.
- Reusable @ojs/observability and @ojs/security-events packages.
- Modular Express/EJS/SQLite SupportDesk demo with login, tickets, profile,
  knowledge base and admin routes.
- Structured JSONL logs, Prometheus /metrics and a Grafana dashboard.
- Security controls for known injection, IDOR, traversal, SSRF, XSS/CSRF risks
  and HTTP integration tests.
- Docker Compose for SupportDesk / Prometheus / Grafana.
- Official Wazuh single-node Docker bootstrap recipe, with custom XML rules.
- Draft technical contract and attack plans; reproducible traffic script.

## Verification
GitHub Actions unit/HTTP tests run; current CI additionally checks Docker build
and app health (results must be read from the latest run, not assumed).
Wazuh bootstrap is a recipe and **has NOT been tested in a real Wazuh deployment**.

## Requirements pending team execution
- CONTRACT.md signed by the team.
- Wazuh Manager/Indexer/Dashboard started and log ingestion verified.
- Custom Wazuh rules tested positive and negative, real alerts seen.
- Three attack plans executed locally with actual commands and screenshots.
- Performance/availability tests, measured false-positive rate, alert report.
- Production security audit and manual regression review.

## Migration fidelity
The feature branch recreates key original application routes using OJS,
but does not include an exact copy of the original supplied database,
every legacy template or every original behavior. Verify required course
features before claiming a complete one-to-one SupportDesk migration.
