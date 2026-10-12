# OJS Wazuh integration

Use the **official Wazuh Docker single-node** stack (Manager, Indexer, Dashboard). Mount the SupportDesk JSONL log volume read-only into an agent or Manager. Merge `ossec.conf.fragment.xml` into its real configuration; copy `local_rules.xml` into the Manager rules folder, validate with `wazuh-logtest`, restart and check alerts. Match component versions.

**Not yet done:** integrated Wazuh Compose topology, agent registration, actual alerts, and end-to-end testing. Do not report this detection chain as operational before verification.
