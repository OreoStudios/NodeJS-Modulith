# Sentinel X — Final validation checklist

## Functional testing
Run: npm install && npm run test:all
Record routes exercised, passing assertions and actual coverage of critical
endpoints: /login, /dashboard, /tickets, /tickets/search, /tickets/:id,
/tickets/:id/export, /tickets/:id/comment, /profile, /kb, /kb/view,
/admin/fetch, /metrics and /health.

## Non-functional validation
1. Performance: use the deterministic normal traffic script with a fixed
   duration/volume, collect CPU, RAM, response latency and HTTP rates.
2. Availability: restart services and record health checks/recovery time.
3. Security: run SQLi, traversal, access-control, XSS and CSRF regression tests
   and a dependency audit; record actual findings, do not claim a full audit.
4. False positives: establish normal script **before** measuring; choose a
   fixed interval, record all alerts, classify true/false positives and
   publish the calculation and evidence.
5. Wazuh: confirm Manager, Indexer, Dashboard, native JSON decoder,
   custom XML rule matching and *real* end-to-end alert.
6. Grafana: demonstrate actual Prometheus scrapes and time-series under load.

## Final artifacts
[ ] CONTRACT.md reviewed and signed by developer and cybersecurity teammate.
[ ] All Docker services, including Wazuh, reproducibly deployed.
[ ] At least three approved plans, runbooks with commands/observations/alerts.
[ ] Versioned XML detection rules and Grafana/Prometheus configurations.
[ ] Functional/nonfunctional test report with stated coverage.
[ ] Realistic traffic script, measured false positives, alert qualification.
[ ] Setup/usage documentation and live demonstration.

This file is a checklist, NOT a statement of completed testing.
