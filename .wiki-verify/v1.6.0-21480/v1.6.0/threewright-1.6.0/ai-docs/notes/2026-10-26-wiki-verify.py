"""Wiki verification for threewright: every example on the GitHub wiki, run against a release tag.

    python ai-docs/notes/2026-10-26-wiki-verify.py [VERSION] > ai-docs/notes/2026-10-26-wiki-verify.out.txt

Downloads the tag's source archive from GitHub (the plugin is installed from the repository at a tag, so the
archive is what users get) into a scratch folder, never the working tree, then runs each page's commands as the
page shows them from a scratch work folder. On the pages `tw` means `node <plugin>/scripts/tw.mjs`; here it is
the downloaded tag's scripts/tw.mjs. Output sections are '## label' lines, as wikiwright's diffout and outputs
expect. Masked: the scratch paths (<work>, <plugin>), the local server port (<port>), and the numbers that
depend on timing (render calls, colours, frame times, heap, video timing).

The test models are glTF binaries written here (a one-triangle tree used by 150 nodes, the same with
EXT_mesh_gpu_instancing, and a blended double-sided card with a 1000x750 PNG), so the program needs nothing from
the repository. Fixture pages (black-mesh, stale-projection, missing-import-map, bad-shader) come from the tag's
tests/fixtures/pages. Needs Node 22+, Chrome or Chromium, ffmpeg for the video case, and the network for the
archive, npm (versions --check, npm ci in dev/) and the CDN fallback.

Also runs the 0.6.5 tag's `tw glb` on the same models, for Versions-and-Upgrading (draw calls per mesh before
0.6.6, per node from 0.6.6).
"""
import io
import json
import os
import re
import shlex
import shutil
import struct
import subprocess
import sys
import tarfile
import urllib.request
import zlib

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
VERSION = sys.argv[1] if len(sys.argv) > 1 else "0.6.7"
OLD = "0.6.5"
WORK = os.path.abspath(os.path.join(".wiki-verify", "v%s-%d" % (VERSION, os.getpid())))
os.makedirs(WORK)
NODE = shutil.which("node")
NPM = shutil.which("npm") or "npm"


def fetch(version):
    url = "https://github.com/m4bwav/threewright/archive/refs/tags/v%s.tar.gz" % version
    data = urllib.request.urlopen(url, timeout=120).read()
    dest = os.path.join(WORK, "v" + version)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as t:
        t.extractall(dest, filter="data")
    return os.path.join(dest, os.listdir(dest)[0])


PLUGIN = fetch(VERSION)
PLUGIN_OLD = fetch(OLD)
RUN = os.path.join(WORK, "run")
os.makedirs(RUN)


def mask(text):
    for path, name in ((RUN, "<work>"), (PLUGIN, "<plugin>"), (PLUGIN_OLD, "<plugin-old>"), (WORK, "<scratch>")):
        for form in (path, path.replace("\\", "/"), path.replace("\\", "\\\\")):
            text = text.replace(form, name)
    text = re.sub(r"127\.0\.0\.1:\d+", "127.0.0.1:<port>", text)
    text = re.sub(r"render calls \d+", "render calls <n>", text)
    text = re.sub(r"\d+ colours", "<n> colours", text)
    text = re.sub(r"took [0-9.]+s", "took <s>", text)
    text = re.sub(r"(packages?) in [0-9.]+m?s", r"\1 in <s>", text)
    # the template's knot turns, so its bounds height reads 2.49 or 2.5 by frame; shot's bbox top moves too
    text = re.sub(r"(bounds: center 0,0\.94,0 size 6,)[0-9.]+(,6)", r"\1<h>\2", text)
    text = re.sub(r"(against \S+ \()[0-9T:.\-]+Z\)", r"\1<time>)", text)
    text = re.sub(r"JS heap [0-9.]+ MB -> [0-9.]+ MB", "JS heap <mb> -> <mb>", text)
    text = re.sub(r"frame ms: .*", "frame ms: <timings>", text)
    text = re.sub(r"\d+ frames · [0-9.]+ fps", "<n> frames · <fps> fps", text)
    return text.rstrip()


def show(label, value):
    print("## " + label)
    print(value)
    print()


def run_line(line, plugin=PLUGIN, cwd=RUN):
    args = shlex.split(line)
    if args[0] == "tw":
        args = [NODE, os.path.join(plugin, "scripts", "tw.mjs")] + args[1:]
    elif args[0] in ("npm", "npx"):
        args = [shutil.which(args[0]) or args[0]] + args[1:]
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       timeout=600)
    return p


def snippet(label, text, plugin=PLUGIN, cwd=RUN, exit_codes=True):
    """Run a page's shell block line by line, as the page shows it, in the scratch work folder."""
    out = []
    for line in text.strip().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        p = run_line(line, plugin, cwd)
        if p.stdout.strip():
            out.append(mask(p.stdout))
        if p.stderr.strip():
            out.append("[stderr] " + mask(p.stderr))
        if exit_codes:
            out.append("[exit %d]" % p.returncode)
    show(label, "\n".join(out))


