---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- tw kb validate --strict was run (trace)
- the reply gives its counts
FAIL if any is missing or contradicted.
