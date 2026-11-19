"""Grade headless runs on evidence: the trace (Skill and Bash tool calls) and the workspace on disk.

Usage: python evals/headless/grade.py [--root DIR] [--out evals/results/headless-latest.md]
Action cases: the evidence named in skills/<skill>/evals/evals.json (a Bash regex, or a file with a content regex).
Outcome cases: the checks in OUTCOME below, rerun by the grader; the reply is only used where the case asks
for something said (a cause, alt text), never as proof that something was done.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import tempfile

REPO = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TW = ['node', os.path.join(REPO, 'scripts', 'tw.mjs')]


def sh(cmd, cwd=None, timeout=600):
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout,
                           shell=isinstance(cmd, str))
        return p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return 'timeout', ''


def tw_ok(ws, *args):
    code, out = sh(TW + list(args), cwd=ws)
    return code == 0, (out.strip().splitlines() or [''])[-1][:100]


def read(ws, rel):
    p = os.path.join(ws, rel)
    return open(p, encoding='utf-8', errors='replace').read() if os.path.exists(p) else None


def ffprobe(path):
    code, out = sh(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                    'stream=codec_name,pix_fmt,width,height,nb_read_frames', '-of', 'json', path])
    try:
        return json.loads(out)['streams'][0]
    except (ValueError, KeyError, IndexError):
        return {}


def o_main(ws, t):
    ok1, l1 = tw_ok(ws, 'check', 'out/knot')
    code, lint = sh(TW + ['lint', 'out/knot'], cwd=ws)
    html = read(ws, 'out/knot/index.html') or ''
    ok = ok1 and '0 error(s), 0 warning(s)' in lint and '0.186.1' in html and not re.search(r'\bTHREE\.Clock\b|new Clock\(', html)
    return ok, f'check {ok1}; lint {lint.strip().splitlines()[-1] if lint.strip() else "?"}; pins 0.186.1 {"0.186.1" in html}'


def o_assets(ws, t):
    a, b = os.path.join(ws, 'models/big.glb'), os.path.join(ws, 'models/big.opt.glb')
    if not os.path.exists(b):
        return False, 'models/big.opt.glb missing'
    code, out = sh(TW + ['glb', b], cwd=ws)
    warn = [l for l in out.splitlines() if re.search(r'\bMB:|triangles:|warn', l, re.I)]
    ok = os.path.getsize(b) < os.path.getsize(a) and not warn
    return ok, f'{os.path.getsize(b) // 1024} KB vs {os.path.getsize(a) // 1024} KB; glb warnings {len(warn)}'


def o_curate(ws, t):
    ran = any(re.search(r'kb\s+validate\s+--strict', c) for c in t['bash'])
    counts = bool(re.search(r'\b\d+ entries', t['result']))
    return ran and counts, f'validate --strict in trace {ran}; counts in reply {counts}'


def o_debug(ws, t):
    ok1, l1 = tw_ok(ws, 'check', 'out/fixed')
    cause = bool(re.search(r'light', t['result'], re.I))
    return ok1 and cause, f'check out/fixed {ok1}; cause (lights) named {cause}'


def o_docs(ws, t):
    p = os.path.join(ws, 'docs/scatter.gif')
    if not os.path.exists(p):
        return False, 'docs/scatter.gif missing'
    return os.path.getsize(p) < 5 * 1048576, f'{os.path.getsize(p) // 1024} KB'


def o_games(ws, t):
    g = os.path.join(ws, 'out/game')
    code, _ = sh('npm test', cwd=g, timeout=900)
    ok2, l2 = tw_ok(ws, 'check', 'out/game/dist')
    proof = any(re.search(r'\bcheck\b[^\n]*(--eval|--actions)', c) for c in t['bash'])
    return code == 0 and ok2 and proof, f'npm test {code}; check dist {ok2}; check --eval/--actions in trace {proof}'


def o_r3f(ws, t):
    code, _ = sh('npm run build', cwd=os.path.join(ws, 'out/r3f'), timeout=900)
    ok2, l2 = tw_ok(ws, 'check', 'out/r3f/dist')
    return code == 0 and ok2, f'build {code}; check dist {ok2}'


def o_shaders(ws, t):
    ok1, l1 = tw_ok(ws, 'check', 'out/stripes')
    html = read(ws, 'out/stripes/index.html') or ''
    tsl = 'three/tsl' in html and 'ShaderMaterial' not in html
    return ok1 and tsl, f'check {ok1}; three/tsl and no ShaderMaterial {tsl}'


def o_video(ws, t):
    s = ffprobe(os.path.join(ws, 'out/turn.mp4'))
    ok = s.get('codec_name') == 'h264' and s.get('pix_fmt') == 'yuv420p' and str(s.get('nb_read_frames')) == '90' and (s.get('width'), s.get('height')) == (1280, 720)
    return ok, f'{s or "no file"}'


def o_web(ws, t):
    ok1, l1 = tw_ok(ws, 'check', 'out/hero', '--reduced-motion')
    return ok1, f'check --reduced-motion {ok1}'


OUTCOME = {'threewright': o_main, 'threewright-assets': o_assets, 'threewright-curate': o_curate, 'threewright-debug': o_debug,
           'threewright-docs': o_docs, 'threewright-games': o_games, 'threewright-r3f': o_r3f, 'threewright-shaders': o_shaders,
           'threewright-video': o_video, 'threewright-web': o_web}


def parse(trace):
    t = {'skills': [], 'bash': [], 'denials': 0, 'cost': 0, 'result': ''}
    for line in open(trace, encoding='utf-8', errors='replace'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('type') == 'assistant':
            for c in e['message'].get('content', []):
                if c.get('type') == 'tool_use' and c['name'] == 'Skill':
                    t['skills'].append(c['input'].get('skill', ''))
                elif c.get('type') == 'tool_use' and c['name'] in ('Bash', 'PowerShell'):
                    t['bash'].append(c['input'].get('command', ''))
        elif e.get('type') == 'result':
            t['cost'] = e.get('total_cost_usd') or 0
            t['result'] = e.get('result') or ''
            # edits to the loaded plugin copy are refused by design (a skill asking to log a lesson);
            # only a denial inside the workspace hampers the run
            t['denials'] = sum(1 for d in e.get('permission_denials') or [] if not re.search(r'[\\/]plugin[\\/]', json.dumps(d.get('tool_input', {}))))
    return t


def action(ws, t, ev):
    if ev.get('type') == 'file':
        body = read(ws, ev['path'])
        return body is not None and bool(re.search(ev.get('regex', ''), body)), f"{ev['path']} {'has' if body and re.search(ev.get('regex', ''), body) else 'lacks'} /{ev.get('regex', '')}/"
    pattern = ev['input_match'].replace('tw\\.mjs', '(?:tw\\.mjs|\\$TW|\\bTW)')  # skills call the CLI as $TW
    hit = [c for c in t['bash'] if re.search(pattern, c)]
    if hit:
        return True, 'trace: ' + re.search(pattern, hit[0]).group(0)
    alt = ev.get('or')
    if alt and alt.get('type') == 'file' and os.path.exists(os.path.join(ws, alt['path'])):
        return True, 'file: ' + alt['path']
    return False, 'no evidence'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.join(tempfile.gettempdir(), 'threewright-evals'))
    ap.add_argument('--out', default=os.path.join(REPO, 'evals', 'results', 'headless-latest.md'))
    a = ap.parse_args()
    cases = {}
    for f in glob.glob(os.path.join(REPO, 'skills', '*', 'evals', 'evals.json')):
        d = json.load(open(f, encoding='utf-8'))
        for e in d['evals']:
            cases[(d['skill'], e['id'])] = e
    rows, summary = [], {}
    for meta_path in sorted(glob.glob(os.path.join(os.path.realpath(a.root), 'runs', '*', 'meta.json'))):
        m = json.load(open(meta_path))
        t = parse(os.path.join(os.path.dirname(meta_path), 'trace.jsonl'))
        want = m['skill']
        fired = any(s.split(':')[-1] == want for s in t['skills'])
        if m['case'] == 'action-1':
            ok, why = action(m['ws'], t, cases[(m['skill'], 'action-1')]['evidence'])
        else:
            ok, why = OUTCOME[m['skill']](m['ws'], t)
        if m['arm'] == 'with':
            ok = ok and fired and t['denials'] == 0
        k = (m['skill'], m['case'], m['arm'])
        summary.setdefault(k, [0, 0])
        summary[k][0] += bool(ok)
        summary[k][1] += 1
        rows.append(f"| {m['skill']} | {m['case']} | {m['arm']} {m['run']} | {'yes' if fired else 'no'} | {t['denials']} | {'PASS' if ok else 'FAIL'} | {why} | ${t['cost']:.2f} |")
        print(rows[-1], flush=True)
    total = sum(float(r.rsplit('$', 1)[1].rstrip(' |')) for r in rows)
    lines = ['# Headless eval results', '', f'Graded by evals/headless/grade.py. {len(rows)} runs, ${total:.2f}. A with-plugin run passes only if the Skill tool fired the expected skill, no tool call inside its workspace was denied (edits to the loaded plugin copy are refused by design), and the evidence held. Baselines (base) show what happens without the plugin.', '',
             '## By case', '', '| skill | case | arm | passed |', '|---|---|---|---|']
    lines += [f'| {s} | {c} | {arm} | {p}/{n} |' for (s, c, arm), (p, n) in sorted(summary.items())]
    lines += ['', '## Runs', '', '| skill | case | run | Skill tool | denied | result | evidence | cost |', '|---|---|---|---|---|---|---|---|'] + rows
    open(a.out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print('wrote', a.out)


if __name__ == '__main__':
    main()
