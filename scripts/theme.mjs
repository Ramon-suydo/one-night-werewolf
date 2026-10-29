import fs from 'node:fs';
import {NIGHT,DAY} from '../lib/theme.mjs';
const variables=p=>Object.entries(p).map(([key,value])=>`--color-${key}:${value}`).join(';');
fs.writeFileSync('app/design-tokens.css',`:root{${variables(NIGHT)}}\n:root[data-time="day"]{${variables(DAY)}}\n`);
