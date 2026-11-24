// L04 offline candidate: no storage/SDK, network, credentials or deployment.
// All sizes are canonical JSON UTF-8 VALUE bytes, not proven APS wire sizes.
import {COLLECTIONS,canonicalJSON,utf8Bytes} from "../../bundle/v2/workspace.js";
import {validateDomain} from "../../bundle/v2/domain.js";
const SCHEMA=1;
const copy=v=>JSON.parse(canonicalJSON(v));
function fail(code){throw Object.assign(new Error(code),{code});}
function require(ok,code="INVALID_SHARD_PLAN"){if(!ok)fail(code);}
function budget(n){require(Number.isSafeInteger(n)&&n>0,"INVALID_BUDGET");}
async function digest(v){
  const hash=await globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonicalJSON(v)));
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,"0")).join("");
}
function shape(v,keys){
  require(v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));
}
const hex=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const keyFor=hash=>"lc-v2-shard/"+hash;
function shardValue(collection,index,rows){return {schema:SCHEMA,collection,index,rows};}
function safeCopy(v){try{return copy(v);}catch{fail("INVALID_SHARD_PLAN");}}
function domain(w){require(validateDomain(w)===true,"INVALID_WORKSPACE");}
export async function planShards(workspace,{maxValueBytes}={}){
  budget(maxValueBytes);
  const w=copy(workspace);domain(w);
  const {collections,...header}=w;
  const shards=[],refs=[],counts=Object.fromEntries(COLLECTIONS.map(k=>[k,collections[k].length]));
  for(const collection of COLLECTIONS){
    let index=0,rows=[],size=utf8Bytes(shardValue(collection,index,[]));
    async function flush(){
      if(!rows.length)return;
      const value=shardValue(collection,index,rows),bytes=utf8Bytes(value);
      require(bytes===size&&bytes<=maxValueBytes,"SHARD_SIZE_MISMATCH");
      const sha256=await digest(value),key=keyFor(sha256);
      shards.push({key,value});refs.push({collection,index,key,sha256,bytes,count:rows.length});
      index++;rows=[];size=utf8Bytes(shardValue(collection,index,[]));
    }
    for(const row of collections[collection]){
      const n=utf8Bytes(row);
      if(rows.length&&size+1+n>maxValueBytes)await flush();
      require(size+(rows.length?1:0)+n<=maxValueBytes,"RECORD_TOO_LARGE");
      size+=(rows.length?1:0)+n;rows.push(row);
    }
    await flush();
  }
  const manifest={schema:SCHEMA,header,counts,refs,workspaceSha256:await digest(w)};
  require(utf8Bytes(manifest)<=maxValueBytes,"INDEX_TOO_LARGE");
  return {manifest,manifestSha256:await digest(manifest),shards};
}
// Caller must supply the separately trusted index digest and explicit budget.
// Hashes detect mismatch; they do not authenticate a malicious index source.
// No partial result; all collections and order must roundtrip exactly.
export async function assembleShards(plan,{expectedManifestSha256,maxValueBytes}={}){
  budget(maxValueBytes);
  require(hex(expectedManifestSha256),"UNTRUSTED_INDEX");
  const p=safeCopy(plan);
  shape(p,["manifest","manifestSha256","shards"]);
  const m=p.manifest;
  shape(m,["schema","header","counts","refs","workspaceSha256"]);
  require(m.schema===SCHEMA&&hex(m.workspaceSha256)&&Array.isArray(m.refs)&&Array.isArray(p.shards));
  require(utf8Bytes(m)<=maxValueBytes,"INDEX_TOO_LARGE");
  require(p.manifestSha256===expectedManifestSha256&&await digest(m)===expectedManifestSha256,"INDEX_DIGEST_MISMATCH");
  shape(m.header,["schemaVersion","revision","lastOperationId","migration","settings"]);
  shape(m.counts,COLLECTIONS);
  const collections=Object.fromEntries(COLLECTIONS.map(k=>[k,[]]));
  const map=new Map();
  for(const s of p.shards){
    shape(s,["key","value"]);
    require(typeof s.key==="string"&&!map.has(s.key),"DUPLICATE_SHARD");
    map.set(s.key,s.value);
  }
  const used=new Set(),nextIndex=Object.fromEntries(COLLECTIONS.map(k=>[k,0]));
  let prev=-1;
  for(const r of m.refs){
    shape(r,["collection","index","key","sha256","bytes","count"]);
    const pos=COLLECTIONS.indexOf(r.collection);
    require(pos>=0&&pos>=prev&&r.index===nextIndex[r.collection]++);
    prev=pos;
    require(hex(r.sha256)&&r.key===keyFor(r.sha256)&&!used.has(r.key),"INVALID_SHARD_REFERENCE");
    require(map.has(r.key),"MISSING_SHARD");used.add(r.key);
    const s=map.get(r.key);
    shape(s,["schema","collection","index","rows"]);
    require(s.schema===SCHEMA&&s.collection===r.collection&&s.index===r.index&&Array.isArray(s.rows));
    require(Number.isSafeInteger(r.count)&&r.count>0&&s.rows.length===r.count,"SHARD_COUNT_MISMATCH");
    const size=utf8Bytes(s);
    require(size===r.bytes&&size<=maxValueBytes,"SHARD_SIZE_MISMATCH");
    require(await digest(s)===r.sha256,"SHARD_DIGEST_MISMATCH");
    for(const row of s.rows)collections[r.collection].push(row);
  }
  require(map.size===used.size,"UNREFERENCED_SHARD");
  for(const k of COLLECTIONS)require(m.counts[k]===collections[k].length,"COLLECTION_COUNT_MISMATCH");
  const w={...m.header,collections};domain(w);
  require(await digest(w)===m.workspaceSha256,"WORKSPACE_DIGEST_MISMATCH");
  return w;
}
