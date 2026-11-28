import {prepareAiCommand} from "../bundle/v2/ai-actions.js";
import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain,prepareCommand} from "../bundle/v2/domain.js";
import {normalizeAnnaInspectionRead} from "./anna-migration-inspection.js";
import {fingerprintLegacyBackup} from "./anna-owner-migration-pilot.js";
import {validateLocalPlan,planDigest} from "./owner-handoff.js";
import {prepareAnnaCasCandidate,inspectAnnaCasReceipt,confirmAnnaCasCandidate} from "./anna-cas-protocol.js";
import {validateEditMarker} from "./continuous-edit-ledger.js";
export const EDIT_LIMIT=32768,MAX_SAVES=3,MAX_READS=14;
const aiAllowed=new Set(["analysis.save","plan.save","action.accept","action.edit","action.dismiss"]);
const fail=code=>{throw Object.assign(Error(code),{code});};
const copy=x=>JSON.parse(canonicalJSON(x)),equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const allowed=new Set(["record.add","record.edit","task.add","task.edit","task.transition","learning.target","milestone.add","milestone.edit","milestone.transition","habit.add","habit.rename","habit.archive","habit.checkin","habit.checkin.edit"]);
const collections=new Set(["transactions","budgets","learning","journal","goals"]);
/** Separate private pilot, not a relaxation of the strict production adapter.
 * Three saves per loaded instance, fourteen reads total, no initialization.
 * Owner attestations are not version or server authorization. */
