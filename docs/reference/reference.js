// Scene, sprite and synthesis code ported from werewolf.html.
// Lifecycle, reduced motion and volume controls are supplied by this wrapper.
export function mountReference() {
let volume=.55,duckLevel=1,lite=true,effectsVolume=.5;
const intervals=[];
const setInterval=(callback,delay)=>{const id=window.setInterval(callback,delay);intervals.push(id);return id;};

const $=s=>document.querySelector(s),app=$('#app');
const sh=a=>{a=a.slice();for(let i=a.length;i>1;){const j=Math.floor(Math.random()*i--);[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>s.replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
let AC;const beep=(f=440,d=.08)=>{if(!mus.on||!effectsVolume)return;try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.value=f;g.gain.value=.08*effectsVolume;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}};
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const btn=(t,f,c='')=>{const b=E('button','btn '+c,t);b.onclick=()=>{beep(520);f(b)};return b};
const row=(...k)=>{const r=E('div','row');r.append(...k);return r};
const panel=(...k)=>{app.innerHTML='';const p=E('div','panel');p.append(...k);app.append(p);app.scrollTop=0;return p};

/* ---------- sprites (10x10 pixel art) ---------- */
const P={k:'#1a1226',w:'#f4efe0',r:'#d6455d',g:'#8a8fa8',y:'#ffd35a',b:'#4a7bd6',p:'#7b4fbf',n:'#8a5a3c',s:'#f0b98d',G:'#4fae6a'};
const SP={
wolf:["k........k","kk......kk","kgk....kgk","kggggggggk","kgyggggygk","kgggkkgggk",".kggkkggk.",".kgwkkwgk.","..kwrrwk..","...kkkk..."],
seer:["..........","..pppppp..",".pwwwwwwp.","pwwwyywwwp","pwwykkywwp","pwwwyywwwp",".pwwwwwwp.","..pppppp..","..........",".........."],
robber:["...kkkk...","..kkkkkk..","kkkkkkkkkk",".ssssssss.",".kwkkkkwk.",".ssssssss.","..ssrrss..","...ssss...","..kkkkkk..",".........."],
troublemaker:["..........","......rr..","rrrrrrrrr.","......rr..","..........","..bb......",".bbbbbbbbb","..bb......","..........",".........."],
drunk:["....nn....","....nn....","....GG....","...GGGG...","..GGGGGG..","..GwGGGG..","..GGGGGG..","..GGGGGG..","..GGGGGG..","...GGGG..."],
insomniac:["...yyyy...","..yyy.....",".yyy......",".yyy......",".yyy......",".yyy......","..yyy.....","...yyyy...",".......yy.",".........."],
minion:["..nnnnnn..",".nnnnnnnn.","nnnnnnnnnn","nnkkkkkknn","nnkrkkrknn","nnnkkkknnn",".nnkwwknn.","..nnnnnn..","...nnnn...","....kk...."],
mason:["..........","rrrr.rrrr.","rrrr.rrrr.","..........","rr.rrrr.rr","rr.rrrr.rr","..........","rrrr.rrrr.","rrrr.rrrr.",".........."],
hunter:["n........n","nn......nn",".nn....nn.","..nnwwnn..","....yy....","....gg....","....nn....","....nn....","...nnnn...","...nnnn..."],
tanner:["..nnnnnn..",".nnnnnnnn.","nnnnnnnnnn","nnkknnkknn","nnbnnnnbnn","nnnkkkknnn","nnknnnnknn",".nnnnnnnn.","..rrrrrr..","...rrrr..."],
villager:["....rr....","...rrrr...","..rrrrrr..",".rrrrrrrr.","..nnnnnn..","..nyynkk..","..nyynkk..","..nnnnkk..","..nnnnnn..","GGGGGGGGGG"]};
function sprite(r){const c=E('canvas');c.width=c.height=10;const x=c.getContext('2d');
 if(r==='back'){for(let j=0;j<10;j++)for(let i=0;i<10;i++){const d=Math.abs(i-4.5)+Math.abs(j-4.5);x.fillStyle=d===4?P.y:d<2?P.p:'#3a2a6a';x.fillRect(i,j,1,1)}}
 else SP[r].forEach((row,y)=>[...row].forEach((ch,i)=>{if(P[ch]){x.fillStyle=P[ch];x.fillRect(i,y,1,1)}}));return c}
const R={wolf:['Werewolf','You hunt in the dark. Wolves know each other.'],seer:['Seer','Peek at one player, or at two center cards.'],robber:['Robber','Swap cards with another player and see your new role.'],troublemaker:['Troublemaker','Swap two other players’ cards without looking.'],drunk:['Drunk','Swap with a center card. You won’t see it.'],insomniac:['Insomniac','At dawn you learn what you ended up as.'],villager:['Villager','No powers. Sniff out the wolves.'],minion:['Minion','You side with the wolves. You see them, but they don’t see you.'],mason:['Mason','Find your fellow Mason. You recognize each other.'],hunter:['Hunter','If you are banished, your vote takes someone down with you.'],tanner:['Tanner','You hate your life. You only win if you are banished.']};
const card=(r,up)=>{const d=E('div','card'+(up?' up':'')),i=E('div','in'),f=E('div','f'),b=E('div','b');f.append(sprite(r),E('span','',R[r][0]));b.append(sprite('back'));i.append(f,b);d.append(i);return d};
const flip=(c,ms=300)=>setTimeout(()=>c.classList.add('up'),ms);

/* ---------- the scene ---------- */
const cv=$('#sc'),X=cv.getContext('2d'),H=120;let W,sky={d:0,td:0,m:.1,tm:.1};
const fit=()=>{W=Math.max(60,Math.round(H*innerWidth/innerHeight));cv.width=W;cv.height=H};addEventListener('resize',fit);fit();
const setSky=(d,m)=>{sky.td=d;sky.tm=m};
// Nested blends must accept the rgb() string returned by the preceding blend.
const mix=(a,b,t)=>{const p=s=>s.startsWith('rgb')?s.match(/\d+/g).map(Number):[1,3,5].map(i=>parseInt(s.substr(i,2),16)),A=p(a),B=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join()+')'};
const q=(x,y,w,h)=>X.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),h);
const stars=Array.from({length:50},()=>({x:Math.random(),y:Math.random()*.55,o:Math.random()*6}));
function pine(x,y,d){X.fillStyle=mix('#0e2a2c','#1d4a3c',d);for(let k=0;k<16;k++){const hw=(k%5)*.6+1+Math.floor(k/5)*1.8;q(x-hw,y-18+k,hw*2,1)}X.fillStyle='#3a2418';q(x-1,y-2,2,3)}
function draw(t){
 sky.d+=(sky.td-sky.d)*.05;sky.m+=(sky.tm-sky.m)*.04;const d=sky.d;
 for(let b=0;b<12;b++){X.fillStyle=mix(mix('#120a2a','#2a1a52',b/11),mix('#3b3f8a','#ffb27a',b/11),d);q(0,b*8,W,8)}
 stars.forEach(s=>{if(Math.floor(t/400+s.o)%5){X.globalAlpha=1-d;X.fillStyle='#fff';q(s.x*W,s.y*H,1,1)}});X.globalAlpha=1;
 const sx=W*(.12+.76*sky.m),sy=62-Math.sin(Math.PI*sky.m)*44;
 X.fillStyle=mix('#e8e4ff','#ffd35a',d);for(let dy=-7;dy<=7;dy++){const hw=Math.floor(Math.sqrt(49-dy*dy));q(sx-hw,sy+dy,hw*2,1)}
 X.fillStyle='rgba(0,0,0,.15)';q(sx-3,sy-2,2,2);q(sx+1,sy+2,3,2);
 const hw0=Math.max(18,W*.2);
 [[.1,44,1],[.38,56,1.2],[.66,46,1],[.92,52,1.1]].forEach(([fx,h,s])=>{const cx=fx*W,w=hw0*s;
  for(let k=0;k<=h;k++){const y=92-h+k,hw=k*w/h;
   X.fillStyle=k<h*.16?mix('#8a8fd0','#fff0e0',d):mix('#241a4a','#4a3e84',d);q(cx-hw,y,hw,1);
   X.fillStyle=k<h*.16?mix('#aab0f0','#fff8ee',d):mix('#33286a','#7d68b8',d);q(cx,y,hw,1);
   if(k>=h*.16){X.fillStyle=mix('#2c2058','#6252a0',d);q(cx+hw*.55,y,hw*.45,1)}}});
 X.fillStyle=mix('#140d24','#1f2a2e',d);q(0,92,W,H-92);
 [[.04,98],[.1,104],[.9,100],[.96,96],[.22,108],[.78,106]].forEach(([f,y])=>pine(f*W,y,d));
 const cx=W/2,fl=Math.floor(t/90);
 X.globalAlpha=.1+.04*Math.sin(t/120);X.fillStyle='#ff8a3c';[26,18].forEach(r=>{for(let dy=-r;dy<=r;dy++){const hw=Math.floor(Math.sqrt(r*r-dy*dy));q(cx-hw,104+dy,hw*2,1)}});X.globalAlpha=1;
 X.fillStyle='#5a3a24';q(cx-9,107,18,3);q(cx-6,105,12,2);
 [[-3,'#d6455d',5],[0,'#ff8a3c',4],[3,'#d6455d',3]].forEach(([o,c,w],i)=>{const h=8+((fl*7+i*5)%6);X.fillStyle=c;q(cx+o-w/2,107-h,w,h);X.fillStyle='#ffd35a';q(cx+o-1,107-h*.55,2,h*.55)});
 X.fillStyle='#ffd35a';for(let i=0;i<6;i++)q(cx+Math.sin(t/300+i*2)*9,100-((t/40+i*13)%40),1,1);
}


/* ---------- music: slow generative campfire ambience ---------- */
const mus={on:true};
const SC=[[220,261.6,293.7,329.6,392,440,523.3,587.3],[261.6,293.7,329.6,392,440,523.3,587.3,659.3]],BS=[[55,82.4,110],[65.4,98,130.8]];
function musicStart(){
 if(mus.c)return;
 try{
  const c=mus.c=new AudioContext(),m=mus.m=c.createGain(),lp=c.createBiquadFilter(),dl=c.createDelay(1),fb=c.createGain();
  m.gain.value=.55;lp.type='lowpass';lp.frequency.value=1100;dl.delayTime.value=.45;fb.gain.value=.4;
  lp.connect(m);lp.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(m);const volumeGain=c.createGain();volumeGain.gain.value=volume/.55;mus.volumeGain=volumeGain;m.connect(volumeGain);volumeGain.connect(c.destination);
  const dr=BS[0].map((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=i?'triangle':'sine';o.frequency.value=f;o.detune.value=i*5;g.gain.value=.045;o.connect(g);g.connect(lp);o.start();return o});
  let ix=3;
  setInterval(()=>{
   if(!mus.on||c.state!=='running')return;
   const mood=sky.td>.5?1:0,t=c.currentTime;
   dr.forEach((o,i)=>o.frequency.setTargetAtTime(BS[mood][i],t,2));
   if(Math.random()<.35)return;
   ix=Math.max(0,Math.min(7,ix+Math.floor(Math.random()*5)-2));
   const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=SC[mood][ix];
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.02);g.gain.exponentialRampToValueAtTime(.0005,t+1.6);
   o.connect(g);g.connect(lp);o.start(t);o.stop(t+1.7);
  },620);
 }catch(e){}
}




