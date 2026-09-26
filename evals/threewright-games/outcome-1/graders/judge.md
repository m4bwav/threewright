---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- npm test passes and tw check out/game/dist exits 0
- a tw check --eval run shows the score going up after the player reaches the coin
FAIL if any is missing or contradicted.
