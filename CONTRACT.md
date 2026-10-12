# Sentinel X — Technical contract (draft for team validation)

**Status:** proposed, not yet validated by the web developer and the cybersecurity teammate. Must be approved before launching attacks. OJS is an optional implementation detail, not a PDF requirement.

## Contract ownership

- Web: HTTP endpoints, structured JSON logs, safe instrumented SupportDesk, Prometheus /metrics, functional and load tests.
- Cyber: Wazuh Manager/Indexer/Dashboard deployment, collection of application JSONL logs, XML rules, three approved attack plans, alerts, triage and false-positive report.
- Shared: port mapping, Docker topology, test scenarios, severity mappings and runbooks.

## JSONL log contract

One compact UTF-8 JSON object **per line**. Local file `/app-logs/events.jsonl` in SupportDesk, read-only mounted on the Wazuh log collector, and emitted to container stdout. Compatible with the Wazuh JSON decoder.

| Field | Type | Required | Description |
|---|---|---|---|
| timestamp | string ISO-8601 UTC | yes | Event occurrence |
| level | string | yes | INFO/WARN/ERROR |
| event_type | string | yes | Stable event key |
| source_ip | string / null | yes | Request source, proxy only if explicitly trusted |
| user | string / null | yes | Account name, null for anonymous |
| endpoint | string / null | yes | Request path or route |
| method | string / null | yes | HTTP method |
| status_code | integer | yes | HTTP response |
| message | string | yes | Sanitized human-readable context |
| query, body | null | yes | Deliberately omitted to avoid credential / PII leakage |
| resource_id | string | optional | Ticket ID for access-denied events |
| duration_seconds | number | optional | Request duration |

Required event types: `http_request`, `auth_failure`, `auth_success`, `access_denied`, `blocked_path_traversal`, `blocked_ssrf`, `suspicious_sql_input`, `csrf_rejected`, `application_error`.

Passwords, cookies, raw URL query strings, API keys and request bodies must **never be logged**. `source_ip` may be a Docker or proxy address in a container; do not treat it as a verified public IP unless proxy settings are reviewed.

## Metrics

Prometheus text exposition at `GET /metrics`, HTTP 200. Metrics prefixed `supportdesk_`:

- `supportdesk_http_requests_total` — counter; excludes /metrics scrape itself.
- `supportdesk_http_errors_total` — counter for HTTP status >= 400.
- `supportdesk_auth_success_total`, `supportdesk_auth_failure_total` — counters.
- `supportdesk_http_status_total{code="NNN"}` — labeled counter.
- `supportdesk_http_duration_seconds` — histogram with `_bucket{le}`, `_sum`, `_count`.

Collect every 10s; Grafana source `http://prometheus:9090`.

## Ports and network

| Service | Internal | Host loopback | Role |
|---|---|---|---|
| SupportDesk | 3000 | 3000 | Web, `/health`, `/metrics` |
| Prometheus | 9090 | 9090 | Metric scraper |
| Grafana | 3000 | 3001 | Dashboard |
| Wazuh Manager | use official stack | team-defined | Log ingestion and rules |
| Wazuh Indexer | use official stack | team-defined | Alert storage |
| Wazuh Dashboard | 5601 | team-defined | Security UI |

Wazuh's actual API/TLS/agent ports must be chosen and recorded by the cybersecurity teammate once the official Docker stack is deployed.

## Environment variables

`SESSION_SECRET` (required >= 32 chars); `GRAFANA_ADMIN_PASSWORD` (required); `PORT` (default 3000); `SQLITE_PATH` (default app data dir); `LOG_FILE` (default `/app-logs/events.jsonl` in Docker); `DEMO_SEED` (1 for local demonstration only); `TRUST_PROXY` (0 by default); `COOKIE_SECURE` (1 behind local HTTPS reverse proxy).

Never commit actual secrets or production datasets.

## Alert criteria (proposals awaiting validation)

- 100102: >/= 5 `auth_failure` events from the **same source_ip** in 60s, severity 10.
- 100103: `access_denied` severity 9.
- 100104: `blocked_path_traversal` severity 8.
- 100105: `blocked_ssrf` severity 8.
- 100106: `suspicious_sql_input` severity 8.

Every scenario must be executed against the explicitly approved local Docker deployment only.

## Validation sign-off

Web dev: **pending** · Cyber teammate: **pending** · First check-in date: **pending**.
