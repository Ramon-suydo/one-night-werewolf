export const SOUND_CUES={
 ui:[520,390,.07,'triangle'],rune:[330,660,.16,'sine'],crack:[130,40,.18,'sawtooth'],shuffle:[180,220,.12,'triangle'],deal:[180,750,.18,'sine'],charge:[110,660,.6,'sine'],flip:[280,560,.12,'triangle'],burst:[90,420,.25,'sine'],chisel:[1400,900,.025,'square'],seal:[90,45,.2,'triangle'],swoosh:[550,160,.2,'sine'],peek:[440,660,.18,'triangle'],slide:[200,320,.16,'sine'],swap:[270,540,.24,'triangle'],slam:[75,30,.3,'sine'],vote:[180,80,.15,'triangle'],lock:[300,480,.12,'square'],topple:[120,40,.3,'triangle'],shot:[660,120,.25,'sawtooth'],win:[440,880,.65,'triangle'],lose:[140,55,.65,'sine'],solo:[523,784,.5,'triangle'],bell:[880,870,.9,'sine'],howl:[170,340,1.4,'sine'],wind:[100,80,.7,'sine'],bats:[1200,700,.06,'triangle'],step:[95,60,.055,'triangle'],emote:[330,390,.1,'triangle'],dawn:[330,660,.8,'triangle']
} as const;
export type SoundCue=keyof typeof SOUND_CUES;
export const variedPitch=(base:number,random:number)=>base*(.94+Math.max(0,Math.min(1,random))*.12);
export const heartbeatInterval=(remaining:number)=>.3+Math.max(0,Math.min(1,remaining/30))*.4;
