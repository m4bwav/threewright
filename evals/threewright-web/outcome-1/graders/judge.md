---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- node scripts/tw.mjs check out/hero --reduced-motion exits 0
- the reply quotes both check results
FAIL if any is missing or contradicted.
