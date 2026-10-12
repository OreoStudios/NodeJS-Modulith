# Sentinel X — proposed Attack Plans

**Unvalidated drafts.** Team must approve each plan *before* the attack. Scenarios must remain within the local Dockerized SupportDesk service; no external IPs, production domains or third-party scans.

## Attack Plan — Brute-force login attempts

### Rules of engagement
Local SupportDesk only, loopback network, test accounts, bounded to 6 requests in 60 seconds. Stop immediately if an out-of-scope service is affected.

### Scope
POST /login

### Attack vectors
Password guessing (MITRE ATT&CK T1110 / T1110.001). Server must refuse invalid passwords. Repeated failures are the signal.

### Tools used
curl or scripted local HTTP requests; Docker logs; Wazuh `wazuh-logtest`.

### Success criteria
At least one alert rule ID 100102, severity >= 10, within 2 minutes of last failed request; same source IP correlation. Preserve timestamps, observed fields and screenshot.

### Stop criteria
6 test attempts, alert observed, or 2-minute timeout, whichever occurs first.

### MITRE ATT&CK mapping
T1110.001 — Password Guessing.

## Attack Plan — SQL injection probes on ticket search

### Rules of engagement
Local Docker app only. One harmless SQL-injection-looking string in a normal search field. No database modifications.

### Scope
POST /tickets/search (must authenticate and include anti-CSRF token).

### Attack vectors
SQL injection probe: `' OR 1=1 --`. Expected behavior: application treats as data and logs `suspicious_sql_input`.

### Tools used
curl, browser devtools, `wazuh-logtest`.

### Success criteria
Alert rule ID 100106, severity >= 8, within 2 minutes of request; no unauthorized ticket returned and no database mutation.

### Stop criteria
One probe and one control search or 2-minute timeout.

### MITRE ATT&CK mapping
T1190 — Exploit Public-Facing Application (attempt, not successful compromise).

## Attack Plan — Knowledge-base path traversal

### Rules of engagement
Local Docker app only. Test for blocked traversal; do not exfiltrate real secrets or use sensitive third-party paths.

### Scope
GET /kb/view?doc=..%2F..%2Fetc%2Fpasswd (on local container only).

### Attack vectors
Path traversal probe. Expected: HTTP 404, `blocked_path_traversal` logged.

### Tools used
curl, Wazuh `wazuh-logtest`, dashboards.

### Success criteria
Alert rule ID 100104, severity >= 8, within 2 minutes; request rejected and no file disclosed.

### Stop criteria
One probe and one control request, or 2-minute timeout.

### MITRE ATT&CK mapping
T1005 — Data from Local System (attempt only).

## Evidence required for each scenario

After team validation, create an individual runbook under `docs/runbooks/` recording commands, sanitized outputs, dates/times, request IP, decoded log fields, matched rule ID, severity, dashboard alert and false-positive discussion. No real result is asserted here.
