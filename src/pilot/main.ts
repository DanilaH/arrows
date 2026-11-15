import {startGame} from '../app/bootstrap';
import {createPlatformRuntime} from '../app/platform';
import {baselineFields,candidateFields,pilotRows} from './catalog';
import {createPilotStore,type PilotVariant} from './store';
import './pilot.css';
const query=new URLSearchParams(location.search),variant:PilotVariant=query.get('bank')==='baseline'?'baseline':'candidate';
// Access can itself throw in restricted browsers. QA resume is never a prerequisite to playing.
const unavailable={getItem:()=>{throw Error('Unavailable');},setItem:()=>{throw Error('Unavailable');}};
let storage:Pick<Storage,'getItem'|'setItem'>;try{storage=localStorage;}catch{storage=unavailable;}
const store=createPilotStore(storage,{candidate:candidateFields,baseline:baselineFields});
const parsed=Number(query.get('field')??store.index),initial=Number.isInteger(parsed)&&parsed>=0&&parsed<27?parsed:0;
document.querySelector('#game-shell')!.classList.add('content-pilot');
startGame(variant==='candidate'?candidateFields:baselineFields,onBack=>createPlatformRuntime(onBack,true),{pilot:{
 initial,
 label(index,language){const row=pilotRows[index]!,ru=language==='ru';return`${variant==='candidate'?(ru?'Пилот':'Pilot'):(ru?'Текущий':'Current')} · ${row.position?`${ru?'Уровень':'Level'} ${row.position}`:`${ru?'Дэйлик':'Daily'} ${index-19}/7`}`;},
 restore:index=>store.restore(variant,index),save:(index,board)=>store.save(variant,index,board),
 compare:index=>{location.href=`./content-pilot.html?bank=${variant==='candidate'?'baseline':'candidate'}&field=${index}`;},
 exit:()=>{location.href='./index.html';},
 description:language=>language==='ru'?`${variant==='candidate'?'Новый':'Текущий'} банк: 20 уровней + 7 дэйликов. Три жизни, без помощи и рекламы. Прогресс основной игры не меняется.${store.failed?' Локальное возобновление недоступно.':''}`:`${variant==='candidate'?'Candidate':'Current'} bank: 20 levels + 7 dailies. Three lives, no assistance or ads. Main progress is unchanged.${store.failed?' Local resume unavailable.':''}`,
}});
