# Sentinel X — Wazuh integration for OJS

## What is automated

OJS supplies native JSON-decoder-compatible structured application events and
local XML rule IDs 100101–100106. The bootstrap script uses the **official**
Wazuh 4.14.8 single-node Docker distribution (Manager + Indexer + Dashboard),
generates self-signed certificates, mounts the SupportDesk log volume read-only
and activates JSON file collection in the official Manager configuration.

This is a deployment **recipe**; no real Wazuh alerts or successful Docker
startup are claimed until your team runs it and records evidence.

## Required resources

Docker Engine with Docker Compose v2, git, Python 3, a reasonably powerful
computer (at least 4 GB free RAM, more recommended) and sufficient disk space.
For Linux Wazuh Indexer requires vm.max_map_count >= 262144:

    sudo sysctl -w vm.max_map_count=262144

## Start the complete stack

1. Copy .env.example to .env at the OJS root, set SESSION_SECRET to a random
   value of at least 32 characters and set a strong GRAFANA_ADMIN_PASSWORD.
2. Run: bash wazuh/bootstrap.sh
3. Wait for Wazuh indexer and Dashboard to become available.
4. Wazuh: https://127.0.0.1:8443 (self-signed certificate warning expected).
5. SupportDesk: http://127.0.0.1:3000.
6. Grafana: http://127.0.0.1:3001 and Prometheus: http://127.0.0.1:9090.

The official Wazuh setup uses demo credentials; the bootstrap script binds
Wazuh ports to localhost only and **does not rotate the upstream passwords**.
NEVER expose this setup publicly or reuse these defaults for real deployments.

## Confirm actual Wazuh detection

- Check health and logs for Manager, Indexer, Dashboard and the SupportDesk app.
- Inspect the mounted file /var/log/supportdesk/events.jsonl in the Manager.
- Ensure the Wazuh logcollector process can read that file; if not, adjust
  permissions deliberately rather than running the service publicly.
- Run /var/ossec/bin/wazuh-logtest inside the Manager.
- Paste one line from samples/auth_failure.json; expect decoded JSON fields
  and custom rule 100101. Paste auth_success.json; rule 100101 must not fire.
- Send six invalid logins to the local SupportDesk app as documented in
  docs/SENTINEL-X-RUNBOOK.md and check rule 100102 severity 10.
- Inspect Manager alerts.json and Wazuh Dashboard for 100102/100104/100106.
- Record screenshots, decoded JSON fields, time taken, severity and source IP.

## Files

- local_rules.xml — custom detection rules.
- compose.override.yml — add a read-only application JSONL volume and rules to
  the official single-node Wazuh Manager.
- bootstrap.sh — fetches pinned v4.14.8 and prepares the official stack.
- samples/ — positive and negative test data.
- ossec.conf.fragment.xml — manual reference for an alternate agent setup.

## Limitations

Wazuh installation and real alert checks require Docker and hardware
resources unavailable to the automated unit-test environment. The team must
confirm configuration compatibility, file permissions and alert timing.
