---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- npm test passes and tw check out/game/dist exits 0
- a tw check run with --eval or --actions is in the trace
FAIL if any is missing or contradicted.
