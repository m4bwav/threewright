"""Summarize claude plugin eval result files: one line per case, pass counts per arm."""
import glob
import json
import os
import sys

files = sys.argv[1:] or sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'results', '*.json')))
total_cost = 0.0
for f in files:
    j = json.load(open(f, encoding='utf8'))
    total_cost += j.get('costUsd') or 0
    suite = os.path.basename(f).rsplit('.', 1)[0]
    for c in j['cases']:
        line = [f"{suite:32} {c['name']:10}"]
        for arm in ('with', 'without'):
            runs = c['arms'].get(arm) or []
            if not runs:
                continue
            # Grader verdicts, not the arm score: tool_used Skill graders are "with-only" indicators under ablation.
            ok = sum(1 for r in runs if r.get('graders') and all(g['passed'] for g in r['graders']))
            err = sum(1 for r in runs if r.get('error'))
            line.append(f"{arm} {ok}/{len(runs)}" + (f" ({err} errored)" if err else ''))
        print('  '.join(line))
print(f'cost ${total_cost:.2f}')
