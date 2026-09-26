---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- node scripts/tw.mjs check out/knot exits 0
- the page pins three@0.186.1 and does not use THREE.Clock (tw lint out/knot reports 0 errors and 0 warnings)
FAIL if any is missing or contradicted.
