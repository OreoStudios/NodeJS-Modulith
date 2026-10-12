# Sentinel X — Reproducible false-positive measurement

The normal traffic generator is intentionally authenticated, deterministic,
non-destructive and avoids malicious input. Run on the isolated local
SupportDesk, **after** all custom Wazuh rules are enabled and functional.

1. Agree on an observation interval with the cybersecurity teammate
   (for example 10 minutes) and document UTC start/end.
2. Set DURATION_SECONDS and REQUESTS_PER_SECOND in the environment.
3. Run: DURATION_SECONDS=600 REQUESTS_PER_SECOND=3 node examples/supportdesk/scripts/normal-traffic.js
4. Save the printed JSON report (volume, HTTP status distribution, latency).
5. In Wazuh Dashboard filter that exact time window for the SupportDesk source.
6. Investigate *every* generated alert and label it true-positive, false-positive
   or indeterminate with a reason.
7. Decide whether reporting false-positive alerts / total generated alerts,
   or false alarms / benign requests, and document the denominator.
   Both are distinct metrics; use the definition agreed by the team.
8. Re-run only if traffic configuration changes; record all changes.

Report template:

| Field | Actual measured value |
|---|---|
| Start UTC | TODO |
| End UTC | TODO |
| Requests | TODO |
| Wazuh alert count | TODO |
| True positives | TODO |
| False positives | TODO |
| Indeterminate | TODO |
| False-positive metric/denominator | TODO |
| Measured rate | TODO |
| Interpretation / proposed rule tuning | TODO |

**No rate can be claimed until live Wazuh alerts and normal traffic have been measured.**
