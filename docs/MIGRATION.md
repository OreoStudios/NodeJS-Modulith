# Migration tracking — SupportDesk -> OJS

- [x] Independent `@ojs/modulith` registry package
- [x] Independent `@ojs/orm` safe repository package
- [x] Tests for SQL injection inputs and invalid columns
- [ ] Migrate all SupportDesk routes to OJS modules
- [ ] Preserve existing EJS UI, sessions, database schema and functional behavior
- [ ] Replace unsafe query interpolation and enforce ticket ownership
- [ ] Implement safe knowledge-base path resolution and remove/guard admin SSRF
- [ ] Structured JSON event logging + Wazuh integration
- [ ] Prometheus /metrics, Grafana and Compose integration
- [ ] Integration and security regression test suites
- [ ] Full security audit sign-off

**Migration is not complete yet.** Framework packages have been extracted first to keep them reusable beyond SupportDesk.
