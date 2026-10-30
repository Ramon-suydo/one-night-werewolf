// Stable, public cosmetic IDs. These contain no game information.
export const CLOAK_PALETTE = {
 gold:'#ffd35a',blue:'#4a7bd6',green:'#4fae6a',purple:'#7b4fbf',red:'#d6455d',brown:'#8a5a3c',silver:'#8a8fa8',ivory:'#f4efe0',teal:'#35b9ae',coral:'#f28d71',
} as const;
export const HAT_IDS=['pointed','cap','tall','brim','crown','none'] as const;
export const FACE_IDS=['plain','beard','smile','wide','scar','sleepy'] as const;
export type Appearance={cloakId:keyof typeof CLOAK_PALETTE;hatId:typeof HAT_IDS[number];faceId:typeof FACE_IDS[number]};
export const CLOAK_IDS=Object.keys(CLOAK_PALETTE) as Appearance['cloakId'][];
export const DEFAULT_APPEARANCE:Appearance={cloakId:'gold',hatId:'pointed',faceId:'plain'};
export function validAppearance(value:unknown):value is Appearance{
 if(!value||typeof value!=='object')return false;const a=value as Appearance;
 return Object.hasOwn(CLOAK_PALETTE,a.cloakId)&&HAT_IDS.includes(a.hatId)&&FACE_IDS.includes(a.faceId);
}
// Numeric cosmetics are accepted only when reading pre-upgrade persisted data.
export function normalizeAppearance(value:unknown):Appearance{
 if(validAppearance(value))return{cloakId:value.cloakId,hatId:value.hatId,faceId:value.faceId};
 const a=(value||{}) as {cloak?:number;hat?:number;face?:number};
 return{cloakId:CLOAK_IDS[a.cloak??0]||'gold',hatId:HAT_IDS[a.hat??0]||'pointed',faceId:FACE_IDS[a.face??0]||'plain'};
}
export function appearanceToMaterials(value:Appearance|null|undefined){
 if(!value||!validAppearance(value))return{cloak:'#808080',hat:'#808080',face:'#808080',hash:'808080:808080:808080'};
 const cloak=CLOAK_PALETTE[value.cloakId],hat=value.hatId==='crown'?'#ffd35a':cloak,face='#f0b98d';
 return{cloak,hat,face,hash:[cloak,hat,face].map(v=>v.slice(1)).join(':')};
}
export function assignAppearance(roster:{left:boolean;appearance:Appearance}[],requested:unknown,duplicates=false):Appearance{
 const a=normalizeAppearance(requested),taken=new Set(roster.filter(p=>!p.left).map(p=>normalizeAppearance(p.appearance).cloakId));
 if(!duplicates)a.cloakId=CLOAK_IDS.find(id=>!taken.has(id))||a.cloakId;
 return a;
}
