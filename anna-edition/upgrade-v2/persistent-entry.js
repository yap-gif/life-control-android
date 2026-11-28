import {createOwnerPersistentStore} from "./owner-persistent-store.js";
import {mountPersistent} from "./persistent-ui.js";
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
      const store=createOwnerPersistentStore(await connect(),{localPlan:plan,checkOwnerConditions:conditions,
        confirmSave:c=>win.confirm("Save this record to App 908? Revision "+c.expectedRevision+" → "+c.nextRevision+". Candidate "+c.bytes+" / 6144 bytes. One attempt only, no retry.")===true});
      await store.load();mountPersistent(doc,win,store,{today:localDay()});panel.hidden=true;
    }catch{status.textContent="Persistent load stopped. No initialization or retry. No writes authorized by load.";status.classList.add("error");}
    finally{file.value="";}
  });sync();
}
