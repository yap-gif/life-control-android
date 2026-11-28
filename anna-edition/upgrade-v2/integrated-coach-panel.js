import {createPersonalRun,checkBudget} from "./integrated-coach-transport.js";
import {openPersonalBudgetLedger} from "./integrated-coach-ledger.js";
import {buildCoachRequest,previewRequest} from "../bundle/v2/ai-coach.js";
import {CATEGORIES,FOCUS,MAX_REQUEST_BYTES,MAX_TOKENS} from "../bundle/v2/ai-schema.js";
import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {localDay} from "../bundle/v2/domain.js";
import {dayNumber} from "../bundle/v2/calendar.js";
/** Pure local preparation. No runtime, transport, persistent ledger or save callback. */
export function buildPersonalPreview(workspace,{selected,focus,question,spec,asOf,requestId,previousPlanId=null}){
  // Personal consent scope must be exact. Reports deliberately clip future
  // endpoints; a personal request must reject them before report construction.
  if(!spec||!["7days","30days","90days","custom"].includes(spec.kind))throw Error("Invalid personal range kind");
  if(spec.kind==="custom"){
    const today=localDay(asOf,workspace.settings.timezone);
    const from=dayNumber(spec.from),through=dayNumber(spec.through);
    if(from>through||through>dayNumber(today)||through-from+1>3660)throw Error("Invalid personal date range");
  }
  const request=buildCoachRequest(workspace,{selected,focus,question,spec,asOf,requestId,previousPlanId});
  const body=JSON.parse(previewRequest(request));
  const wire={maxTokens:body.maxTokens,messages:body.messages.map(m=>({role:m.role,content:{type:"text",text:m.content}}))};
  const payload=canonicalJSON(wire),bytes=utf8Bytes(wire);
  if(bytes>MAX_REQUEST_BYTES)throw Error("Payload exceeds byte ceiling");
  return {request,payload,bytes,maxTokens:MAX_TOKENS};
}
export function createIntegratedCoachPanel(doc,readWorkspace,{runtime,win,canWrite,commit,now=()=>new Date().toISOString(),id=()=>globalThis.crypto.randomUUID()}={}){
  const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
  const root=el("section");root.className="panel stack";
  const title=el("h2","AI Personal Coach");
  const notice=el("p","Choose the exact categories and date range. Preview is local only. Sending to Anna LLM is a separate explicit action; saving the result retains a copy of selected evidence in APS. At most three distinct personal requests in this private pilot, within a conservatively reserved total of 5 Credits and the account stop line. Unconfirmed outcomes lock further calls. Journal includes reflection text and tags when selected. Learning includes topics; money includes amounts and categories; goals include titles and progress; tasks and habits include record identifiers. Review the full request before any future transmission.");
  const categories=el("fieldset");categories.append(el("legend","Data categories (none selected by default)"));
  const names={money:"Money",learning:"Learning",tasks:"Tasks",journal:"Journal — includes private reflection text",goals:"Goals",habits:"Habits"};
  const boxes=CATEGORIES.map(k=>{const l=el("label");l.className="tick";const b=el("input");b.type="checkbox";b.name="coach-category";b.value=k;l.append(b,doc.createTextNode(names[k]));categories.append(l);return b;});
  const select=(label,options)=>{const l=el("label",label),s=el("select");for(const [v,t] of options){const o=el("option",t);o.value=v;s.append(o);}l.append(s);root.append(l);return s;};
  root.append(title,notice,categories);
  const focus=select("Analysis focus",FOCUS.map(f=>[f,f]));focus.value="custom";
  const range=select("Date range",[["7days","Last 7 days"],["30days","Last 30 days"],["90days","Last 90 days"],["custom","Custom range"]]);
  const dates=el("div");dates.hidden=true;
  const date=(caption)=>{const l=el("label",caption),i=el("input");i.type="date";l.append(i);dates.append(l);return i;};
  const from=date("From"),through=date("Through");root.append(dates);
  const w=readWorkspace();const prior=select("Optional previous plan (requires Tasks and all original categories)",[["","Do not reuse"],...w.collections.plans.filter(p=>!p.legacyReadOnly&&w.collections.planActions.some(a=>a.planId===p.id&&a.taskId!==null)).map(p=>[p.id,p.savedAt+" · "+p.sourceCategories.join(", ")])]);
  const ql=el("label","Analysis question"),question=el("textarea");question.maxLength=1000;question.rows=3;ql.append(question);root.append(ql);
  const actions=el("div");actions.className="actions";
  const preview=el("button","Preview personal request locally"),clear=el("button","Clear preview and selection");
  preview.type=clear.type="button";preview.className="primary";actions.append(preview,clear);root.append(actions);
  const status=el("p","No preview. No data sent.");status.setAttribute("role","status");
  const scope=el("div"),body=el("pre");body.style.whiteSpace="pre-wrap";body.style.overflowWrap="anywhere";root.append(status,scope,body);
  const costBox=el("section");costBox.className="stack";costBox.hidden=true;
  const costNotice=el("p","Model cost is not hard-capped by the API. Enter the current Credits and independently confirmed conservative maximum cost for this exact request/model. If unknown, do not send.");
  const num=(label)=>{const l=el("label",label),n=el("input");n.type="number";n.min="0";n.step="any";l.append(n);costBox.append(l);return n;};
  costBox.append(costNotice);const balance=num("Current Credits"),maxCost=num("Verified maximum Credits for this call");
  const consentLabel=el("label");consentLabel.className="tick";const consent=el("input");consent.type="checkbox";consentLabel.append(consent,doc.createTextNode("I verified this cost bound and authorize sending exactly the previewed personal data to Anna LLM, one call, no retry."));
  const send=el("button","Send personal request once");send.type="button";send.disabled=true;costBox.append(consentLabel,send);root.append(costBox);
  const result=el("section");result.className="stack";root.append(result);
  let current=null,receipt=null,used=false,busy=false;
  const budget=()=>({balance:balance.value===""?NaN:Number(balance.value),maxCost:maxCost.value===""?NaN:Number(maxCost.value),verified:consent.checked});
  const sync=()=>{send.disabled=used||busy||!current||!root.isConnected||!canWrite()||!checkBudget(budget());};
  costBox.addEventListener("input",e=>{e.stopPropagation();if(e.target!==consent)consent.checked=false;sync();});costBox.addEventListener("change",e=>{e.stopPropagation();if(e.target!==consent)consent.checked=false;sync();});
  function invalidate(){current=null;receipt=null;consent.checked=false;costBox.hidden=true;send.disabled=true;body.textContent="";scope.replaceChildren();result.replaceChildren();status.textContent="No current preview. No data sent by preview.";}
  send.addEventListener("click",async()=>{
    if(send.disabled||busy||used)return;const p=current,approved=budget();used=true;busy=true;sync();
    let modelLedger=null;
    const run=createPersonalRun(runtime,{readWorkspace,claim:async x=>{modelLedger=await openPersonalBudgetLedger(win.indexedDB);return modelLedger.claim(x);},settle:x=>modelLedger.settle(x),authorize:()=>root.isConnected&&current===p&&consent.checked&&canWrite()&&checkBudget(budget())&&canonicalJSON(budget())===canonicalJSON(approved)});
    try{
      await run.prepare(p);receipt=await run.run(approved);if(!root.isConnected||current!==p)return;
      result.replaceChildren(el("h3","Validated model output (not independently fact-checked)"),el("p",receipt.result.summary));
      for(const f of receipt.result.findings)result.append(el("p",f.interpretation+" · "+f.confidence+" · "+f.limitation));
      for(const a of receipt.result.actions)result.append(el("p",a.title+" · "+a.target.quantity+" "+a.target.unit+" · "+a.dueDate));
      result.append(el("p",receipt.result.followUp.measurement),el("p",receipt.result.followUp.limitations.join(" · ")),el("p","Usage: "+JSON.stringify(run.status().usage)));
      const save=el("button","Save analysis and evidence to Workspace");save.type="button";save.disabled=!canWrite();result.append(save);
      save.addEventListener("click",async()=>{if(!receipt||!canWrite()||current!==p)return;save.disabled=true;try{await commit({type:"analysis.save",receipt,confirm:true});}finally{if(root.isConnected&&current===p)save.disabled=!canWrite();}});
      status.textContent="Model result confirmed. Saving is a separate operation.";
    }catch{status.textContent="Model not confirmed. No automatic retry. "+JSON.stringify(run.status());}
    finally{modelLedger?.close();busy=false;consent.checked=false;sync();}
  });
  root.addEventListener("input",invalidate);root.addEventListener("change",()=>{dates.hidden=range.value!=="custom";invalidate();});
  clear.addEventListener("click",()=>{boxes.forEach(b=>b.checked=false);question.value="";focus.value="custom";prior.value="";range.value="7days";from.value=through.value="";dates.hidden=true;invalidate();});
  preview.addEventListener("click",()=>{
    invalidate();
    try{
      const selected=boxes.filter(b=>b.checked).map(b=>b.value);
      if(!selected.length||!question.value.trim())throw Error("Missing scope");
      const asOf=now(),workspace=readWorkspace(),today=localDay(asOf,workspace.settings.timezone);
      if(range.value==="custom"&&(!from.value||!through.value||from.value>through.value||through.value>today))throw Error("Invalid range");
      const p=buildPersonalPreview(workspace,{selected,focus:focus.value,question:question.value.trim(),spec:range.value==="custom"?{kind:"custom",from:from.value,through:through.value}:{kind:range.value},asOf,requestId:"app908-personal-"+id(),previousPlanId:prior.value||null});
      scope.append(el("p","Revision "+p.request.snapshotRevision+" · "+p.request.period.from+" through "+p.request.period.through),el("p","Selected: "+p.request.authorizedCategories.join(", ")+" · "+p.request.metrics.length+" metrics"));
      for(const k of p.request.authorizedCategories){const c=p.request.coverage.raw[k];scope.append(el("p",k+": "+c.included+" of "+c.available+" sampled rows; "+c.omitted+" omitted."));}
      body.textContent=JSON.stringify(JSON.parse(p.payload),null,2);
      current=p;costBox.hidden=false;sync();
      status.textContent="LOCAL PREVIEW · "+p.bytes+" / "+MAX_REQUEST_BYTES+" bytes · max output "+p.maxTokens+" tokens. No data sent.";
    }catch{status.textContent="Preview stopped. Select categories, a valid range and a question; reduce the scope if the request is too large or has no eligible metrics. No data sent.";}
  });
  return root;
}
