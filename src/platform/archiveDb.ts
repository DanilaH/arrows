/** Only immutable browser archive blocks use IndexedDB. Existing root/settings
 * keys remain in Web Storage; commit resolves on transaction completion. */
let opening:Promise<IDBDatabase>|undefined;
function database():Promise<IDBDatabase>{
  if(opening)return opening;
  opening=new Promise<IDBDatabase>((resolve,reject)=>{
    let settled=false;const request=indexedDB.open('arrows.archive.v1',1),timer=setTimeout(()=>{settled=true;reject(Error('Archive database unavailable'));},8000);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('blocks'))request.result.createObjectStore('blocks');};
    request.onerror=()=>{clearTimeout(timer);settled=true;reject(Error('Archive database open failed'));};
    request.onblocked=()=>{clearTimeout(timer);settled=true;reject(Error('Archive database blocked'));};
    request.onsuccess=()=>{clearTimeout(timer);if(settled){request.result.close();return;}settled=true;const db=request.result;db.onversionchange=()=>{db.close();opening=undefined;};resolve(db);};
  }).catch(error=>{opening=undefined;throw error;});return opening;
}
async function operation<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await database();return new Promise<T>((resolve,reject)=>{const tx=db.transaction('blocks',mode),request=work(tx.objectStore('blocks'));tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(Error('Archive database transaction failed'));});
}
export const archiveDb={
  async get(key:string):Promise<string|null>{const value=await operation('readonly',s=>s.get(key));if(value===undefined)return null;if(typeof value!=='string')throw Error('Invalid archive value');return value;},
  async set(key:string,value:string):Promise<void>{await operation('readwrite',s=>s.put(value,key));},
  async remove(key:string):Promise<void>{await operation('readwrite',s=>s.delete(key));},
  async keys(prefix:string):Promise<string[]>{const keys=await operation('readonly',s=>s.getAllKeys());return keys.filter((k):k is string=>typeof k==='string'&&k.startsWith(prefix));},
};
