---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- node scripts/tw.mjs check out/stripes exits 0
- the page imports three/tsl and has no ShaderMaterial
FAIL if any is missing or contradicted.
