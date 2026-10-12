#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="$ROOT/wazuh/vendor/wazuh-docker"
SINGLE="$UPSTREAM/single-node"
for cmd in docker git python3; do command -v "$cmd" >/dev/null || { echo "$cmd required" >&2; exit 1; }; done
docker compose version >/dev/null
[[ -f "$ROOT/.env" ]] || { echo "Create .env from .env.example and replace secrets" >&2; exit 1; }
if [[ ! -f "$SINGLE/docker-compose.yml" ]]; then
  mkdir -p "$(dirname "$UPSTREAM")"
  git clone --depth 1 --branch v4.14.8 https://github.com/wazuh/wazuh-docker.git "$UPSTREAM"
fi
python3 - "$SINGLE/config/wazuh_cluster/wazuh_manager.conf" "$SINGLE/docker-compose.yml" <<'PY'
from pathlib import Path
import sys
manager=Path(sys.argv[1])
content=manager.read_text()
block="""  <!-- OJS JSONL collection -->
  <localfile>
    <log_format>json</log_format>
    <location>/var/log/supportdesk/events.jsonl</location>
  </localfile>
"""
if '<!-- OJS JSONL collection -->' not in content:
    if '</ossec_config>' not in content:
        raise SystemExit('Unexpected upstream ossec_config structure')
    manager.write_text(content.replace('</ossec_config>',block+'</ossec_config>',1))
compose=Path(sys.argv[2])
content=compose.read_text()
for port in ('1514','1515','55000','9200'):
    content=content.replace('"'+port+':'+port+'"','"127.0.0.1:'+port+':'+port+'"')
content=content.replace('"514:514/udp"','"127.0.0.1:514:514/udp"')
content=content.replace('- 443:5601','- "127.0.0.1:8443:5601"')
compose.write_text(content)
PY
cd "$ROOT"
docker compose up --build -d
cd "$SINGLE"
if [[ ! -f "$SINGLE/config/wazuh_indexer_ssl_certs/root-ca.pem" ]]; then
  docker compose -f generate-indexer-certs.yml run --rm generator
fi
export OJS_REPO_ROOT="$ROOT"
docker compose -p ojs-wazuh -f "$SINGLE/docker-compose.yml" -f "$ROOT/wazuh/compose.override.yml" up -d
echo "Start requested. Wazuh HTTPS dashboard: https://127.0.0.1:8443"
echo "Verify logs/rules and a live attack alert before treating the integration as complete."
