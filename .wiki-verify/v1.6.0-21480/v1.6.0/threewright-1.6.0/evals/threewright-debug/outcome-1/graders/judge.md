---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- node scripts/tw.mjs check out/fixed exits 0
- the reply names the cause with the check line that showed it
FAIL if any is missing or contradicted.
