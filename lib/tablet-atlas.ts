import { ROLES, type Role } from '@/engine';
import { RULES } from './rules';
import { NIGHT } from './theme.mjs';
export const CELL_W=72, CELL_H=120, ATLAS_COLS=4, ATLAS_ROWS=4;
let atlas: HTMLCanvasElement | null = null;
export function tabletIndex(role: Role | 'back') { return role === 'back' ? ROLES.length : ROLES.indexOf(role); }
export function drawEmblem(ctx: CanvasRenderingContext2D, role: Role, x=0, y=0, size=32) {
  ctx.save(); ctx.translate(x,y); ctx.scale(size/32,size/32); ctx.strokeStyle=RULES[role].accent; ctx.fillStyle=RULES[role].accent; ctx.lineWidth=2; ctx.lineJoin='miter'; ctx.stroke(new Path2D(RULES[role].path)); ctx.restore();
}
export function getTabletAtlas() {
  if (atlas) return atlas;
  const canvas=document.createElement('canvas'); canvas.width=CELL_W*ATLAS_COLS; canvas.height=CELL_H*ATLAS_ROWS;
  const ctx=canvas.getContext('2d')!; ctx.imageSmoothingEnabled=false;
  [...ROLES,'back' as const].forEach((role,index)=>{
    ctx.save(); ctx.translate(index%4*CELL_W,Math.floor(index/4)*CELL_H);
    const arch=new Path2D('M4 114L4 30L8 22L12 14L20 6L28 2L44 2L52 6L60 14L68 30L68 110L64 116L10 116L8 112Z');
    ctx.fillStyle=NIGHT.stone;ctx.fill(arch);ctx.save();ctx.clip(arch);
    for(let row=0;row<12;row++)for(let col=0;col<7;col++){ctx.fillStyle=(row*7+col*11)%5===0?NIGHT.slate:NIGHT.deep;ctx.globalAlpha=.13;ctx.fillRect(col*11,row*11,8,9)}ctx.globalAlpha=1;
    ctx.strokeStyle=NIGHT.slate;ctx.lineWidth=2;ctx.stroke(arch);ctx.strokeStyle=NIGHT.deep;ctx.strokeRect(9,30,54,76);
    ctx.fillStyle=NIGHT.ice;for(let i=0;i<6;i++){ctx.fillRect(7,35+i*11,2,5);ctx.fillRect(63,37+i*11,2,3);ctx.fillRect(6,36+i*11,5,1)}
    if(role==='back') {ctx.strokeStyle=NIGHT.ice;ctx.lineWidth=2;ctx.stroke(new Path2D('M36 34Q9 39 19 65Q30 86 50 69Q62 51 44 45Q28 39 27 55Q26 68 39 65Q48 62 41 55'));}
    else {ctx.fillStyle=NIGHT.ivory;ctx.textAlign='center';ctx.save();ctx.translate(14,62);ctx.rotate(-Math.PI/2);ctx.font='6px Silkscreen,monospace';ctx.fillText(RULES[role].name,0,0,63);ctx.restore();drawEmblem(ctx,role,19,40,38);ctx.fillStyle=RULES[role].accent;ctx.font='12px monospace';ctx.fillText(RULES[role].glyph,36,27);
      const team=RULES[role].team;ctx.fillStyle=team==='Village'?NIGHT.green:team==='Werewolf'?NIGHT.coral:NIGHT.purple;ctx.beginPath();if(team==='Village')ctx.arc(36,96,8,0,Math.PI*2);else if(team==='Tanner'){ctx.moveTo(36,86);ctx.lineTo(45,96);ctx.lineTo(36,106);ctx.lineTo(27,96);ctx.closePath()}else{for(let k=0;k<12;k++){const a=k/12*Math.PI*2,r=k%2?6:10;const x=36+Math.sin(a)*r,y=96+Math.cos(a)*r;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}ctx.fill();ctx.fillStyle=NIGHT.ink;ctx.fillRect(34,94,4,4);
    }ctx.restore();ctx.restore();
  }); atlas=canvas;return canvas;
}
