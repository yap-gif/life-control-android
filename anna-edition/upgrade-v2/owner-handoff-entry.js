import {createOwnerHandoff,openBrowserAttemptLedger} from "./owner-handoff.js";
const conditions=["otherClientsClosed","backupVerifiedLocally","versionUiChecked","noOtherWriterKnown","residualRaceAccepted","noAutomaticRetry"];
async function readFile(input,name){
  const f=input.files?.[0];if(!f||f.name!==name||f.size<1||f.size>16384)throw Error("INVALID_LOCAL_FILE");
  return JSON.parse(await f.text());
}
export function mountOwnerHandoff(doc,win,connect){
  const get=id=>doc.getElementById(id),status=get("status"),prepare=get("prepare"),commit=get("commit"),plan=get("plan"),marker=get("marker"),approval=get("approval");
  const checkOwnerConditions=()=>Object.fromEntries(conditions.map(k=>[k,get(k).checked]));
  const handoff=createOwnerHandoff({connect,openLedger:()=>openBrowserAttemptLedger(win.indexedDB),checkOwnerConditions});
  const safe=x=>{status.textContent=JSON.stringify(x,null,2);};
  const conditionsReady=()=>conditions.every(k=>get(k).checked);
  let prepared=false,started=false,finished=false;
  const sync=()=>{prepare.disabled=started||!conditionsReady()||!plan.files?.length;commit.disabled=!prepared||finished||!conditionsReady()||!approval.checked||!marker.files?.length;};
  for(const k of [...conditions,"plan","marker","approval"])get(k).addEventListener("change",sync);
  prepare.addEventListener("click",async()=>{
    if(started||!conditionsReady()||!plan.files?.length)return;started=true;sync();
    try{const p=await readFile(plan,"APP908-OWNER-MIGRATION-PLAN.json");safe(await handoff.prepare(p));prepared=true;}
    catch{finished=true;safe({state:"STOPPED",message:"Preparation stopped. No write authorized. Do not reload to retry.",...handoff.status()});}
    finally{plan.value="";sync();}
  });
  commit.addEventListener("click",async()=>{
    if(!prepared||finished||!conditionsReady()||!approval.checked||!marker.files?.length)return;
    finished=true;sync();
    try{safe(await handoff.commit(await readFile(marker,"APP908-OWNER-MIGRATION-ATTEMPT.json"),approval.checked&&conditionsReady()));}
    catch{safe({...handoff.status(),message:"Stopped or uncertain. No retry. Preserve local marker and reconcile read-only."});}
    finally{marker.value="";approval.checked=false;sync();}
  });
  sync();
}
