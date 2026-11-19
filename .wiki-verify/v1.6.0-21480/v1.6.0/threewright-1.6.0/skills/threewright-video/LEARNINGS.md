# Learnings: threewright-video

Procedural lessons for [SKILL.md](SKILL.md). Research findings live in [RESEARCH.md](RESEARCH.md); every change is logged in [CHANGELOG.md](CHANGELOG.md); test runs in [TESTS.md](TESTS.md); state in `evergreen.json`. Format and write-time gate: the evergreen plugin's protocol/LEARNINGS-FORMAT.md. Retired entries go to LEARNINGS-ARCHIVE.md with a reason.

Write an entry the moment a real signal happens: a user correction, the same error twice, a discovered workaround, an environment fact, a stated preference, a failed test or a failure in use. Check existing entries first (add / update / retire / none). Trigger and Hypothesis are required. Promote after three confirmations; retire when harmful > helpful.

## Active

<!-- Entry shape:
### L-YYYYMMDD-n · date · One-line lesson in plain words
- Trigger: what happened, with dates or counts
- Hypothesis: why
- Rule: the shortest instruction that prevents the trigger
- Evidence: C-..., T-..., confirmed date
- Scope: skill | repo:<slug> | env:<name> | global
- Status: active · helpful 1 · harmful 0 · last_confirmed date
-->

### L-20260926-1 · 2026-09-26 · Put every cue in one timeline module that the page and the audio script both import
- Trigger: the Austin showdown clip (D:/m4bwa/Claude/Projects/Ai/austin-shootout-video, 2026-09-26) needed a bell, two shots, a ricochet and a fall to land on exact frames; the page and make-audio.mjs both import timeline.mjs, and the shots matched on the first recording.
- Hypothesis: with renderFrame driving the picture from time, a shared list of seconds is all the sync a synthesized soundtrack needs; separate hand-copied numbers drift after the first edit.
- Rule: for a clip with sound cues, write timeline.mjs (seconds per cue) and import it in both index.html (`import * as TL from './timeline.mjs'`) and the audio script; add `__tw.at(s)` so `tw shot --eval "__tw.at(7.8)"` can look at any cue.
- Evidence: austin-shootout-video README and stills/strip.png; ffprobe 360 frames, no blackdetect or freezedetect hits
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-26

### L-20260926-2 · 2026-09-26 · Synthesized mixes come out quiet; loudnorm them before muxing
- Trigger: two synthesized soundtracks (campfire and showdown, 2026-09-26) came out of peak normalisation at -25 LUFS integrated, because short transients (shots, pops) set the peak; the wind at first drowned the shots until it was cut to a quarter.
- Hypothesis: peak normalisation leaves transient-heavy material far below streaming loudness.
- Rule: after writing the WAV, `ffmpeg -i in.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 mix.wav` and pass mix.wav to `tw video --audio`; check with `ffmpeg -i mix.wav -af ebur128=peak=true -f null -`, and look at a `showwavespic` image to see that the cues stand above the bed.
- Evidence: showdown mix -16.7 LUFS, peak -1.4 dBFS
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-26
