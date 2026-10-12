'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

function createObservability(options = {}) {
  const file = options.logFile || process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'events.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  const counts = buckets.map(() => 0);
  let total = 0, errors = 0, successes = 0, failures = 0, durationSum = 0;
  const statuses = new Map();
  function write(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: event.level || 'INFO',
      event_type: event.event_type || 'application_event',
      source_ip: event.source_ip || null,
      user: event.user || null,
      endpoint: event.endpoint || null,
      method: event.method || null,
      status_code: Number(event.status_code) || 0,
      message: event.message || '',
      // Never log passwords, tokens, session cookies or arbitrary request bodies.
      query: null, body: null
    };
    if (event.resource_id != null) entry.resource_id = String(event.resource_id);
    if (event.duration_seconds != null) entry.duration_seconds = Number(event.duration_seconds);
    const json = JSON.stringify(entry);
    process.stdout.write(json + '\n');
    fs.appendFileSync(file, json + '\n', { encoding: 'utf8', mode: 0o600 });
    return entry;
  }
  function middleware(req, res, next) {
    const start = performance.now();
    req.securityEvent = (event_type, attrs = {}) => {
      if (event_type === 'auth_success') successes++;
      if (event_type === 'auth_failure') failures++;
      return write({
        ...attrs, event_type, source_ip: req.ip || req.socket.remoteAddress,
        user: attrs.user || req.session?.username || null,
        endpoint: req.path, method: req.method,
        status_code: attrs.status_code || res.statusCode,
        level: attrs.level || (event_type === 'auth_success' ? 'INFO' : 'WARN')
      });
    };
    res.on('finish', () => {
      if (req.path === '/metrics') return;
      total++;
      if (res.statusCode >= 400) errors++;
      const key = String(res.statusCode);
      statuses.set(key, (statuses.get(key) || 0) + 1);
      const duration = (performance.now() - start) / 1000;
      durationSum += duration;
      for (let i = 0; i < buckets.length; i++) if (duration <= buckets[i]) counts[i]++;
      write({ event_type: 'http_request', source_ip: req.ip,
        user: req.session?.username, endpoint: req.route?.path || req.path,
        method: req.method, status_code: res.statusCode,
        duration_seconds: Number(duration.toFixed(6)), message: 'HTTP request finished' });
    });
    next();
  }
  function metrics() {
    const lines = [];
    function counter(name, description, count) {
      lines.push('# HELP ' + name + ' ' + description, '# TYPE ' + name + ' counter', name + ' ' + count);
    }
    counter('supportdesk_http_requests_total', 'Completed non-metrics HTTP requests', total);
    counter('supportdesk_http_errors_total', 'HTTP responses with status >= 400', errors);
    counter('supportdesk_auth_success_total', 'Successful login attempts', successes);
    counter('supportdesk_auth_failure_total', 'Failed login attempts', failures);
    lines.push('# HELP supportdesk_http_status_total HTTP requests by response status',
      '# TYPE supportdesk_http_status_total counter');
    for (const [status, value] of statuses) lines.push('supportdesk_http_status_total{code="' + status + '"} ' + value);
    lines.push('# HELP supportdesk_http_duration_seconds Request latency',
      '# TYPE supportdesk_http_duration_seconds histogram');
    for (let i = 0; i < buckets.length; i++)
      lines.push('supportdesk_http_duration_seconds_bucket{le="' + buckets[i] + '"} ' + counts[i]);
    lines.push('supportdesk_http_duration_seconds_bucket{le="+Inf"} ' + total,
      'supportdesk_http_duration_seconds_sum ' + durationSum,
      'supportdesk_http_duration_seconds_count ' + total);
    return lines.join('\n') + '\n';
  }
  return Object.freeze({ middleware, metrics, write, logFile: file });
}
module.exports = { createObservability };
