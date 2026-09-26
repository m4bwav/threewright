---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- models/big.opt.glb exists and is smaller than the input
- tw glb on the output shows no size warning, and the reply lists the decoders to wire
FAIL if any is missing or contradicted.
