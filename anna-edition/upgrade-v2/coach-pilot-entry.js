import {createCoachPanel} from "./synthetic-coach-panel.js";
import {openEditLedger} from "./continuous-edit-ledger.js";
import {createSaveConfirmation} from "./continuous-save-confirmation.js";
import {createContinuousStore} from "./continuous-store.js";
import {mountPersistent} from "./coach-pilot-ui.js";
import {validateLocalPlan} from "./owner-handoff.js";
import {localDay} from "./readonly-entry.js";
export function mountPersistentEntry(doc,win,connect){
  const load=doc.getElementById("load"),panel=doc.getElementById("load-panel"),status=doc.getElementById("status"),file=doc.getElementById("plan");
  const conditions=()=>["versionChecked","otherClientsClosed","pilotAccepted"].every(k=>doc.getElementById(k).checked);
  let used=false;
  const sync=()=>{load.disabled=used||!conditions()||!file.files?.length;};
  for(const k of ["versionChecked","otherClientsClosed","pilotAccepted","plan"])doc.getElementById(k).addEventListener("change",sync);
  load.addEventListener("click",async()=>{
    if(used||!conditions()||!file.files?.length)return;used=true;sync();
    try{
      const f=file.files[0];if(f.name!=="APP908-OWNER-MIGRATION-PLAN.json"||f.size<1||f.size>16384)throw Error("INVALID_FILE");
      const plan=validateLocalPlan(JSON.parse(await f.text()));
      const ledger=await openEditLedger(win.indexedDB);
      const runtime=await connect();
      const store=createContinuousStore(runtime,{localPlan:plan,ledger,checkOwnerConditions:conditions,
        confirmSave:createSaveConfirmation(doc)});
      await store.load();const coachPanel=createCoachPanel(doc,win,runtime,()=>conditions()&&!store.locked);mountPersistent(doc,win,store,{today:localDay(),coachPanel});panel.hidden=true;
      win.addEventListener("pagehide",()=>ledger.close(),{once:true});
    }catch{status.textContent="Persistent load stopped. No initialization or retry. No writes authorized by load.";status.classList.add("error");}
    finally{file.value="";}
  });sync();
}
