import {emptyWorkspace,canonicalJSON,utf8Bytes,LEGACY_KEY,WORKSPACE_KEY} from "../bundle/v2/workspace.js";
import {createWorkspaceRepository} from "../bundle/v2/repository.js";
import {validateDomain,prepareCommand} from "../bundle/v2/domain.js";
import {prepareAiCommand} from "../bundle/v2/ai-actions.js";
import {shiftDay} from "../bundle/v2/calendar.js";
export const DEMO_DAY="2026-11-24",DEMO_LIMIT=256*1024;
const base=Date.parse("2026-11-24T04:00:00.000Z");
const copy=x=>JSON.parse(canonicalJSON(x));
const opts={timezone:"Asia/Kuching",migrationId:"isolated-demo"};
export function fictionalLegacy(){
  return {version:1,tasks:[{id:"t1",title:"Review study notes",date:DEMO_DAY,done:false},{id:"t2",title:"Organize weekly plan",date:"2026-11-26",done:false},{id:"t3",title:"Set up desk",date:"2026-11-20",done:true}],
    money:[{id:"m1",date:"2026-11-03",amount:600,type:"income",category:"Work"},{id:"m2",date:"2026-11-04",amount:100,type:"expense",category:"Food"},{id:"m3",date:"2026-11-10",amount:400,type:"income",category:"Work"},{id:"m4",date:"2026-11-11",amount:50,type:"expense",category:"Transport"},{id:"m5",date:"2026-11-20",amount:125,type:"expense",category:"Food"}],
    learning:[{id:"l1",date:"2026-11-23",topic:"Programming",minutes:90},{id:"l2",date:DEMO_DAY,topic:"Databases",minutes:45}],journal:[{id:"j1",date:DEMO_DAY,text:"Fictional reflection: a focused study session."}],goal:{goal:3000,saved:750,monthly:250},lastReview:null,savedPlan:null};
}
/** Closed in-memory adapter. Never accepts a host, endpoint, browser storage or credentials. */
export async function createDemoStore({sample=true}={}){
  const data=new Map();let etag=0,seq=0,clock=base,confirmed,repo,fault=false;
  const write=(key,value)=>data.set(key,{etag:"mock-"+(++etag),value:copy(value)});
  if(sample)write(LEGACY_KEY,fictionalLegacy());
  const storage={async get({key}){return data.has(key)?{exists:true,...copy(data.get(key))}:{exists:false};},async set({key,value,if_match}){if(data.get(key)?.etag!==if_match)throw new Error("Synthetic CAS conflict");if(fault){fault=false;return;}write(key,value);}};
  const makeRepo=()=>createWorkspaceRepository({storage,validateDomain,capability:{verified:true,maxBytes:DEMO_LIMIT},atomicCreate:async({key,value})=>{if(data.has(key))throw new Error("Synthetic create conflict");write(key,value);}});
  repo=makeRepo();const candidate=await repo.inspect(opts);confirmed=await repo.initialize(candidate.workspace);
  const nextTime=()=>new Date(clock+=1000).toISOString();
  const id=prefix=>prefix+"-demo-"+(++seq);
  const apply=async(command,ai=false)=>{
    const previous=confirmed.workspace,prepare=ai?prepareAiCommand:prepareCommand;
    const request=prepare(previous,command,{expectedRevision:previous.revision,operationId:id("op"),now:nextTime()});
    confirmed=await repo.commit({...request,etag:confirmed.etag});
    return copy(confirmed.workspace);
  };
  // Seed additional P03 entities through the actual validated repository commands.
  if(sample){
    await apply({type:"record.add",collection:"budgets",id:id("budget"),data:{month:"2026-11",category:"Food",limitMinor:20000}});
    await apply({type:"learning.target",minutes:300});
    await apply({type:"habit.add",id:id("habit"),title:"Read for 20 minutes",scheduledWeekdays:[1,2,3,4,5],startDate:DEMO_DAY});
  }
  return {get workspace(){return copy(confirmed.workspace);},get locked(){return repo.locked;},get bytes(){return utf8Bytes(confirmed.workspace);},get source(){return sample?"Synthetic legacy migration":"Empty synthetic workspace";},id,now:nextTime,apply,
    simulateUnconfirmedWrite(){fault=true;},
    async reconcile(){const candidateRepo=makeRepo(),observed=await candidateRepo.inspect(opts);if(observed.status!=="existing")throw new Error("Synthetic workspace missing");validateDomain(observed.workspace);confirmed={workspace:observed.workspace,etag:observed.etag};repo=candidateRepo;return copy(confirmed.workspace);}
  };
}
/** Deterministic local mock. Explicitly not a real model response. */
export async function demoTransport(payload){
  const r=JSON.parse(payload.messages[1].content);
  const metric=r.metrics.find(x=>x.value!==null&&x.unit!=="percent");
  if(!metric)throw new Error("No eligible metric for mock analysis");
  return JSON.stringify({schemaVersion:1,summary:"Simulation: review the selected recorded activity and choose one practical next step.",findings:[{metricIds:[metric.id],interpretation:"This is a fixed demonstration of evidence-linked interpretation, not personalized AI advice.",confidence:"limited",limitation:"Missing logs and the mock model limit interpretation."}],actions:[{id:"demo-action",title:"Review the selected records",reasonMetricIds:[metric.id],target:{metricId:metric.id,quantity:Math.max(0,Math.min(10000000000,Math.trunc(metric.value))),unit:metric.unit},dueDate:shiftDay(r.today,2)}],followUp:{measurement:"Record actual task completion before comparing later evidence.",limitations:["Simulated response only."]}});
}