let frame,last=0,disposed=false;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function loop(t){if(disposed)return;if(lite&&t-last>83){draw(reduced.matches?0:t);last=t}frame=requestAnimationFrame(loop)}
frame=requestAnimationFrame(loop);
window.addEventListener('pointerdown',musicStart,{once:true});
return {sprite,R,beep,
  setSky(d,m){setSky(d,m);if(reduced.matches){sky.d=d;sky.m=m;}},
  setMusic(on){musicStart();mus.on=on;if(mus.m)mus.m.gain.setTargetAtTime(on?.55:0,mus.c.currentTime,.2);},
  setVolume(value){volume=value;if(mus.volumeGain)mus.volumeGain.gain.setTargetAtTime(value/.55*duckLevel,mus.c.currentTime,.1);},
  duck(value){duckLevel=value;if(mus.volumeGain)mus.volumeGain.gain.setTargetAtTime(volume/.55*value,mus.c.currentTime,.12);},
  setLite(value){lite=value;cv.style.display=value?'block':'none';},
  setEffects(value){effectsVolume=value;},
  dispose(){disposed=true;cancelAnimationFrame(frame);intervals.forEach(window.clearInterval);window.removeEventListener('resize',fit);window.removeEventListener('pointerdown',musicStart);if(mus.c)mus.c.close();if(AC)AC.close();}
};
}
