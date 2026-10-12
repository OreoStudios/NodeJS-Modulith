# Single Compose Sentinel X environment (Wazuh + OJS)

This is an alternative to the two-stack Wazuh bootstrap. It uses **one**
`compose.full.yml` file containing SupportDesk, Prometheus, Grafana, Wazuh
Manager, Indexer and Dashboard. Wazuh's v4.14.8 official configuration files
and certificates must exist before Docker Compose can start.

```bash
cp .env.example .env
# Change both session and Grafana secrets in .env.
OJS_PREPARE_ONLY=1 bash wazuh/bootstrap.sh
docker compose -f compose.full.yml config --quiet
docker compose -f compose.full.yml up -d --build
docker compose -f compose.full.yml ps
```

Use `https://127.0.0.1:8443` for Wazuh and
`http://127.0.0.1:3001` for Grafana. Manager receives the same read-only
JSONL log volume emitted by SupportDesk; the Wazuh XML rules are mounted
at `/var/ossec/etc/rules/ojs_rules.xml`. The bootstrap adjusts the Manager
configuration to read this JSON file.

Wazuh Indexer requires adequate host RAM and Linux vm.max_map_count >= 262144.
The official template ships demo credentials: **LOCAL LAB ONLY; do not expose
to the internet**.

This compose config was assembled from official Wazuh v4.14.8 sample
(GPLv2) and has **not** been end-to-end Docker-tested in this environment.
The team must confirm XML rule loading, actual alerts, dashboard filters,
false-positive rate, and final live demo.
