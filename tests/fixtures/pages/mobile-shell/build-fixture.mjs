// Rebuilds index.html and manifest.webmanifest from the blocks in
// skills/threewright-games/references/mobile-shell.md. Run from the plugin root:
// node tests/fixtures/pages/mobile-shell/build-fixture.mjs
import fs from 'node:fs';
const dir = 'tests/fixtures/pages/mobile-shell/';
const md = fs.readFileSync('skills/threewright-games/references/mobile-shell.md', 'utf8');
const blocks = (lang) => [...md.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);
const [html] = blocks('html'), [js] = blocks('js'), [json] = blocks('json');
fs.writeFileSync(dir + 'manifest.webmanifest', json);
fs.writeFileSync(dir + 'index.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>fixture: mobile shell</title>
<script type="importmap">
{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js" } }
</script>
</head>
<body>
<!-- Built by build-fixture.mjs from skills/threewright-games/references/mobile-shell.md (tests/unit.test.mjs checks). -->
${html}<script type="module">
${js}</script>
</body>
</html>
`);
