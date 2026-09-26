---
type: llm
name: 'expectations'
---

PASS if the reply meets every one of these:
- ffprobe shows h264, yuv420p, 90 frames, 1280x720
- the reply names the driver and the verification checks
FAIL if any is missing or contradicted.
