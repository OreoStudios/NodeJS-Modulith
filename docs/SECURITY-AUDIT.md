# OJS / SupportDesk security audit — initial static findings

**Status: preliminary static review, NOT a complete audit.** The initial supplied SupportDesk ZIP was inspected. Findings must be verified in an isolated local environment. No third-party target testing is authorized.

| ID | Location | Risk | Remediation |
|---|---|---|---|
| SD-01 | routes/tickets.js list/search | SQL injection via string-interpolated status, priority, sort and search | Parameterized predicates; strict sort-column allowlist; regression tests |
| SD-02 | routes/tickets.js export/detail/comment | IDOR / missing ticket ownership checks | Centralize tenant- or owner-scoped queries and admin exceptions |
| SD-03 | routes/kb.js /view | Path traversal / arbitrary file reads | Resolve fixed basename allowlist and verify canonical directory boundary |
| SD-04 | routes/admin.js /fetch | SSRF including internal addresses and redirect rebinding | Prefer removing feature; otherwise strict allowlist and outbound network restrictions |
| SD-05 | routes/auth.js /login and seed data | Plaintext credential comparison | Password hashing, session rotation and login throttling |
| SD-06 | app.js | Hardcoded fallback session secret, overly broad trust proxy | Required environment secret, explicit proxy trust, cookie policy, CSRF defenses |
| SD-07 | logger / diagnostics | Incomplete structured security logging | Redact credentials, emit one JSON log per event; expose no sensitive bodies |
| SD-08 | views and user-controlled fields | Possible XSS depending on templating context | Escape on output, sanitize trusted rich HTML, CSP |
| SD-09 | dependency versions | Old package versions | Pin and audit dependencies, fix advisories |

## Validation still required

- Full route-by-route code audit with severity and reproducible tests
- Authentication/session, authorization, CSRF, XSS and SSRF regression tests
- Dependency audit and Docker container hardening review
- Dynamic testing in local Docker scope only
- Wazuh log/alert end-to-end verification and false-positive analysis

**No claim of total security or completed migration is made.**
