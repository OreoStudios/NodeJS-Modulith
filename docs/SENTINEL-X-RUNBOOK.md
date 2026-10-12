# Sentinel X — Web developer runbook

This is the web side of the EPITECH project, using OJS as a reusable library. The submitted deliverable must contain the application; the OJS framework alone is not enough.

## 1. Install and run

```bash
cp .env.example .env
# Set strong random SESSION_SECRET and GRAFANA_ADMIN_PASSWORD
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
docker compose -f compose.yml logs -f supportdesk
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/metrics
```

SupportDesk: http://127.0.0.1:3000; Prometheus: http://127.0.0.1:9090; Grafana: http://127.0.0.1:3001.
Local demo credentials are listed on the login page and **must never be deployed publicly**. `DEMO_SEED=0` disables demo seed creation.

## 2. Reproducible tests

```bash
npm install
npm test
npm run test:web
node examples/supportdesk/scripts/normal-traffic.js
```

The traffic script is for preliminary debugging only; it must be calibrated to send **realistic authenticated traffic** before you measure a false-positive rate. Record traffic duration, request mix, volume, expected errors and test timestamps.

## 3. Detectability and handoff

```bash
docker compose -f compose.yml exec supportdesk sh -lc "tail -n 10 /app-logs/events.jsonl"
```

Tell the cybersecurity teammate the log location and contract; they configure the Wazuh JSON ingestion and custom XML rules. Test delivery in this order: application file -> Wazuh decoded fields -> custom rule -> Wazuh dashboard alert.

## 4. Deliverables: no automatic pass claim

- `CONTRACT.md`: technical contract awaiting signature.
- Logs + metrics + EJS UI: implemented as an OJS example, awaiting Docker smoke tests.
- Wazuh: XML rules drafted; official Wazuh stack installation and alert verification **not done**.
- Three Attack Plans: templates for team review, **not validated nor executed**.
- Runbooks and test scripts: drafts; evidence/screenshots and actual results required.
- Performance, availability, false-positive rate: **not measured**.
- Complete audit: **not certified**; see SECURITY-AUDIT.md.
- Final demonstration: **to be prepared as a team**.

The previous educational SupportDesk dataset was replaced with a smaller local seed. If preserving the original dataset is required, import and verify it separately before claiming full equivalence.
