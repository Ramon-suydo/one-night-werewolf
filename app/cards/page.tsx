'use client';
import {Canvas} from '@react-three/fiber';
import {Card3D} from '@/components/Card3D';
import {ROLES} from '@/engine';
import Link from 'next/link';
import './gallery.css';
export default function StoneGallery(){return <main className="stone-gallery"><header><h1>The rune collection</h1><p>Twelve original emblems, carved in stone.</p><Link className="btn alt" href="/gallery">Rules &amp; role gallery</Link><Link className="btn alt" href="/">Return to your fire</Link></header><div data-testid="card3d-gallery" className="stone-gallery-world"><Canvas frameloop="demand" orthographic camera={{position:[0,0,10],zoom:90}} dpr={1} gl={{antialias:false,alpha:false,powerPreference:'low-power'}}><color attach="background" args={['#140d2e']}/>{ROLES.map((role,i)=><group key={role} position={[(i%4-1.5)*1.45,(1-Math.floor(i/4))*1.8,0]}><Card3D id={role} face={{role}} state="up" selectable reduced/></group>)}</Canvas></div></main>}
