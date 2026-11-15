import type {Attempt} from '../domain/board';
import type {GameLanguage} from '../app/language';
export interface ContentPilotReview {
  initial:number;
  label(index:number,language:GameLanguage):string;
  restore(index:number):Attempt|undefined;
  save(index:number,attempt:Attempt):void;
  compare(index:number):void;
  exit():void;
  description(language:GameLanguage):string;
}
export interface GameReviewOptions {scaleContext?:boolean;pilot?:ContentPilotReview;}
