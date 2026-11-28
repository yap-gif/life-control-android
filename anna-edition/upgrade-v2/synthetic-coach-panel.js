import {createSyntheticCoach} from "./synthetic-coach.js";
import {claimSyntheticCoach} from "./synthetic-coach-ledger.js";
/** Detached panel survives route changes. No private workspace passed in. */
export function createCoachPanel(doc,win,runtime,conditions){
  const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
  const root=el("section");root.className="panel stack";
  const heading=el("h2","AI Personal Coach · synthetic QA");
  const note=el("p","One real model call using fictional learning records only. No personal records, no AI result persistence, no tools. The default model may consume credits; exact cost is unknown before the call. Check the account balance and do not run if the available budget is insufficient. No retry.");
  const preview=el("button","Preview exact synthetic request");preview.type="button";
  const body=el("pre");body.style.whiteSpace="pre-wrap";body.style.overflowWrap="anywhere";
  const label=el("label");label.className="tick";const tick=el("input");tick.type="checkbox";tick.disabled=true;label.append(tick,doc.createTextNode("I approve this exact synthetic request, one quota-consuming call, and accept the unknown actual cost. I checked the remaining test budget."));
  const run=el("button","Run synthetic AI once");run.type="button";run.className="primary";run.disabled=true;
  const result=el("pre","Not started. No model calls.");result.setAttribute("role","status");result.style.whiteSpace="pre-wrap";result.style.overflowWrap="anywhere";
  root.append(heading,note,preview,body,label,run,result);
  let coach=null,used=false,ready=false;
  const sync=()=>{run.disabled=used||!ready||!tick.checked||!conditions();};
  tick.addEventListener("change",sync);
  preview.addEventListener("click",async()=>{preview.disabled=true;try{
    coach=createSyntheticCoach(runtime,{claim:()=>claimSyntheticCoach(win.indexedDB),authorize:()=>tick.checked&&conditions()});
    const p=await coach.preview();body.textContent=p.wire;result.textContent="Previewed "+p.bytes+" bytes; max output tokens "+p.maxTokens+". No model calls.";ready=true;tick.disabled=false;sync();
  }catch{result.textContent="STOPPED: request preview unconfirmed. No model call. Do not retry.";used=true;sync();}});
  run.addEventListener("click",async()=>{if(run.disabled||used||!conditions())return;used=true;sync();result.textContent="Running once. Do not refresh or retry.";
    try{const r=await coach.run();result.textContent=JSON.stringify(r,null,2);}
    catch{result.textContent="STOPPED: model outcome not confirmed. Do not retry.";}
    finally{tick.checked=false;tick.disabled=true;sync();}
  });
  return root;
}
