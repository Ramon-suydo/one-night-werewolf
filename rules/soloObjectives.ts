import type {Role} from '../engine/types';
export const SOLO_OBJECTIVES:Partial<Record<Role,string>>={tanner:'Be banished.',drunk:'Receive zero votes.',troublemaker:'Swap two players; one falls while you survive.',robber:'Rob a player; they fall while you survive.'};
export const SOLO_ROLES=['tanner','drunk','troublemaker','robber'] as const;
