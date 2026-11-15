import {generateDenseDailyDetailed} from './dailyDense';
self.onmessage=(event:MessageEvent<{date:string}>)=>{
 const {date}=event.data;
 try{self.postMessage({date,result:generateDenseDailyDetailed(date)});}catch{self.postMessage({date,error:true});}
};
