---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- tw kb validate --strict was run (trace) and its counts are in the reply
- the reply lists stale or unverified entries or says there are none
FAIL if any is missing or contradicted.
