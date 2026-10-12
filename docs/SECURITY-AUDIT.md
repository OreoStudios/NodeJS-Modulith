# OJS / SupportDesk — preliminary security review

**Not a full security audit or certification.** The supplied SupportDesk is
an educational vulnerable application. Testing may only target the approved
local Docker environment.

| Risk | Original issue | OJS migration mitigation | What remains |
|---|---|---|---|
| SQL injection | Search / sorting interpolated SQL | ORM bound values and model fields; defensive search | Dynamic fuzz tests / code review |
| IDOR | Ticket export/reads not owner-scoped | Ownership checks on exports/details/comments | Full authorization matrix |
| Path traversal | KB file path under user control | Fixed basename + canonical path check | Symlink and TOCTOU review |
| SSRF | Admin server-side URL fetch | Remote fetch disabled, security event emitted | Network egress restrictions |
| Credential exposure | Demo plaintext credentials | Salted scrypt hashes and session regeneration | Rate limiting, MFA, secret rotation |
| CSRF | State changes not protected | CSRF token checked on POST, including login | SameSite/proxy and UX review |
| XSS | Untrusted user content in EJS | Escaped templates and regression tests | Full template/output audit, CSP |
| Logging | No shared event contract | JSONL sanitized body/query and type conventions | Disk rotation and PII retention policy |
| Sessions | Unsafe defaults | Required secret, httpOnly and sameSite cookies | Replace MemoryStore, TLS, persistence |
| Dependencies | Age/vulnerabilities unknown | Workspace modernized | SCA review, pinning and updates |
| Wazuh | No end-to-end alerts | XML rules and official Docker bootstrap | Real deployment and detection verification |

Automated HTTP tests cover specific regression samples, not comprehensive
pentesting. Browser-based access tests, dependency scanning, container runtime
audit, network boundaries, concurrent access testing and Wazuh alert evidence
must still be performed.

No ORM can make an entire application 100% secure; OJS is defensive by design.
