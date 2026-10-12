'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tmpdir } = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createObservability } = require('../src');
test('structured JSON events omit untrusted secret-bearing inputs', () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'ojs-observability-'));
  try {
    const obs = createObservability({ logFile: path.join(dir, 'logs.jsonl') });
    const data = obs.write({ event_type: 'auth_failure', status_code: 401,
      query: 'password=oops', body: 'password=oops', user: 'test', source_ip: '127.0.0.1' });
    assert.equal(data.query, null);
    assert.equal(data.body, null);
    assert.equal(data.event_type, 'auth_failure');
    assert.match(obs.metrics(), /# TYPE supportdesk_http_requests_total counter/);
    assert.equal(JSON.parse(fs.readFileSync(obs.logFile, 'utf8')).status_code, 401);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
