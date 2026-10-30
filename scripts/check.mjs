import {spawnSync} from 'node:child_process';
// Render diagnostics are included only in this local verification build.
// Vercel's ordinary `npm run build` leaves them disabled.
for(const task of ['lint','typecheck','test','loadtest','build','test:e2e']){
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',task],{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_AVATAR_DEBUG:'1'}});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
