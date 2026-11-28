/** Private pilot quota ledger. No raw prompts/results, no reset, no retry.
 * Strict IndexedDB transactions, origin/profile local. Reservations are
 * conservatively charged at their approved maximum even when actual is less. */
export const MAX_PERSONAL_ATTEMPTS=3,MAX_TOTAL_MICRO=5000000;
const fail=()=>{throw Error("AI_LEDGER_STOPPED");};
const micro=x=>{if(typeof x!=="number"||!Number.isFinite(x)||x<0||x>5)fail();return Math.ceil(x*1000000);};
function valid(entries){
 if(!Array.isArray(entries)||entries.length>MAX_PERSONAL_ATTEMPTS)fail();const seen=new Set();let sum=0;
 for(const e of entries){
  if(!e||Object.keys(e).length!==4||typeof e.requestId!=="string"||!e.requestId||e.requestId.length>128||seen.has(e.requestId)||!Number.isSafeInteger(e.maxMicro)||e.maxMicro<1||!["PENDING","CONFIRMED"].includes(e.state)||(e.state==="PENDING"?e.actualMicro!==null:!Number.isSafeInteger(e.actualMicro)||e.actualMicro<0||e.actualMicro>e.maxMicro))fail();
  seen.add(e.requestId);sum+=e.maxMicro;
 }if(sum>MAX_TOTAL_MICRO||entries.slice(0,-1).some(e=>e.state==="PENDING"))fail();return entries;
}
export function reserveBudget(entries,{requestId,maxCost}){
 valid(entries);const n=micro(maxCost);
 if(!n||entries.length>=MAX_PERSONAL_ATTEMPTS||entries.some(e=>e.state==="PENDING"||e.requestId===requestId)||entries.reduce((a,e)=>a+e.maxMicro,0)+n>MAX_TOTAL_MICRO)fail();
 return valid([...entries,{requestId,maxMicro:n,state:"PENDING",actualMicro:null}]);
}
export function settleBudget(entries,{requestId,quotaConsumed}){
 valid(entries);const last=entries.at(-1),actualMicro=micro(quotaConsumed);
 if(!last||last.state!=="PENDING"||last.requestId!==requestId||actualMicro>last.maxMicro)fail();
 return valid([...entries.slice(0,-1),{...last,state:"CONFIRMED",actualMicro}]);
}
export async function openPersonalBudgetLedger(indexedDB){
 if(!indexedDB||typeof indexedDB.open!=="function")fail();
 const db=await new Promise((resolve,reject)=>{
 let abandoned=false;const r=indexedDB.open("life-control-app908-personal-budget-v2",1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("runs"))r.result.createObjectStore("runs");};
 r.onsuccess=()=>{if(abandoned)r.result.close();else resolve(r.result);};
 r.onerror=r.onblocked=()=>{abandoned=true;reject(Error("AI_LEDGER_UNAVAILABLE"));};
 });
 db.onversionchange=()=>db.close();
 function txApply(change){
  return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction("runs","readwrite",{durability:"strict"});
    tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>reject(Error("AI_LEDGER_STOPPED"));
    if(tx.durability!=="strict"){tx.abort();return;}
    const store=tx.objectStore("runs"),req=store.get("app908-personal-budget-v2");
    req.onsuccess=()=>{try{const current=req.result===undefined?[]:req.result;store.put(change(current),"app908-personal-budget-v2");}catch{tx.abort();}};
   }catch{try{tx?.abort();}catch{}reject(Error("AI_LEDGER_STOPPED"));}
  });
 }
 return Object.freeze({claim:x=>txApply(e=>reserveBudget(e,x)),settle:x=>txApply(e=>settleBudget(e,x)),close:()=>db.close()});
}