def write(name, text):
    path = os.path.join(RUN, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text.lstrip("\n"))


# ---------------------------------------------------------------- test models

def png(w, h):
    raw = b"".join(b"\x00" + b"\x80\x80\x80" * w for _ in range(h))
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def glb(name, gltf, chunks):
    """Write a GLB: chunks are byte strings laid out one after the other in the binary chunk, each a bufferView."""
    bin_ = b""
    views = []
    for c in chunks:
        views.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": len(c)})
        bin_ += c + b"\x00" * ((4 - len(c) % 4) % 4)
    gltf = dict(gltf, asset={"version": "2.0", "generator": "wiki-verify"}, bufferViews=views,
                buffers=[{"byteLength": len(bin_)}])
    js = json.dumps(gltf).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    body = struct.pack("<I4s", len(js), b"JSON") + js + struct.pack("<I4s", len(bin_), b"BIN\x00") + bin_
    with open(os.path.join(RUN, name), "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body)


TRI = struct.pack("<9f", 0, 0, 0, 1, 0, 0, 0, 2, 0)
NRM = struct.pack("<9f", 0, 0, 1, 0, 0, 1, 0, 0, 1)
UV = struct.pack("<6f", 0, 0, 1, 0, 0, 1)
POS_ACC = {"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC3", "min": [0, 0, 0], "max": [1, 2, 0]}
NRM_ACC = {"bufferView": 1, "componentType": 5126, "count": 3, "type": "VEC3"}
TREE = {"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "material": 0}]}
GREEN = {"pbrMetallicRoughness": {"baseColorFactor": [0.2, 0.6, 0.2, 1]}}

glb("forest.glb", {"scene": 0, "scenes": [{"nodes": list(range(150))}],
                   "nodes": [{"mesh": 0, "translation": [i % 15 * 2.0, 0, i // 15 * 2.0]} for i in range(150)],
                   "meshes": [TREE], "materials": [GREEN], "accessors": [POS_ACC, NRM_ACC]}, [TRI, NRM])

offsets = b"".join(struct.pack("<3f", i % 15 * 2.0, 0, i // 15 * 2.0) for i in range(150))
glb("forest-instanced.glb", {
    "scene": 0, "scenes": [{"nodes": [0]}], "extensionsUsed": ["EXT_mesh_gpu_instancing"],
    "nodes": [{"mesh": 0, "extensions": {"EXT_mesh_gpu_instancing": {"attributes": {"TRANSLATION": 2}}}}],
    "meshes": [TREE], "materials": [GREEN],
    "accessors": [POS_ACC, NRM_ACC, {"bufferView": 2, "componentType": 5126, "count": 150, "type": "VEC3"}]},
    [TRI, NRM, offsets])

glb("cards.glb", {
    "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
    "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2}, "material": 0}]}],
    "materials": [{"alphaMode": "BLEND", "doubleSided": True,
                   "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}}}],
    "textures": [{"source": 0}], "images": [{"bufferView": 3, "mimeType": "image/png"}],
    "accessors": [POS_ACC, NRM_ACC, {"bufferView": 2, "componentType": 5126, "count": 3, "type": "VEC2"}]},
    [TRI, NRM, UV, png(1000, 750)])

# ---------------------------------------------------------------- lint inputs (as the pages show them)

write("old/index.html", """
<!doctype html>
<script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.150.0/examples/js/controls/OrbitControls.js"></script>
<script>
  const renderer = new THREE.WebGLRenderer();
  renderer.physicallyCorrectLights = true;
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  const box = new THREE.BoxBufferGeometry(1, 1, 1);
</script>
""")
write("post/bloom.js", """
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
""")
write("post-fixed/bloom.js", """
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WebGLRenderTarget, HalfFloatType } from 'three';

const target = new WebGLRenderTarget(innerWidth, innerHeight, { type: HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
""")
write("wave/wave.js", """
import { BufferGeometry, Float32BufferAttribute } from 'three';

function makeWave(count) {
  const positions = new Float32Array(count * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = Math.sin(i);
  return geometry;
}
""")

for fixture in ("black-mesh", "stale-projection", "missing-import-map", "bad-shader"):
    shutil.copytree(os.path.join(PLUGIN, "tests", "fixtures", "pages", fixture), os.path.join(RUN, fixture))

# ---------------------------------------------------------------- cases

with open(os.path.join(PLUGIN, ".claude-plugin", "plugin.json"), encoding="utf-8") as f:
    version = json.load(f)["version"]
node_v = subprocess.run([NODE, "--version"], capture_output=True, text=True).stdout.strip()
show("installed", "threewright %s (tag v%s archive)\nNode %s" % (version, VERSION, node_v.lstrip("v")))

snippet("help", "tw --help", exit_codes=False)
snippet("templates", "tw templates", exit_codes=False)
snippet("doctor", "tw doctor")
snippet("kb search", 'tw kb search "transparency sorting"', exit_codes=False)
snippet("kb show transparency essentials", "tw kb show transparency-and-blending --section Essentials", exit_codes=False)
snippet("kb show models budgets", "tw kb show models-for-the-web --section Budgets", exit_codes=False)
snippet("kb list rule", "tw kb list --kind rule", exit_codes=False)
counts = {}
for kind in ("topic", "scenario", "library", "recipe", "rule"):
    p = run_line("tw kb list --kind %s" % kind)
    counts[kind] = len([l for l in p.stdout.splitlines() if l.strip()])
show("kb counts", ", ".join("%s %d" % kv for kv in counts.items()) + ", total %d" % sum(counts.values()))
rules = json.load(open(os.path.join(PLUGIN, "kb", "rules", "lint-rules.json"), encoding="utf-8"))
rules = rules.get("rules", rules) if isinstance(rules, dict) else rules
show("lint rule count", "%d rules" % len(rules))

snippet("lint old page", "tw lint old/")
snippet("lint composer", "tw lint post/")
snippet("lint composer fixed", "tw lint post-fixed/")
snippet("lint typed buffer attribute", "tw lint wave/")
snippet("lint md", "tw lint old/ --md")

snippet("glb forest", "tw glb forest.glb")
snippet("glb forest instanced", "tw glb forest-instanced.glb")
snippet("glb cards", "tw glb cards.glb")
snippet("glb strict", "tw glb cards.glb --strict")
snippet("glb json", "tw glb forest-instanced.glb --json")
snippet("glb forest 0.6.5", "tw glb forest.glb", plugin=PLUGIN_OLD)
snippet("glb cards 0.6.5", "tw glb cards.glb", plugin=PLUGIN_OLD)
snippet("glb strict 0.6.5", "tw glb cards.glb --strict", plugin=PLUGIN_OLD)
snippet("lint composer strict", "tw lint post/ --strict")
snippet("lint composer 0.6.5", "tw lint post/", plugin=PLUGIN_OLD)
old_counts = {}
for kind in ("topic", "scenario", "library", "recipe", "rule"):
    p = run_line("tw kb list --kind %s" % kind, plugin=PLUGIN_OLD)
    old_counts[kind] = len([l for l in p.stdout.splitlines() if l.strip()])
show("kb counts 0.6.5", ", ".join("%s %d" % kv for kv in old_counts.items()) + ", total %d" % sum(old_counts.values()))
old_rules = json.load(open(os.path.join(PLUGIN_OLD, "kb", "rules", "lint-rules.json"), encoding="utf-8"))["rules"]
show("lint rule count 0.6.5", "%d rules" % len(old_rules))

snippet("new", "tw new html-importmap site")
snippet("check", "tw check site/")
snippet("lint site", "tw lint site/")
snippet("check eval", 'tw check site/ --eval "renderer.info.render.calls > 0"')
snippet("check eval find", "tw check site/ --eval \"scene.getObjectByName('knot').material.color.getHexString()\"")
snippet("scene", "tw scene site/")
snippet("check save against", "tw check site/ --save before.json\ntw check site/ --against before.json")
snippet("shot", "tw shot site/ --out shot.png")
snippet("sheet", "tw sheet site/ --out sheet.png")
snippet("diff", "tw diff shot.png shot.png")
snippet("perf", "tw perf site/ --seconds 2")
snippet("video", "tw video site/ --out turn.mp4 --seconds 1 --fps 10")
snippet("check black mesh", "tw check black-mesh/")
snippet("check stale projection", "tw check stale-projection/")
snippet("check missing import map", "tw check missing-import-map/")
snippet("shaders bad shader", "tw shaders bad-shader/")
snippet("vendor dry run", "tw vendor site/ --dry-run")

# dev/ tests and the commands that read the installed three
snippet("dev npm ci", "npm ci --no-audit --no-fund", cwd=os.path.join(PLUGIN, "dev"), exit_codes=True)
snippet("deprecations", "tw deprecations")
snippet("versions check", "tw versions --check")
snippet("kb show legacy map", "tw kb show current-vs-legacy")
snippet("kb show upgrade recipe", "tw kb show upgrade-an-old-project --section Goal")
snippet("kb show ladder", "tw kb show verification-ladder --section Rule")
snippet("kb show agent tooling", "tw kb show agent-tooling --section Essentials", exit_codes=False)
snippet("kb validate", "tw kb validate --strict", cwd=PLUGIN)
# last: vendoring rewrites site/ for good
snippet("vendor then offline check", "tw vendor site/\ntw check site/ --cdn offline")
