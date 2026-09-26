---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- npm run build in out/r3f exits 0
- node scripts/tw.mjs check out/r3f/dist exits 0
FAIL if any is missing or contradicted.
