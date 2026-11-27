import {createAnnaMigrationInspector} from "./anna-migration-inspection.js";
import {mountReadOnly} from "./readonly-ui.js";
export function localDay(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuching",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(p=>[p.type,p.value]));
  return parts.year+"-"+parts.month+"-"+parts.day;
}
export function mountReadOnlyEntry(doc,win,connect){
  const button=doc.getElementById("load"),panel=doc.getElementById("load-panel"),status=doc.getElementById("status"),page=doc.getElementById("page");
  let used=false;
  button.addEventListener("click",async()=>{
    if(used)return;used=true;button.disabled=true;page.setAttribute("aria-busy","true");status.textContent="Loading read-only workspace…";
    try{
      const result=await createAnnaMigrationInspector(await connect()).inspect({timezone:"Asia/Kuching",migrationId:"app908-readonly-workspace"});
      mountReadOnly(doc,win,result.workspace,{today:localDay(),legacyGeneration:result.legacyGeneration});panel.hidden=true;
    }catch{
      page.replaceChildren();doc.getElementById("nav").replaceChildren();
      status.textContent="Read-only load stopped. No automatic retry or data write. Contact the developer.";
      status.classList.add("error");page.setAttribute("aria-busy","false");
    }
  });
}
