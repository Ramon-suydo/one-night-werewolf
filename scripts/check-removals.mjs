import fs from 'node:fs';
const roots=['app','lib','engine','components'];const forbidden=[/Lite mode/i,/RTCPeerConnection/,/getUserMedia/,/\bTURN_/];
for(const root of roots)if(fs.existsSync(root))for(const file of fs.readdirSync(root,{recursive:true})){if(!/\.(ts|tsx|js|css)$/.test(file))continue;const path=`${root}/${file}`,s=fs.readFileSync(path,'utf8');for(const pattern of forbidden)if(pattern.test(s))throw new Error(`Removed runtime feature found in ${path}`)}
console.log('PASS: one 3D renderer; no microphone or peer-voice runtime code.');
