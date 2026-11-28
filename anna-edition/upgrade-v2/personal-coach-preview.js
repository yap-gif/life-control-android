import {buildCoachRequest,previewRequest} from "../bundle/v2/ai-coach.js";
import {CATEGORIES,FOCUS,MAX_REQUEST_BYTES,MAX_TOKENS} from "../bundle/v2/ai-schema.js";
import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {localDay} from "../bundle/v2/domain.js";
import {dayNumber} from "../bundle/v2/calendar.js";
/** Pure local preparation. No runtime, transport, persistent ledger or save callback. */
export function buildPersonalPreview(workspace,{selected,focus,question,spec,asOf,requestId}){
  // Personal consent scope must be exact. Reports deliberately clip future
  // endpoints; a personal request must reject them before report construction.
  if(!spec||!["7days","30days","90days","custom"].includes(spec.kind))throw Error("Invalid personal range kind");
  if(spec.kind==="custom"){
    const today=localDay(asOf,workspace.settings.timezone);
    const from=dayNumber(spec.from),through=dayNumber(spec.through);
    if(from>through||through>dayNumber(today)||through-from+1>3660)throw Error("Invalid personal date range");
  }
  const request=buildCoachRequest(workspace,{selected,focus,question,spec,asOf,requestId,previousPlanId:null});
  const body=JSON.parse(previewRequest(request));
  const wire={maxTokens:body.maxTokens,messages:body.messages.map(m=>({role:m.role,content:{type:"text",text:m.content}}))};
  const payload=canonicalJSON(wire),bytes=utf8Bytes(wire);
  if(bytes>MAX_REQUEST_BYTES)throw Error("Payload exceeds byte ceiling");
  return {request,payload,bytes,maxTokens:MAX_TOKENS};
}
export function createPersonalPreviewPanel(doc,readWorkspace,{now=()=>new Date().toISOString(),id=()=>globalThis.crypto.randomUUID()}={}){
  const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
  const root=el("section");root.className="panel stack";
  const title=el("h2","AI Personal Coach · local request preview");
  const notice=el("p","Choose the exact categories and date range. Preview is local only: no model calls, no new storage access, no AI result saving. Journal includes reflection text and tags when selected. Learning includes topics; money includes amounts and categories; goals include titles and progress; tasks and habits include record identifiers. Review the full request before any future transmission.");
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
  const ql=el("label","Analysis question"),question=el("textarea");question.maxLength=1000;question.rows=3;ql.append(question);root.append(ql);
  const actions=el("div");actions.className="actions";
  const preview=el("button","Preview personal request locally"),clear=el("button","Clear preview and selection");
  preview.type=clear.type="button";preview.className="primary";actions.append(preview,clear);root.append(actions);
  const status=el("p","No preview. No data sent.");status.setAttribute("role","status");
  const scope=el("div"),body=el("pre");body.style.whiteSpace="pre-wrap";body.style.overflowWrap="anywhere";root.append(status,scope,body);
  function invalidate(){body.textContent="";scope.replaceChildren();status.textContent="No current preview. No data sent.";}
  root.addEventListener("input",invalidate);root.addEventListener("change",()=>{dates.hidden=range.value!=="custom";invalidate();});
  clear.addEventListener("click",()=>{boxes.forEach(b=>b.checked=false);question.value="";focus.value="custom";range.value="7days";from.value=through.value="";dates.hidden=true;invalidate();});
  preview.addEventListener("click",()=>{
    invalidate();
    try{
      const selected=boxes.filter(b=>b.checked).map(b=>b.value);
      if(!selected.length||!question.value.trim())throw Error("Missing scope");
      const asOf=now(),workspace=readWorkspace(),today=localDay(asOf,workspace.settings.timezone);
      if(range.value==="custom"&&(!from.value||!through.value||from.value>through.value||through.value>today))throw Error("Invalid range");
      const p=buildPersonalPreview(workspace,{selected,focus:focus.value,question:question.value.trim(),spec:range.value==="custom"?{kind:"custom",from:from.value,through:through.value}:{kind:range.value},asOf,requestId:"app908-personal-"+id()});
      scope.append(el("p","Revision "+p.request.snapshotRevision+" · "+p.request.period.from+" through "+p.request.period.through),el("p","Selected: "+p.request.authorizedCategories.join(", ")+" · "+p.request.metrics.length+" metrics"));
      for(const k of p.request.authorizedCategories){const c=p.request.coverage.raw[k];scope.append(el("p",k+": "+c.included+" of "+c.available+" sampled rows; "+c.omitted+" omitted."));}
      body.textContent=JSON.stringify(JSON.parse(p.payload),null,2);
      status.textContent="LOCAL PREVIEW · "+p.bytes+" / "+MAX_REQUEST_BYTES+" bytes · max output "+p.maxTokens+" tokens. No data sent.";
    }catch{status.textContent="Preview stopped. Select categories, a valid range and a question; reduce the scope if the request is too large or has no eligible metrics. No data sent.";}
  });
  return root;
}
