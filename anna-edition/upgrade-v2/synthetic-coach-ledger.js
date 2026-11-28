/** Once per browser storage origin/profile. No reset or retry API.
 * Marker has no private data, token, prompt or response. */
export async function claimSyntheticCoach(indexedDB){
  if(!indexedDB||typeof indexedDB.open!=="function")throw Error("AI_LEDGER_UNAVAILABLE");
  const db=await new Promise((resolve,reject)=>{
    let abandoned=false;const r=indexedDB.open("life-control-app908-ai-qa",1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("runs"))r.result.createObjectStore("runs");};
    r.onsuccess=()=>{if(abandoned)r.result.close();else resolve(r.result);};
    r.onerror=r.onblocked=()=>{abandoned=true;reject(Error("AI_LEDGER_UNAVAILABLE"));};
  });
  try{return await new Promise((resolve,reject)=>{
    let tx;try{tx=db.transaction("runs","readwrite",{durability:"strict"});
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>reject(Error("AI_LEDGER_STOPPED"));
      if(tx.durability!=="strict"){tx.abort();return;}
      tx.objectStore("runs").add({schema:1,state:"RESERVED_BEFORE_MODEL_CALL"},"app908-synthetic-coach-v1");
    }catch{try{tx?.abort();}catch{}reject(Error("AI_LEDGER_STOPPED"));}
  });}finally{db.close();}
}
