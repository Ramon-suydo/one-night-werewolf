import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('docs/UX_AUDIT.before.json','utf8'));
let text='# HUD audit\n\nFour-player production browser capture at 360, 768 and 1280 pixels. Full inventories are in UX_AUDIT.before.json; screenshots are test-results/audit-PHASE-WIDTH.png. The inventory includes off-screen controls in the scrollable panel.\n\n| Phase | Controls at 360 / 768 / 1280 |\n|---|---|\n';
for(const [phase,rows] of Object.entries(data))text+=`| ${phase} | ${rows.map(r=>r.controls.length).join(' / ')} |\n`;
text+='\n## Before: every labeled control\n';for(const [phase,rows]of Object.entries(data))text+=`\n### ${phase}\n\n${[...new Set(rows[0].controls)].join('; ')}.\n`;
text+='\n## Findings\n\nThe centered panel blocks the fire. Role explanations repeat the guidance line. Room settings, role roster, accessibility settings, character controls and management remain below active gameplay. Day and vote have several competing calls to action. The phase headings repeat narrator captions. A right drawer and one context action replace this structure in the HUD stage. World-space avatar/card interaction replaces lists.\n';
fs.writeFileSync('docs/UX_AUDIT.md',text);
