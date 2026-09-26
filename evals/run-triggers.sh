#!/bin/sh
# Trigger and decoy cases for every skill through claude plugin eval (no shell tools, so it runs on native Windows).
# One --case glob per call (the option keeps only its last value). Results: evals/results/<skill>-<kind>.json
cd "$(dirname "$0")/.." || exit 1
for d in skills/*/; do
  s=$(basename "$d")
  for kind in trigger decoy; do
    out="evals/results/${s#threewright-}-$kind.json"
    [ -f "$out" ] && continue
    claude plugin eval . --trust-plugin --no-publish --eval-dir "evals/$s" --case "$kind-*" --judge-model sonnet -j 4 --json "$out" >/dev/null 2>&1 || echo "failed: $s $kind"
  done
done
python evals/summarize.py
