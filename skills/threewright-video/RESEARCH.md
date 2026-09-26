# Research: threewright-video

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: deterministic capture of three.js scenes, encoding settings and platform video specs, video tools for agents. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- Frame-exact capture needs virtual time: tw replaces performance.now, Date.now and requestAnimationFrame before page scripts, or calls the page's window.__tw.renderFrame(i, fps). Verified 2026-09-26: MP4 (H.264 yuv420p BT.709), WebM VP9, GIF, ProRes, canvas capture, frames directory, alpha in WebM and ProRes 4444.
- Motion must come from time, never per-frame constants; loops stop one step short of 360 degrees. Settled.
- Verification without watching: ffprobe fields, a tiled frame strip, blackdetect and freezedetect. Settled.
- Encoding details and platform specs: see the video research note (colour tagging, GIF tools, platform limits). Moving.

## Open questions

- The best in-page encoder path in 2026 (WebCodecs with a muxer) against CDP screenshots for speed.
- Colour transfer tagging that matches browsers across players.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `ffmpeg sRGB bt709 color_trc browser mismatch <year>`, `WebCodecs VideoEncoder muxer <year>`
- platform video specs: YouTube, X, LinkedIn, Instagram, TikTok, GitHub attachment limits

Tooling:

- `path:SKILL.md three.js` and `path:SKILL.md threejs` on GitHub code search, sorted by recently updated; skills.sh weekly installs for "three.js" and "threejs" (never all-time; exclude meta and installer skills)
- `https://registry.modelcontextprotocol.io/v0/servers?search=three` and `search=3d`; `anthropics/claude-plugins-official` and `claude-plugins-community` searched for three.js (record the tier)
- Supersession sweep: `"three.js" skill deprecated OR superseded OR archived <year>`; the archive flag on every tool already listed here

Practice:

- `"three.js" "claude code" OR codex OR cursor workflow <year>`; hn.algolia.com `three.js agent` sorted by date
- discourse.threejs.org threads on AI agents (search "AI", "LLM", "agent") since the last check

Testing:

- `path:SKILL.md three.js evals OR benchmark` on GitHub; `"three.js" LLM benchmark OR "WebDev Arena" <year>`
- `site:arxiv.org LLM 3D web generation evaluation <year>`; promptfoo or Inspect assertion types for browser output

Best sources: ffmpeg documentation, Chrome DevTools Protocol docs, platform help centres, the video research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: capture techniques, frameworks, encoding, motion quality, verification, where to get ffmpeg. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-video.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1
