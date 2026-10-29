import type {QualityTier} from './quality';
export type Preferences={music:number;narrator:number;effects:number;ambience:number;muted:boolean;captionsOnly:boolean;voice:string;quality:QualityTier|'Automatic';calm:boolean;large:boolean;contrast:boolean;battery:boolean;simpleMenu:boolean};
export const PREFERENCES:Preferences={music:.35,narrator:.8,effects:.5,ambience:.35,muted:false,captionsOnly:false,voice:'',quality:'Automatic',calm:false,large:false,contrast:false,battery:false,simpleMenu:false};
