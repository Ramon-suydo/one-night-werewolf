import { ROLES } from '@/engine';
import { RULES } from '@/lib/rules';
import { Tablet } from '../tablet';
import Link from 'next/link';
import {sealForRole} from '@/rules/seals';
import {SOLO_OBJECTIVES} from '@/rules/soloObjectives';
export default function Gallery(){return <main className="gallery"><h1>Rune tablet gallery</h1><p>Tap any tablet for its rules and an example.</p><Link className="btn alt" href="/cards">View the stone table in 3D</Link><Link className="btn alt" href="/">Back to the fire</Link><div className="gallery-grid">{ROLES.map(role=><article key={role}><Tablet role={role}/><h2>{RULES[role].name}</h2><p>{sealForRole(role).glyph} {sealForRole(role).label}</p><p>{RULES[role].power}</p><p>{RULES[role].example}</p>{SOLO_OBJECTIVES[role]&&<p>Original-role solo goal: {SOLO_OBJECTIVES[role]}</p>}</article>)}</div></main>}
