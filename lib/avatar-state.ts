// This function accepts only information already authorized for this viewer.
export function eyesOpen(phase:string,id:string,me:string,awake:boolean,teammates:readonly string[],connected=true){
 return connected&&(phase!=='night'||awake&&(id===me||teammates.includes(id)));
}
export function playerTargets(role:string|null|undefined,ids:readonly string[],me:string){
 return role&&['seer','robber','troublemaker','doppel'].includes(role)?ids.filter(id=>id!==me):[];
}