export function createIntegratedStore(runtime,{localPlan,ledger,checkOwnerConditions,confirmSave,now=()=>new Date().toISOString(),minimumRevision=4}={}){
  const plan=validateLocalPlan(localPlan),wid=runtime?.windowUuid;
  if(!Number.isSafeInteger(minimumRevision)||minimumRevision<0)fail("CONFIG_INVALID");
  if(!ledger||["read","claim","confirm"].some(k=>typeof ledger[k]!=="function")||typeof checkOwnerConditions!=="function"||typeof confirmSave!=="function"||typeof now!=="function")fail("CONFIG_INVALID");
  let current=null,legacy=null,reads=0,attempts=0,busy=false,state="NEW",lastSave="NONE",ledgerRecord=null;
  function identity(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||runtime.app?.id!==908||
      runtime.app?.slug!=="life-control-anna"||runtime.capabilities?.host_api_version!=="0.1.0"||
      runtime.appId!==undefined||runtime.versionId!==undefined||typeof runtime.storage?.get!=="function"||typeof runtime.storage?.set!=="function")fail("IDENTITY_UNVERIFIED");
  }
  identity();
  function guard(){identity();if(checkOwnerConditions()!==true)fail("OWNER_CONDITIONS_UNCONFIRMED");}
  async function invoke(method,args){
    identity();let timer,r;
    try{r=await Promise.race([runtime.storage[method](args,{timeoutMs:12000}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("timeout")),12000);})]);}
    catch(e){fail(e?.code==="precondition_failed"?"CAS_CONFLICT":method==="set"?"WRITE_UNCERTAIN":"READ_UNCONFIRMED");}
    finally{clearTimeout(timer);}identity();return r;
  }
  async function read(key){
    if(reads>=MAX_READS)fail("READ_LIMIT");reads++;
    const r=normalizeAnnaInspectionRead(await invoke("get",{key}));
    if(!r.exists)fail(key===WORKSPACE_KEY?"V2_MISSING_NO_CREATE":"LEGACY_MISSING");return r;
  }
  async function pair(w,l){
    if(validateDomain(w.value)!==true||w.value.migration.id!==plan.migrationId||w.value.migration.legacyEtag!==l.etag||w.generation!==w.value.revision+1)fail("WORKSPACE_LINEAGE_UNCONFIRMED");
    const proof=await fingerprintLegacyBackup(l);
    if(proof.generation!==plan.generation||proof.sha256!==plan.backupSha256)fail("LEGACY_BACKUP_MISMATCH");
    if(w.value.revision===0&&await planDigest(w.value)!==plan.candidateSha256)fail("INITIAL_CANDIDATE_MISMATCH");
    if(utf8Bytes(w.value)>EDIT_LIMIT)fail("PILOT_CAPACITY");
  }
  const status=()=>({state,lastSave,reads,writeAttempts:attempts,maxReads:MAX_READS,maxWriteAttempts:MAX_SAVES,generation:current?.generation??null,revision:current?.value.revision??null,bytes:current?utf8Bytes(current.value):null,maxBytes:EDIT_LIMIT,versionAttestation:"UNVERIFIED",productionRelease:"BLOCKED"});
  return Object.freeze({
    status,get locked(){return busy||state!=="READY";},get workspace(){if(!current)fail("NOT_LOADED");return copy(current.value);},get bytes(){return current?utf8Bytes(current.value):0;},
    id(prefix){return prefix+"-"+globalThis.crypto.randomUUID();},
    async load(){
      if(state!=="NEW"||busy)fail("LOAD_NOT_ALLOWED");busy=true;state="LOADING";
      try{
        guard();ledgerRecord=await ledger.read();if(ledgerRecord!==null)validateEditMarker(ledgerRecord);
        const w=await read(WORKSPACE_KEY),l=await read(LEGACY_KEY);await pair(w,l);guard();current=w;legacy=l;
        const sha=await planDigest(w.value);
        if(w.value.revision<minimumRevision){state="BASELINE_REGRESSED";return status();}
        if(ledgerRecord?.state==="PENDING"){
          state=sha===ledgerRecord.candidateSha256&&w.generation===ledgerRecord.nextGeneration&&w.value.lastOperationId===ledgerRecord.operationId?"RECOVERY_MATCHED":"RECOVERY_REQUIRED";
          lastSave="UNCERTAIN";return status();
        }
        if(ledgerRecord&&(sha!==ledgerRecord.candidateSha256||w.generation!==ledgerRecord.nextGeneration||w.value.lastOperationId!==ledgerRecord.operationId)){state="RECOVERY_REQUIRED";return status();}
        state="READY";return status();
      }
      catch{state="STOPPED";fail("LOAD_STOPPED");}finally{busy=false;}
    },
    async reconcileMatched(confirmed){
      if(busy||state!=="RECOVERY_MATCHED"||confirmed!==true)fail("RECOVERY_NOT_ALLOWED");
      busy=true;state="RECOVERY_CHECKING";
      try{
        guard();const w=await read(WORKSPACE_KEY),l=await read(LEGACY_KEY);await pair(w,l);
        if(w.value.revision<minimumRevision||!equal(w,current)||!equal(l,legacy)||ledgerRecord?.state!=="PENDING"||await planDigest(w.value)!==ledgerRecord.candidateSha256||w.generation!==ledgerRecord.nextGeneration||w.value.lastOperationId!==ledgerRecord.operationId)fail("RECOVERY_MISMATCH");
        guard();const done={...ledgerRecord,state:"CONFIRMED"};
        if(!equal(await ledger.confirm(ledgerRecord),done))fail("EDIT_LEDGER_CONFLICT");
        ledgerRecord=done;state="RECOVERY_RESOLVED";lastSave="CONFIRMED";return status();
      }catch{state="RECOVERY_REQUIRED";fail("RECOVERY_STOPPED");}finally{busy=false;}
    },
    async apply(command){
      if(busy||state!=="READY"||attempts>=MAX_SAVES)fail("EDITOR_LOCKED");busy=true;let reserved=false,attempted=false;
      try{
        const isAi=aiAllowed.has(command?.type);
        if((!isAi&&!allowed.has(command?.type))||(["record.add","record.edit"].includes(command.type)&&!collections.has(command.collection)))fail("COMMAND_FORBIDDEN");
        // Freeze command and exact candidate before consent; no mutable callback input.
        const cmd=copy(command),operationId="edit-"+globalThis.crypto.randomUUID(),expectedRevision=current.value.revision;
        let change;try{change=isAi?prepareAiCommand(current.value,command,{operationId,now:now(),expectedRevision}):prepareCommand(current.value,cmd,{operationId,now:now(),expectedRevision});}catch{fail("INVALID_RECORD");}
        const bytes=utf8Bytes(change.next);if(bytes>EDIT_LIMIT)fail("PILOT_CAPACITY");
        const p=prepareAnnaCasCandidate({current,next:change.next,operationId,labMaxBytes:EDIT_LIMIT});
        guard();
        if(await confirmSave(Object.freeze({type:cmd.type,collection:cmd.collection??null,bytes,expectedRevision,nextRevision:change.next.revision,command:copy(cmd),maxBytes:EDIT_LIMIT}))!==true)fail("SAVE_CANCELLED");
        guard();
        state="CHECKING";
        const w=await read(WORKSPACE_KEY),l=await read(LEGACY_KEY);
        if(!equal(w,current)||!equal(l,legacy))fail("BASELINE_CHANGED");
        await pair(w,l);guard();
        const pending=validateEditMarker({schema:1,appId:908,state:"PENDING",operationId,
          previousSha256:await planDigest(current.value),candidateSha256:await planDigest(change.next),
          previousGeneration:current.generation,nextGeneration:current.generation+1});
        state="RESERVING";reserved=true;
        if(!equal(await ledger.claim(ledgerRecord,pending),pending))fail("EDIT_LEDGER_CONFLICT");
        ledgerRecord=pending;guard();state="ATTEMPTED";attempts++;attempted=true;
        const ack=inspectAnnaCasReceipt(await invoke("set",p.request),p.evidence);
        if(ack.size_bytes!==bytes||ack.generation!==current.generation+1)fail("RECEIPT_MISMATCH");
        const back=await read(WORKSPACE_KEY),confirmed=confirmAnnaCasCandidate(p.evidence,ack,back);
        const after=await read(LEGACY_KEY);
        if(!equal(after,legacy))fail("LEGACY_CHANGED_AFTER_WRITE");
        guard();const done={...pending,state:"CONFIRMED"};
        if(!equal(await ledger.confirm(pending),done))fail("EDIT_LEDGER_CONFLICT");
        ledgerRecord=done;current={exists:true,value:confirmed.workspace,etag:confirmed.etag,generation:confirmed.generation};
        lastSave="CONFIRMED";state=attempts>=MAX_SAVES?"SESSION_LIMIT":"READY";return status();
      }catch(e){
        if(attempted||reserved){state="UNCERTAIN";lastSave="UNCERTAIN";}else if(state==="CHECKING")state="STOPPED";
        const safe=["COMMAND_FORBIDDEN","INVALID_RECORD","PILOT_CAPACITY","SAVE_CANCELLED","OWNER_CONDITIONS_UNCONFIRMED","BASELINE_CHANGED","CAS_CONFLICT","RECEIPT_MISMATCH","WRITE_UNCERTAIN","LEGACY_CHANGED_AFTER_WRITE","EDIT_LEDGER_CONFLICT"];
        fail(safe.includes(e?.code)?e.code:"EDIT_STOPPED");
      }finally{busy=false;}
    }
  });
}
