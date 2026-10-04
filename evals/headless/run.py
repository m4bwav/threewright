"""Run the action and outcome cases headless: claude -p in a fresh workspace per run.

with: the workspace holds a copy of the repo files (skills, kb, scripts, templates, tests/fixtures),
      and a separate plugin copy is loaded with --plugin-dir, so the skills come through the Skill tool.
base: the workspace holds only the templates, fixtures and inputs, and no plugin.
Each run writes <root>/runs/<id>/trace.jsonl (stream-json) and meta.json; finished runs are
skipped, so the script resumes. Grade afterwards with grade.py.

Usage: python evals/headless/run.py [--runs 3] [--par 4] [--filter REGEX] [--root DIR] [--all]
Cases marked "redundant" in evals.json (the no-plugin baseline passes them too) are skipped unless --all.

Caveats (evergreen L-025, L-026):
- The plugin is loaded from a separate copy (<root>/plugin), never from the workspace: Claude Code
  denies edits inside a loaded plugin's folder, which blocked the runs' own writes when the
  workspace was the --plugin-dir. A pilot's permission_denials (in meta.json) should be 0.
- Runs inherit the user's home (memory, CLAUDE.md, plugins). A baseline can find the real repo
  through memory; the script warns when the repo's git status changed during the batch.
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

REPO = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SKIP = {'.git', 'node_modules', 'dist', 'evals', 'ai-docs', 'results'}
SEED = {  # outcome cases that start from an existing project
    ('threewright-games', 'outcome-1'): ('game-starter', 'out/game'),
    ('threewright-r3f', 'outcome-1'): ('r3f', 'out/r3f'),
    ('threewright-web', 'outcome-1'): ('scroll-hero', 'out/hero'),
}
TOOLS = ['Bash', 'PowerShell', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill']


def copytree(src, dst):
    shutil.copytree(src, dst, ignore=lambda d, names: [n for n in names if n in SKIP], dirs_exist_ok=True)


def prompt_of(skill, case):
    text = open(os.path.join(REPO, 'evals', skill, case, 'prompt.md'), encoding='utf-8').read()
    return text.split('---', 2)[2].strip()


def build(root, skill, case, arm, jid):
    ws = os.path.join(root, 'ws', jid)
    if os.path.exists(ws):
        shutil.rmtree(ws)
    os.makedirs(os.path.join(ws, 'tests'))
    if arm == 'with':
        for name in ('skills', 'kb', 'scripts', 'templates', 'README.md', '.claude-plugin'):
            src = os.path.join(REPO, name)
            (copytree if os.path.isdir(src) else shutil.copy2)(src, os.path.join(ws, name))
        # three for tw's offline CDN serving, linked rather than copied
        nm = os.path.join(REPO, 'dev', 'node_modules')
        if not os.path.isdir(nm):
            nm = os.path.join(REPO, 'node_modules')
        if os.name == 'nt':
            subprocess.run(['cmd', '/c', 'mklink', '/J', os.path.join(ws, 'node_modules'), nm], check=True, capture_output=True)
        else:
            os.symlink(nm, os.path.join(ws, 'node_modules'))
    else:
        copytree(os.path.join(REPO, 'templates'), os.path.join(ws, 'templates'))
    copytree(os.path.join(REPO, 'tests', 'fixtures'), os.path.join(ws, 'tests', 'fixtures'))
    copytree(os.path.join(root, 'inputs'), ws)
    seed = SEED.get((skill, case))
    if seed:
        subprocess.run(['node', os.path.join(REPO, 'scripts', 'tw.mjs'), 'new', seed[0], os.path.join(ws, seed[1])],
                       check=True, capture_output=True)
    return ws


def denials(trace):
    for line in open(trace, encoding='utf-8', errors='replace'):
        if '"type":"result"' in line.replace(' ', ''):
            try:
                return len(json.loads(line).get('permission_denials') or [])
            except ValueError:
                pass
    return None


def run(root, job):
    skill, case, arm, r = job
    jid = f'{skill}__{case}__{arm}__{r}'
    rd = os.path.join(root, 'runs', jid)
    if os.path.exists(os.path.join(rd, 'meta.json')):
        return jid, 'done earlier'
    os.makedirs(rd, exist_ok=True)
    ws = build(root, skill, case, arm, jid)
    cmd = [shutil.which('claude'), '-p', prompt_of(skill, case), '--output-format', 'stream-json', '--verbose',
           '--permission-mode', 'acceptEdits', '--allowedTools', *TOOLS, '--max-budget-usd', '6', '--no-session-persistence']
    if arm == 'with':
        # a separate copy: Claude Code denies edits inside a loaded plugin's folder, so the
        # workspace itself must not be the --plugin-dir
        cmd += ['--plugin-dir', os.path.join(root, 'plugin')]  # built once in main()
    t0 = time.time()
    trace = os.path.join(rd, 'trace.jsonl')
    with open(trace, 'w', encoding='utf-8') as f:
        try:
            code = subprocess.run(cmd, cwd=ws, stdout=f, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, timeout=1500).returncode
        except subprocess.TimeoutExpired:
            code = 'timeout'
    meta = {'skill': skill, 'case': case, 'arm': arm, 'run': r, 'ws': ws, 'exit': code,
            'seconds': round(time.time() - t0), 'denials': denials(trace)}
    json.dump(meta, open(os.path.join(rd, 'meta.json'), 'w'), indent=1)
    return jid, f"exit {code}, {meta['seconds']} s, denials {meta['denials']}"


def git_status():
    return subprocess.run(['git', 'status', '--porcelain'], cwd=REPO, capture_output=True, text=True).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--runs', type=int, default=3)
    ap.add_argument('--par', type=int, default=4)
    ap.add_argument('--filter')
    ap.add_argument('--all', action='store_true', help='include cases marked redundant')
    ap.add_argument('--root', default=os.path.join(tempfile.gettempdir(), 'threewright-evals'))
    a = ap.parse_args()
    root = os.path.realpath(a.root)
    os.makedirs(root, exist_ok=True)
    if not os.path.exists(os.path.join(root, 'inputs', 'data.csv')):
        subprocess.run(['node', os.path.join(REPO, 'evals', 'headless', 'make-inputs.mjs'), os.path.join(root, 'inputs')], check=True)
    jobs = []
    for s in sorted(os.listdir(os.path.join(REPO, 'skills'))):
        evals = json.load(open(os.path.join(REPO, 'skills', s, 'evals', 'evals.json'), encoding='utf-8'))['evals']
        redundant = {e['id'] for e in evals if e.get('redundant')}
        for case in ('action-1', 'outcome-1'):
            if case in redundant and not a.all:
                continue
            jobs += [(s, case, 'with', r) for r in range(1, a.runs + 1)]
            # curate's baseline finds the real repo through the user's memory and edits it
            if case == 'outcome-1' and s != 'threewright-curate':
                jobs.append((s, case, 'base', 1))
    if a.filter:
        jobs = [j for j in jobs if re.search(a.filter, '__'.join(map(str, j)))]
    plugin = os.path.join(root, 'plugin')  # a fresh copy per batch, loaded by every with-plugin run
    if os.path.exists(plugin):
        shutil.rmtree(plugin)
    for name in ('skills', 'kb', 'scripts', 'templates', 'README.md', '.claude-plugin'):
        src = os.path.join(REPO, name)
        (copytree if os.path.isdir(src) else shutil.copy2)(src, os.path.join(plugin, name))
    before = git_status()
    print(f'{len(jobs)} runs, root {root}', flush=True)
    with cf.ThreadPoolExecutor(a.par) as ex:
        for jid, status in ex.map(lambda j: run(root, j), jobs):
            print(jid, status, flush=True)
    if git_status() != before:
        print('WARNING: the repository changed during the batch; a run may have written to it. git status:\n' + git_status(), flush=True)


if __name__ == '__main__':
    sys.exit(main())
