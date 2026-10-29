export const PHASES=['lobby','dealing','night','dawn','day','vote','resolution','result'] as const;
export type Phase=typeof PHASES[number];
export const DIRECTOR:Record<Phase,{next:Phase;seconds:number|null}>={lobby:{next:'dealing',seconds:10},dealing:{next:'night',seconds:25},night:{next:'dawn',seconds:null},dawn:{next:'day',seconds:10},day:{next:'vote',seconds:300},vote:{next:'resolution',seconds:30},resolution:{next:'result',seconds:0},result:{next:'dealing',seconds:20}};
export const DISCONNECT_MS=15000;
