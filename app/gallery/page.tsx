import { ROLES } from '@/engine';
import { RULES,teamMarker } from '@/lib/rules';
import { Tablet } from '../tablet';
import Link from 'next/link';
export default function Gallery(){return <main className="gallery"><h1>Rune tablet gallery</h1><p>Tap any tablet for its rules and an example.</p><Link className="btn alt" href="/">Back to the fire</Link><div className="gallery-grid">{ROLES.map(role=><article key={role}><Tablet role={role}/><h2>{RULES[role].name}</h2><p>{teamMarker(role)} {RULES[role].team}</p><p>{RULES[role].power}</p><p>{RULES[role].example}</p></article>)}</div></main>}
