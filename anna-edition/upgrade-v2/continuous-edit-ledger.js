import {canonicalJSON} from "../bundle/v2/workspace.js";
const fail=code=>{throw Object.assign(Error(code),{code});};
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
export function validateEditMarker(m){
  if(!m||Object.keys(m).length!==8||m.schema!==1||m.appId!==908||
    !["PENDING","CONFIRMED"].includes(m.state)||typeof m.operationId!=="string"||!/^edit-[a-f0-9-]{36}$/.test(m.operationId)||
    !hex(m.previousSha256)||!hex(m.candidateSha256)||!Number.isSafeInteger(m.previousGeneration)||m.previousGeneration<1||
    m.nextGeneration!==m.previousGeneration+1)fail("EDIT_LEDGER_INVALID");
  return m;
}
/** Strict durable transaction, fixed origin/profile-local key, compare-and-set.
 * No automatic removal, reset or retry. No raw records or ETags stored. */
export async function openEditLedger(indexedDB){
  if(!indexedDB||typeof indexedDB.open!=="function")fail("EDIT_LEDGER_UNAVAILABLE");
  const db=await new Promise((resolve,reject)=>{
    let abandoned=false;const req=indexedDB.open("life-control-app908-edit-ledger",1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("edits"))req.result.createObjectStore("edits");};
    req.onsuccess=()=>{if(abandoned)req.result.close();else resolve(req.result);};
    req.onerror=req.onblocked=()=>{abandoned=true;reject(Error("EDIT_LEDGER_UNAVAILABLE"));};
  });
  db.onversionchange=()=>db.close();
  const key="app908-v2-edit";
  function transact(mode,expected,next){
    return new Promise((resolve,reject)=>{
      let tx,result=null,error="EDIT_LEDGER_STOPPED";
      try{
        tx=mode==="readonly"?db.transaction("edits",mode):db.transaction("edits",mode,{durability:"strict"});
        tx.oncomplete=()=>resolve(result);
        tx.onabort=tx.onerror=()=>reject(Object.assign(Error(error),{code:error}));
        if(mode==="readwrite"&&tx.durability!=="strict"){error="EDIT_LEDGER_DURABILITY_UNVERIFIED";tx.abort();return;}
        const store=tx.objectStore("edits"),req=store.get(key);
        req.onsuccess=()=>{
          try{
            const actual=req.result===undefined?null:validateEditMarker(req.result);
            if(mode==="readonly"){result=actual;return;}
            if(!equal(actual,expected)){error="EDIT_LEDGER_CONFLICT";tx.abort();return;}
            validateEditMarker(next);
            if(next.state==="PENDING"){
              if(actual?.state==="PENDING"||actual&&(actual.candidateSha256!==next.previousSha256||actual.nextGeneration!==next.previousGeneration))fail("EDIT_LEDGER_CONFLICT");
            }else if(!actual||actual.state!=="PENDING"||!equal({...actual,state:"CONFIRMED"},next))fail("EDIT_LEDGER_CONFLICT");
            store.put(next,key);result=next;
          }catch(e){error=e?.code??"EDIT_LEDGER_STOPPED";try{tx.abort();}catch{reject(Error(error));}}
        };
      }catch{try{tx?.abort();}catch{}reject(Error(error));}
    });
  }
  return Object.freeze({read:()=>transact("readonly"),claim:(expected,next)=>transact("readwrite",expected,next),
    confirm:pending=>transact("readwrite",pending,{...pending,state:"CONFIRMED"}),close:()=>db.close()});
}
