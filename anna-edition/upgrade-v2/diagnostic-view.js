import {createAnnaMigrationInspector} from "./anna-migration-inspection.js";
const failCodes=new Set(["IDENTITY_UNVERIFIED","V2_EXISTS_RECONCILE","LEGACY_MISSING","MIGRATION_INVALID","LEGACY_CHANGED","V2_CHANGED","SDK_READ_UNCONFIRMED","READ_UNCONFIRMED","RPC_UNCONFIRMED","ABSENCE_UNCONFIRMED","ABSENCE_UNVERIFIED","INSPECTION_ALREADY_USED"]);
export function mountMigrationDiagnostic(doc,connect){
  const start=doc.getElementById("start"),status=doc.getElementById("status"),result=doc.getElementById("result"),summary=doc.getElementById("summary");
  let used=false;
  const add=(label,value)=>{const a=doc.createElement("dt"),b=doc.createElement("dd");a.textContent=label;b.textContent=String(value);summary.append(a,b);};
  start.addEventListener("click",async()=>{
    if(used)return;used=true;start.disabled=true;
    status.textContent="Inspecting storage (read-only)…";
    try{
      const runtime=await connect();
      const observed=await createAnnaMigrationInspector(runtime).inspect({timezone:"Asia/Kuching",migrationId:"app908-draft-diagnostic"});
      const c=observed.workspace.collections;
      summary.replaceChildren();
      add("App ID",908);add("Legacy generation",observed.legacyGeneration);
      add("Candidate bytes",observed.candidateBytes);
      for(const key of ["tasks","transactions","learning","journal","goals","analyses","plans"])add(key,c[key].length);
      add("Within prior synthetic test size",observed.withinObservedSyntheticSize?"Yes":"No");
      add("Version attestation","Unverified");add("Write authorization","No");
      result.hidden=false;status.textContent="Inspection complete. Candidate in memory only; no storage writes.";
    }catch(e){summary.replaceChildren();result.hidden=true;status.textContent="Inspection stopped: "+(failCodes.has(e?.code)?e.code:"CONNECTION_OR_INSPECTION_UNCONFIRMED")+". No automatic retry.";}
  });
}
