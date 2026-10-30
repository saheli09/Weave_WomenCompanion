// Turns the raw captures in design-export/out/raw into Claude Design artboards
// (decision 2026-10-30). Usage: node design-export/assemble.mjs <asset-map.json> <out-root>
// The asset map gives each local path (/icons/x.svg) its uploaded address (/_blob/<id>),
// plus "css" for the app's stylesheet. Writes <out-root>/project/canvas.json and one
// <id>.dc.html per screen. Main.dc.html (the "how to read this" board) is written by hand.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [mapPath, outRoot] = process.argv.slice(2);
const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const project = join(outRoot, 'project');
mkdirSync(project, { recursive: true });

const SECTIONS = [
  ['launch', 'First launch'],
  ['cycle', 'Cycle tracker'],
  ['pregnancy', 'Pregnancy'],
  ['newborn', 'Newborn'],
  ['period', 'Period returns'],
  ['toddler', 'Toddler and pregnant again'],
  ['everywhere', 'Everywhere'],
];
// Keep the screens in the order screens.ts lists them.
const ORDER = [...readFileSync(join(here, 'screens.ts'), 'utf8').matchAll(/\{ id: '([^']+)', section:/g)].map((m) => m[1]);

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Lora:ital,wght@0,400;0,500;0,600;1,400&amp;display=swap';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function artboard(raw) {
  const rules = [];
  let html = raw.html;
  // Image sources point at the uploaded copies.
  html = html.replace(/src="(\/[^"]+)"/g, (m, p) => {
    if (!map[p]) throw new Error(`${raw.id}: no upload for ${p}`);
    return `src="${map[p]}"`;
  });
  // Inline url() is not allowed on the canvas: move those declarations into a class in <helmet>.
  html = html.replace(/<([a-z][a-z0-9-]*)([^>]*?) style="([^"]*url\([^"]*)"/g, (m, tag, attrs, style) => {
    const decls = style.split(';').map((d) => d.trim()).filter(Boolean);
    const withUrl = decls.filter((d) => d.includes('url('));
    const rest = decls.filter((d) => !d.includes('url('));
    const cls = `dc-asset-${rules.length}`;
    rules.push(`.${cls}{${withUrl.map((d) => d.replace(/url\(["']?(\/[^"')]+)["']?\)/g, (_, p) => `url(${map[p]})`).replace(/&quot;/g, '"')).join(';')}}`);
    const merged = /class="/.test(attrs) ? attrs.replace(/class="/, `class="${cls} `) : `${attrs} class="${cls}"`;
    return `<${tag}${merged}${rest.length ? ` style="${rest.join('; ')}"` : ''}`;
  });
  if (html.includes('{{')) throw new Error(`${raw.id}: "{{" would read as a hole`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(raw.title)}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="${map.css}">
</head>
<body>
<x-dc>
<helmet>
<link href="${FONTS}" rel="stylesheet">
<style>
body{margin:0;background:#faf8f5}
${rules.join('\n')}
</style>
</helmet>
${html}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":402,"height":${raw.height}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
}

const raws = Object.fromEntries(readdirSync(join(here, 'out', 'raw')).map((f) => {
  const r = JSON.parse(readFileSync(join(here, 'out', 'raw', f), 'utf8'));
  return [r.id, r];
}));

const W = 402, GAP_X = 80, GAP_Y = 120, PER_ROW = 6;
const boards = { 'Main.dc.html': { x: 0, y: 0, w: 900, h: 1180, title: 'Start here', page: 'start' } };
const order = ['Main.dc.html'];
const notes = { 'start-title': { x: 0, y: -300, text: 'Weave: every screen', kind: 'title1', maxW: 900, page: 'start' } };

for (const [section, name] of SECTIONS) {
  const ids = ORDER.filter((id) => raws[id]?.section === section);
  let y = 0;
  for (let i = 0; i < ids.length; i += PER_ROW) {
    const row = ids.slice(i, i + PER_ROW);
    row.forEach((id, j) => {
      const r = raws[id];
      const file = `${id}.dc.html`;
      writeFileSync(join(project, file), artboard(r));
      boards[file] = { x: j * (W + GAP_X), y, w: W, h: r.height, title: `${r.title} · ${r.persona === 'fresh' ? 'new install' : r.persona}`, page: section };
      order.push(file);
    });
    y += Math.max(...row.map((id) => raws[id].height)) + GAP_Y + 140;
  }
  notes[`${section}-title`] = { x: 0, y: -300, text: name, kind: 'title1', maxW: PER_ROW * (W + GAP_X) - GAP_X, page: section };
}

const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') },
  title: 'Weave app',
  launch: { view: 'canvas', page: 'start' },
  pages: [{ id: 'start', name: 'Start here' }, ...SECTIONS.map(([id, name]) => ({ id, name }))],
  boards,
  order,
  notes,
  designSystems: [],
};
writeFileSync(join(project, 'canvas.json'), JSON.stringify(canvas, null, 1));
console.log(`${order.length - 1} screen artboards + Main; canvas.json written`);
