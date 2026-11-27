import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {buildOwnerLocalPlan,inspectOwnerLedger,saveOwnerLocalPlan,BACKUP_CIPHER_SHA} from "./owner-migration-local.mjs";
let input,plain;
try{
  const [root,...rest]=process.argv.slice(2);
  if(!root||rest.length)throw Error("INVALID_ARGS");
  const ledger=inspectOwnerLedger(root);
  if(ledger.planExists||ledger.attemptExists)throw Error("LOCAL_LEDGER_NOT_NEW");
  const cipher=readFileSync(join(root,"live-data-R1-20261127-121444-17f66eb5","APS-V1-RESPONSE.dpapi"));
  if(createHash("sha256").update(cipher).digest("hex")!==BACKUP_CIPHER_SHA)throw Error("BACKUP_CIPHER_MISMATCH");
  // stdin only: never use argv, clipboard, environment variables or plaintext file for private data.
  input=readFileSync(0);
  if(input.length>1024*1024)throw Error("INPUT_TOO_LARGE");
  const encoded=input.toString("ascii").trim();
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4!==0)throw Error("INVALID_INPUT");
  plain=Buffer.from(encoded,"base64");
  if(plain.toString("base64")!==encoded)throw Error("INVALID_BASE64");
  const value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(plain));
  const plan=await buildOwnerLocalPlan(value);
  const result=saveOwnerLocalPlan(root,plan);
  // No ETag, fingerprints, record text, or private raw response in stdout.
  console.log(JSON.stringify({phase:"09-U3-02B",state:plan.state,appId:plan.appId,generation:plan.generation,
    candidateBytes:plan.bytes,counts:plan.counts,planExists:result.planExists,attemptExists:result.attemptExists,
    remoteCalls:0,writeAuthorized:false,productionRelease:"BLOCKED"},null,2));
}catch(e){
  // Do not expose JSON parse excerpts or OS paths from untrusted input.
  console.error("OWNER LOCAL PREPARATION STOP — inspect locally; do not retry automatically.");
  process.exitCode=1;
}finally{input?.fill(0);plain?.fill(0);}
