export const cardFlipAt=(index:number)=>.7+index*.45;
export const votesAt=(players:number)=>cardFlipAt(players+3)+.6;
export const banishAt=(players:number)=>votesAt(players)+players*.15+1;
export const bannerAt=(players:number)=>banishAt(players)+1.7;
