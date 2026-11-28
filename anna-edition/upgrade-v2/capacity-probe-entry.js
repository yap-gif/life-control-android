import {createCapacityProbe} from "./capacity-probe.js";
export function mountCapacityProbe(doc,connect){
  const tick=doc.getElementById("consent"),run=doc.getElementById("run"),result=doc.getElementById("result");
  let used=false;
  const sync=()=>{run.disabled=used||!tick.checked;};
  tick.addEventListener("change",sync);
  run.addEventListener("click",async()=>{
    if(used||!tick.checked)return;used=true;sync();
    result.textContent="Running once. Do not refresh or retry.";
    try{const probe=createCapacityProbe(await connect(),{authorize:()=>tick.checked});result.textContent=JSON.stringify(await probe.run(),null,2);}
    catch{result.textContent="STOPPED: connection unconfirmed. Do not retry.";}
  });sync();
}
