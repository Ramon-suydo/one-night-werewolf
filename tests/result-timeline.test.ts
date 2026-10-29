import {describe,it,expect} from 'vitest';
import {cardFlipAt,votesAt,banishAt,bannerAt} from '../lib/result-timeline';
describe('ordered result choreography',()=>{for(let n=3;n<=10;n++)it(`${n} seats reveal before votes, banishment and banner`,()=>{expect(cardFlipAt(n+2)).toBeLessThan(votesAt(n));expect(votesAt(n)+n*.15).toBeLessThan(banishAt(n));expect(banishAt(n)).toBeLessThan(bannerAt(n));expect(bannerAt(n)).toBeLessThan(20)})});
