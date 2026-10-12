# SupportDesk -> OJS migration tracking

- [x] @ojs/modulith and @ojs/orm independent framework packages.
- [x] Security and observability packages that can be reused on other apps.
- [x] Module-based auth, tickets, dashboard, profile, KB and admin routes.
- [x] SQLite models, transactions, migrations and owner-restricted ticket reads.
- [x] Structured JSON security event logs and /metrics endpoint.
- [x] Prometheus and Grafana config in Docker Compose.
- [x] Dockerfile, educational EJS views and HTTP integration tests.
- [x] Wazuh XML detection rules and official-stack bootstrap recipe.
- [ ] Verify original SupportDesk's complete behavioral and dataset equivalence.
- [ ] Run full Docker stack and confirm Wazuh receives JSON log lines.
- [ ] Validate all XML rule severities and create proof of real alerts.
- [ ] Performance, availability and false-positive measurement.
- [ ] Complete security audit and regression scan.

**Migration of main flows is implemented; comprehensive equivalence and the
full EPITECH project are not yet validated.**
